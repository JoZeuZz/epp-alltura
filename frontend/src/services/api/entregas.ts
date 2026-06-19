import { get, post, apiService } from './http';

function buildMultipartIfFile<T extends object>(data: T, file?: File): T | FormData {
  if (!file) return data;
  const fd = new FormData();
  fd.append('payload', JSON.stringify(data));
  fd.append('foto', file);
  return fd;
}

// ============ ENTREGAS ============

type EntregaTipo = 'entrega';
export type EntregaEstado =
  | 'borrador'
  | 'pendiente_firma'
  | 'confirmada'
  | 'anulada'
  | 'revertida_admin';
export type CondicionSalida = 'ok' | 'usado' | 'danado';

export interface EntregaDetalleRow {
  id: string;
  entrega_id: string;
  articulo_id: string;
  articulo_nombre?: string;
  articulo_codigo?: string | null;
  articulo_nro_serie?: string | null;
  condicion_salida: CondicionSalida;
  notas?: string | null;
  /* trazabilidad cruzada: estado devolución por ítem */
  custodia_id?: string | null;
  custodia_estado?: string | null;
  custodia_cerrada_en?: string | null;
  devuelto?: boolean | null;
  devolucion_disposicion?: string | null;
}

type EntregaEstadoDevolucion = 'devuelta_completa' | 'parcialmente_devuelta' | 'pendiente_devolucion';

export interface EntregaRow {
  id: string;
  creado_por_usuario_id: string;
  trabajador_id: string;
  nombres?: string;
  apellidos?: string;
  rut?: string;
  creador_nombres?: string | null;
  creador_apellidos?: string | null;
  ubicacion_origen_id: string;
  ubicacion_destino_id: string;
  tipo: EntregaTipo;
  estado: EntregaEstado;
  nota_destino?: string | null;
  motivo_anulacion?: string | null;
  creado_en?: string | null;
  confirmada_en?: string | null;
  cantidad_items?: number;
  evidencia_foto_url?: string | null;
  firma_imagen_url?: string | null;
  firmado_en?: string | null;
  detalles?: EntregaDetalleRow[];
  /* trazabilidad cruzada: estado de devolución computado */
  estado_devolucion?: EntregaEstadoDevolucion | null;
  retornables_total?: number | null;
  retornables_cerradas?: number | null;
}

export interface EntregaDetallePayload {
  articulo_id: string;
  condicion_salida?: CondicionSalida;
  notas?: string | null;
}

export interface EntregaCreatePayload {
  trabajador_id: string;
  ubicacion_origen_id: string;
  ubicacion_destino_id: string;
  tipo?: EntregaTipo;
  nota_destino?: string | null;
  fecha_devolucion_esperada?: string | null;
  detalles: EntregaDetallePayload[];
}

export const getEntregas = (params?: { estado?: EntregaEstado; trabajador_id?: string }) =>
  get<EntregaRow[]>('/entregas', params);

export const getEntregaById = (id: string) =>
  get<EntregaRow>(`/entregas/${id}`);

export interface EntregaSignatureTokenResponse {
  id: string;
  entrega_id: string;
  trabajador_id: string;
  expira_en: string;
  token: string;
  url: string;
  reused?: boolean;
  time_to_expiry_minutes?: number;
}

export interface EntregaActaResponse {
  documento_id: string;
  tipo: 'acta_entrega';
  entidad_tipo: 'entrega';
  entidad_id: string;
  archivo_url: string;
  archivo_url_resuelto?: string;
  archivo_hash?: string | null;
  creado_en?: string;
  creado_por_usuario_id?: string;
  generated?: boolean;
}

export const generateEntregaSignatureToken = (
  entregaId: string,
  expiraMinutos = 30
) =>
  post<EntregaSignatureTokenResponse>(`/firmas/entregas/${entregaId}/token`, {
    expira_minutos: expiraMinutos,
  });

export const createEntrega = (payload: EntregaCreatePayload, foto?: File) =>
  post<EntregaRow>('/entregas', buildMultipartIfFile(payload, foto));

export const getEntregaActa = (id: string) =>
  get<EntregaActaResponse>(`/entregas/${id}/acta`);

export const confirmEntrega = (id: string) =>
  post<EntregaRow>(`/entregas/${id}/confirm`);


export const firmarEntregaDispositivo = (
  entregaId: string,
  firmaBase64: string,
  textoAceptacion: string
) => {
  const formData = new FormData();
  // Convertir base64 a Blob
  const byteString = atob(firmaBase64.split(',')[1] ?? firmaBase64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  const blob = new Blob([ab], { type: 'image/png' });
  formData.append('firma_archivo', blob, 'firma.png');
  formData.append('texto_aceptacion', textoAceptacion);
  return apiService
    .post(`/firmas/entregas/${entregaId}/firmar-dispositivo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
};

/**
 * Returns all entregas in borrador or pendiente_firma states.
 * Used by EntregasPendientesFirmaPage and dashboard KPI navigation.
 */
export const getEntregasPendientesFirma = () =>
  get<EntregaRow[]>('/entregas', { estado_in: 'borrador,pendiente_firma' });

/**
 * Returns borrador/pendiente_firma entregas that contain a specific articulo.
 * Used by ActivoProfileModal to show "Operación pendiente" block.
 */
export const getEntregasPendientesByArticulo = (articuloId: string) =>
  get<EntregaRow[]>('/entregas', {
    estado_in: 'borrador,pendiente_firma',
    articulo_id: articuloId,
  });

/**
 * Cancels a delivery. Only allowed for borrador or pendiente_firma states.
 */
export const anularEntrega = (id: string, motivo?: string) =>
  post<EntregaRow>(`/entregas/${id}/anular`, { motivo: motivo ?? null });
