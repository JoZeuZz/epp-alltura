import { get, post, apiService } from './http';

function buildMultipartIfFile<T extends object>(data: T, file?: File): T | FormData {
  if (!file) return data;
  const fd = new FormData();
  fd.append('payload', JSON.stringify(data));
  fd.append('foto', file);
  return fd;
}

export type DevolucionEstado = 'borrador' | 'pendiente_firma' | 'confirmada' | 'anulada';
export type DevolucionDisposicion = 'devuelto' | 'perdido' | 'baja' | 'mantencion';
export type DevolucionCondicionEntrada = 'ok' | 'usado' | 'danado' | 'perdido';

export interface DevolucionDetalleRow {
  id: string;
  devolucion_id: string;
  custodia_id: string;
  articulo_id: string;
  articulo_nombre?: string;
  articulo_codigo?: string | null;
  articulo_nro_serie?: string | null;
  condicion_entrada: DevolucionCondicionEntrada;
  disposicion: DevolucionDisposicion;
  notas?: string | null;
  /* trazabilidad cruzada: entrega de origen por ítem */
  entrega_origen_id?: string | null;
  entrega_origen_fecha?: string | null;
}

export interface DevolucionRow {
  id: string;
  trabajador_id: string;
  recibido_por_usuario_id: string;
  ubicacion_recepcion_id: string;
  estado: DevolucionEstado;
  creado_en?: string | null;
  confirmada_en?: string | null;
  notas?: string | null;
  nombres?: string;
  apellidos?: string;
  rut?: string | null;
  receptor_nombres?: string | null;
  receptor_apellidos?: string | null;
  evidencia_foto_url?: string | null;
  texto_aceptacion?: string | null;
  cantidad_detalles?: number;
  firma_imagen_url?: string | null;
  firmado_en?: string | null;
  detalles?: DevolucionDetalleRow[];
  /* trazabilidad cruzada: entrega de origen (primera) */
  entrega_origen_id?: string | null;
  entrega_origen_fecha?: string | null;
}

export interface DevolucionDetallePayload {
  custodia_id: string;
  articulo_id: string;
  condicion_entrada?: DevolucionCondicionEntrada;
  disposicion: DevolucionDisposicion;
  notas?: string | null;
}

export interface DevolucionCreatePayload {
  trabajador_id: string;
  ubicacion_recepcion_id: string;
  notas?: string | null;
  detalles: DevolucionDetallePayload[];
}

export interface DevolucionSignatureTokenResponse {
  id: string;
  devolucion_id: string;
  trabajador_id: string;
  expira_en: string;
  token: string;
  url: string;
  reused?: boolean;
  time_to_expiry_minutes?: number;
}

export const getDevoluciones = (params?: { estado?: DevolucionEstado; trabajador_id?: string }) =>
  get<DevolucionRow[]>('/devoluciones', params);

export const getDevolucionById = (id: string) =>
  get<DevolucionRow>(`/devoluciones/${id}`);

export const getDevolucionActaPdfUrl = (id: string) => `/devoluciones/${id}/pdf`;

export const createDevolucion = (payload: DevolucionCreatePayload, foto?: File) =>
  post<DevolucionRow>('/devoluciones', buildMultipartIfFile(payload, foto));

export const confirmDevolucion = (id: string) =>
  post<DevolucionRow>(`/devoluciones/${id}/confirm`);

export const generateDevolucionSignatureToken = (
  devolucionId: string,
  expiraMinutos = 30
) =>
  post<DevolucionSignatureTokenResponse>(`/firmas/devoluciones/${devolucionId}/token`, {
    expira_minutos: expiraMinutos,
  });

export const firmarDevolucionDispositivo = (
  devolucionId: string,
  firmaBase64: string,
  textoAceptacion: string
) => {
  const formData = new FormData();
  const byteString = atob(firmaBase64.split(',')[1] ?? firmaBase64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  const blob = new Blob([ab], { type: 'image/png' });
  formData.append('firma_archivo', blob, 'firma-devolucion.png');
  formData.append('texto_aceptacion', textoAceptacion);
  return apiService
    .post(`/devoluciones/${devolucionId}/firmar-dispositivo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
};
