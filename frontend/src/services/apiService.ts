import { defaultHttpClient, type ApiEnvelope } from '@jozeuzz/alltura-ui';
import type { InAppNotification, NotificationStats } from '../types/clientNotes';

// Contrato Alltura de sesión:
// - baseURL same-origin '/api'
// - interceptor 401 -> refreshAccessToken (singleton) -> retry de request original
// Este comportamiento vive en httpClient y se consume de forma única desde apiService.
export const apiHttpClient = defaultHttpClient;

const httpClient = apiHttpClient;

export const apiService = httpClient.instance;

export const get = <T = unknown>(url: string, params?: unknown) =>
  httpClient.get<T>(url, params);
export const post = <T = unknown>(url: string, data?: unknown) =>
  httpClient.post<T>(url, data);
export const put = <T = unknown>(url: string, data?: unknown) =>
  httpClient.put<T>(url, data);
export const patch = <T = unknown>(url: string, data?: unknown) =>
  httpClient.patch<T>(url, data);
export const del = <T = unknown>(url: string) =>
  httpClient.del<T>(url);

type UploadMethod = 'post' | 'put' | 'patch';

export const uploadWithProgress = <T = unknown>(
  method: UploadMethod,
  url: string,
  data: FormData,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal
) =>
  apiService
    .request<T>({
      method,
      url,
      data,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal,
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return;
        const percentage = Math.round((event.loaded / event.total) * 100);
        onProgress(percentage);
      },
    })
    .then((res) => unwrapData<T>(res.data));

function unwrapData<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}


export type UserRole = 'admin' | 'supervisor';

export interface UsersQueryParams {
  role?: UserRole;
  search?: string;
}

export interface UserCreatePayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: UserRole;
  rut?: string;
  phone_number?: string;
}

export interface UserUpdatePayload {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  estado?: 'activo' | 'inactivo' | 'bloqueado';
  rut?: string;
  phone_number?: string;
}

export const getUsers = (params?: UsersQueryParams) => get('/users', params);
export const createUser = <T = unknown>(payload: UserCreatePayload) => post<T>('/users', payload);
export const updateUser = <T = unknown>({ id, ...payload }: UserUpdatePayload) =>
  put<T>(`/users/${id}`, payload);
export const deactivateUser = <T = unknown>(id: string) => del<T>(`/users/${id}`);

// TODO Task 12: ArticuloGrupoPrincipal kept for components being updated in Task 12+
export type ArticuloGrupoPrincipal = 'epp' | 'equipo' | 'herramienta';
// TODO Task 12: ArticuloSubclasificacion kept for components being updated in Task 12+
export type ArticuloSubclasificacion =
  | 'epp'
  | 'medicion_ensayos'
  | 'manual'
  | 'electrica_cable'
  | 'inalambrica_bateria';

export type ArticuloTipo = 'epp' | 'herramienta' | 'equipo';
export type ArticuloEstado = 'en_stock' | 'asignado' | 'mantencion' | 'dado_de_baja' | 'perdido';
export type ArticuloEspecialidad =
  | 'oocc'
  | 'ooee'
  | 'equipos'
  | 'trabajos_verticales_lineas_de_vida';

export interface ArticuloCertificacion {
  id: string;
  nombre?: string | null;
  url: string;
  creado_en: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  rut?: string | null;
  email?: string | null;
  telefono?: string | null;
  estado: string;
}

export interface Articulo {
  id: string;
  tipo: ArticuloTipo;
  nombre: string;
  marca?: string;
  modelo?: string;
  descripcion?: string;
  nro_serie: string;
  codigo: string;
  valor: number;
  foto_url?: string | null;
  estado: ArticuloEstado;
  bodega_actual_id?: string | null;
  bodega_nombre?: string | null;
  bodega_ciudad?: string | null;
  proyecto_actual_id?: string | null;
  proyecto_nombre?: string | null;
  proyecto_ciudad?: string | null;
  especialidades: ArticuloEspecialidad[];
  fecha_vencimiento?: string | null;
  fecha_compra?: string | null;
  proveedor_id?: string | null;
  proveedor_nombre?: string | null;
  factura_url?: string | null;
  manual_url?: string | null;
  certificaciones?: ArticuloCertificacion[];
  creado_en: string;
  creado_por_email?: string | null;
}

export interface ArticuloQueryParams {
  tipo?: ArticuloTipo;
  estado?: ArticuloEstado;
  bodega_id?: string;
  proyecto_id?: string;
  especialidad?: ArticuloEspecialidad;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ArticuloCreatePayload {
  tipo: ArticuloTipo;
  nombre: string;
  marca?: string;
  modelo?: string;
  descripcion?: string;
  nro_serie: string;
  valor?: number;
  bodega_id: string;
  especialidades?: ArticuloEspecialidad[];
  fecha_vencimiento?: string;
  fecha_compra?: string;
  proveedor_id?: string;
  manual_url?: string;
}

export interface ArticuloUpdatePayload {
  id: string;
  nombre?: string;
  marca?: string;
  modelo?: string;
  descripcion?: string;
  nro_serie?: string;
  valor?: number;
  especialidades?: ArticuloEspecialidad[];
  fecha_vencimiento?: string | null;
  fecha_compra?: string | null;
  proveedor_id?: string | null;
  manual_url?: string | null;
}

export interface CambiarEstadoArticuloPayload {
  nuevo_estado: 'en_stock' | 'mantencion' | 'dado_de_baja' | 'perdido';
  motivo?: string;
  bodega_destino_id?: string;
}

function buildMultipartIfFile<T extends object>(data: T, file?: File): T | FormData {
  if (!file) return data;
  const fd = new FormData();
  fd.append('payload', JSON.stringify(data));
  fd.append('foto', file);
  return fd;
}

export interface ArticleFiles {
  foto?: File;
  factura?: File;
  manual?: File;
}

function buildArticleFormData<T extends object>(data: T, files: ArticleFiles): T | FormData {
  const hasFiles = files.foto || files.factura || files.manual;
  if (!hasFiles) return data;
  const fd = new FormData();
  fd.append('payload', JSON.stringify(data));
  if (files.foto)    fd.append('foto',    files.foto);
  if (files.factura) fd.append('factura', files.factura);
  if (files.manual)  fd.append('manual',  files.manual);
  return fd;
}

export const getArticulos = (params?: ArticuloQueryParams) =>
  get<{ items: Articulo[]; total: number }>('/articulos', params);
export const getArticuloById = (id: string) =>
  get<Articulo>(`/articulos/${id}`);
export const createArticulo = (payload: ArticuloCreatePayload, files: ArticleFiles = {}) =>
  post<Articulo>('/articulos', buildArticleFormData(payload, files));
export const updateArticulo = ({ id, ...payload }: ArticuloUpdatePayload, files: ArticleFiles = {}) =>
  put<Articulo>(`/articulos/${id}`, buildArticleFormData(payload, files));
export const addCertificacion = (articuloId: string, file: File, nombre?: string) => {
  const fd = new FormData();
  fd.append('certificacion', file);
  if (nombre) fd.append('nombre', nombre);
  return post<Articulo>(`/articulos/${articuloId}/certificaciones`, fd);
};
export const deleteCertificacion = (articuloId: string, certId: string) =>
  del<Articulo>(`/articulos/${articuloId}/certificaciones/${certId}`);
export const deleteArticulo = (id: string) =>
  del<{ message: string }>(`/articulos/${id}`);
export const getProveedores = () =>
  get<Proveedor[]>('/proveedores');
export const createProveedor = (payload: { nombre: string; rut?: string; email?: string; telefono?: string }) =>
  post<Proveedor>('/proveedores', payload);
export const cambiarEstadoArticulo = (id: string, payload: CambiarEstadoArticuloPayload) =>
  post<Articulo>(`/articulos/${id}/estado`, payload);

// TODO Task 12: InventoryStockQueryParams kept for components being updated in Task 12+
export interface InventoryStockQueryParams {
  search?: string;
  articulo_id?: string;
  bodega_id?: string;
  limit?: number;
  offset?: number;
}

export interface CursorPaginationParams {
  limit?: number;
  cursor?: string;
}

export interface CursorPaginatedResponse<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string | null;
}


// TODO Task 12: InventoryActivoDetailQueryParams kept for components being updated in Task 12+
export interface InventoryActivoDetailQueryParams extends CursorPaginationParams {
  search?: string;
  articulo_id?: string;
  bodega_id?: string;
  estado?: string;
  solo_entregados?: boolean;
  tipo_activo?: InventoryActivoTypeScope;
}

export type InventoryActivoTypeScope = 'herramientas' | 'epp' | 'equipos';

// TODO Task 12: InventoryActivoDetailRow will be replaced after inventory pages are updated
export interface InventoryActivoDetailRow {
  id: string;
  codigo?: string;
  nro_serie?: string | null;
  articulo_id?: string;
  articulo_nombre?: string;
  foto_url?: string | null;
  bodega_actual_id?: string | null;
  bodega_nombre?: string | null;
  proyecto_actual_id?: string | null;
  proyecto_nombre?: string | null;
  estado?: string;
  valor?: number | null;
  fecha_vencimiento?: string | null;
  custodia_id?: string | null;
  custodia_estado?: string | null;
  custodia_desde_en?: string | null;
  custodio_trabajador_id?: string | null;
  custodio_nombres?: string | null;
  custodio_apellidos?: string | null;
  custodia_entrega_id?: string | null;
  ultima_entrega_id?: string | null;
  entrega_confirmada_en?: string | null;
  ultima_devolucion_id?: string | null;
  devolucion_confirmada_en?: string | null;
  dias_en_custodia?: number | null;
  fecha_devolucion_esperada?: string | null;
  semaforo_devolucion?: 'verde' | 'amarillo' | 'rojo' | null;
  ultimo_movimiento_tipo?: string | null;
  ultimo_movimiento_fecha?: string | null;
  ultimo_movimiento_origen_nombre?: string | null;
  ultimo_movimiento_destino_nombre?: string | null;
}

// TODO Task 12: InventoryAvailableAssetQueryParams will be updated after inventory pages update
export interface InventoryAvailableAssetQueryParams {
  articulo_id: string;
  bodega_id: string;
  search?: string;
  limit?: number;
}

// TODO Task 12: InventoryAvailableAssetRow will be updated after inventory pages update
export interface InventoryAvailableAssetRow {
  id: string;
  codigo: string;
  nro_serie?: string | null;
  estado: ArticuloEstado | string;
  articulo_id: string;
  articulo_nombre?: string;
  bodega_actual_id?: string | null;
  bodega_nombre?: string | null;
  proyecto_actual_id?: string | null;
  proyecto_nombre?: string | null;
}

export interface ReturnEligibleAssetQueryParams {
  trabajador_id: string;
  articulo_id?: string;
  search?: string;
  limit?: number;
}

export interface ReturnEligibleAssetRow {
  custodia_id: string;       // renamed from custodia_activo_id
  articulo_id: string;       // was activo_id
  trabajador_id: string;
  desde_en: string;
  nombre: string;
  tipo: ArticuloTipo;
  nro_serie: string;
  codigo: string;
  foto_url?: string | null;
  valor: number;
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

export interface InventoryMovementQueryParams {
  articulo_id?: string;
  tipo?: string;
  entrega_id?: string;
  devolucion_id?: string;
  desde?: string;
  hasta?: string;
  limit?: number;
}



// TODO Task 12: getInventoryActivosPaged kept for components being updated in Task 12+
export const getInventoryActivosPaged = (params?: InventoryActivoDetailQueryParams) =>
  get<CursorPaginatedResponse<InventoryActivoDetailRow>>('/inventario/activos-paged', params);

// TODO Task 12: getInventoryActivosAll kept for components being updated in Task 12+
export const getInventoryActivosAll = (scope: InventoryActivoTypeScope) =>
  get<InventoryActivoDetailRow[]>('/inventario/activos', { tipo_activo: scope, limit: 500 });

// ---- Perfil completo de activo ----

export interface ActivoTimelineEntry {
  id: string;
  tipo: string;
  fecha_movimiento: string;
  notas?: string | null;
  ubicacion_origen_nombre?: string | null;
  ubicacion_destino_nombre?: string | null;
  entrega_id?: string | null;
  devolucion_id?: string | null;
  responsable_email?: string | null;
  estado_entrega?: string | null;
  estado_devolucion?: string | null;
}

export interface ActivoCustodiaEntry {
  id: string;
  trabajador_id: string;
  entrega_id?: string | null;
  ubicacion_destino_id?: string | null;
  desde_en: string;
  hasta_en?: string | null;
  estado: string;
  custodio_nombres: string;
  custodio_apellidos: string;
  custodia_ubicacion_nombre?: string | null;
  dias_en_custodia?: number | null;
}

// TODO Task 12: DevolverActivoDetallePayload kept for devolucion components updated in Task 12+
export interface DevolverActivoDetallePayload {
  custodia_id: string;
  articulo_id: string;
  condicion_entrada?: 'ok' | 'usado' | 'danado' | 'perdido';
  disposicion: 'devuelto' | 'perdido' | 'baja' | 'mantencion';
  notas?: string | null;
}

// TODO Task 12: DevolverActivoPayload kept for devolucion components updated in Task 12+
export interface DevolverActivoPayload {
  trabajador_id: string;
  ubicacion_recepcion_id: string;
  notas?: string | null;
  detalles: DevolverActivoDetallePayload[];
}

export interface ActivoProfileResponse {
  id: string;
  tipo: ArticuloTipo;
  nombre: string;
  codigo: string;
  nro_serie: string;
  marca?: string | null;
  modelo?: string | null;
  descripcion?: string | null;
  estado: ArticuloEstado;
  foto_url?: string | null;
  bodega_actual_id?: string | null;
  bodega_nombre?: string | null;
  proyecto_actual_id?: string | null;
  proyecto_nombre?: string | null;
  fecha_vencimiento?: string | null;
  fecha_compra?: string | null;
  proveedor_id?: string | null;
  proveedor_nombre?: string | null;
  factura_url?: string | null;
  manual_url?: string | null;
  especialidades: ArticuloEspecialidad[];
  certificaciones: ArticuloCertificacion[];
  valor: number;
  creado_en: string;
  custodia_activa?: ActivoCustodiaEntry | null;
  timeline: ActivoTimelineEntry[];
  custodias: ActivoCustodiaEntry[];
  estadisticas: {
    total_entregas: number;
    total_devoluciones: number;
    dias_total_custodia: number;
  };
}

export const getActivoProfile = (id: string) =>
  get<ActivoProfileResponse>(`/inventario/activos/${id}/perfil`);

// ── Gestión de activos ─────────────────────────────────────
// TODO Task 12: CambiarEstadoActivoPayload kept for modal components updated in Task 12+
// Use CambiarEstadoArticuloPayload + cambiarEstadoArticulo for new code
export interface CambiarEstadoActivoPayload {
  nuevo_estado: string;
  motivo: string;
  bodega_destino_id?: string;
}

// TODO Task 12: ReubicarActivoPayload kept for ReubicarActivoModal updated in Task 12+
export interface ReubicarActivoPayload {
  bodega_destino_id: string;
  motivo?: string;
}

// TODO Task 12: EditarActivoPayload kept for EditarActivoModal updated in Task 12+
export interface EditarActivoPayload {
  valor?: number | null;
  fecha_vencimiento?: string | null;
}

// TODO Task 12: cambiarEstadoActivo kept for CambiarEstadoActivoModal updated in Task 12+
export const cambiarEstadoActivo = (id: string, payload: CambiarEstadoActivoPayload) =>
  patch<{ id: string; estado: string; bodega_actual_id: string }>(`/inventario/activos/${id}/estado`, payload);

// TODO Task 12: reubicarActivo kept for ReubicarActivoModal updated in Task 12+
export const reubicarActivo = (id: string, payload: ReubicarActivoPayload) =>
  patch<{ id: string; bodega_actual_id: string }>(`/inventario/activos/${id}/reubicar`, payload);

// TODO Task 12: editarActivo kept for EditarActivoModal updated in Task 12+
export const editarActivo = (id: string, payload: EditarActivoPayload) =>
  patch<{ id: string; valor: number | null; fecha_vencimiento: string | null }>(`/inventario/activos/${id}`, payload);

export const getInventoryAvailableAssets = (params: InventoryAvailableAssetQueryParams) =>
  get<InventoryAvailableAssetRow[]>('/inventario/activos-disponibles', params);

export const getReturnEligibleAssets = (params: ReturnEligibleAssetQueryParams) =>
  get<ReturnEligibleAssetRow[]>('/devoluciones/activos-elegibles', params);

export const getDevoluciones = (params?: { estado?: DevolucionEstado; trabajador_id?: string }) =>
  get<DevolucionRow[]>('/devoluciones', params);

export const getDevolucionById = (id: string) =>
  get<DevolucionRow>(`/devoluciones/${id}`);

export const getDevolucionActaPdfUrl = (id: string) => `/devoluciones/${id}/pdf`;

export const createDevolucion = (payload: DevolucionCreatePayload, foto?: File) =>
  post<DevolucionRow>('/devoluciones', buildMultipartIfFile(payload, foto));

export const confirmDevolucion = (id: string) =>
  post<DevolucionRow>(`/devoluciones/${id}/confirm`);

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

// TODO Task 12: EntregarActivoPayload kept for entrega components updated in Task 12+
export interface EntregarActivoPayload {
  trabajador_id: string;
  ubicacion_origen_id: string;
  ubicacion_destino_id: string;
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

export const generateDevolucionSignatureToken = (
  devolucionId: string,
  expiraMinutos = 30
) =>
  post<DevolucionSignatureTokenResponse>(`/firmas/devoluciones/${devolucionId}/token`, {
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

// ============ IN-APP NOTIFICATIONS ENDPOINTS ============

export interface InAppNotificationsResponse {
  data: InAppNotification[];
  pagination: { limit: number; offset: number };
  total: number;
}

export const getInAppNotifications = (params?: {
  unread_only?: boolean;
  limit?: number;
  offset?: number;
}) => get<InAppNotificationsResponse>('/notifications/in-app', params);

export const getUnreadNotificationsCount = () =>
  get<{ count: number }>('/notifications/in-app/unread-count');

export const getNotificationStats = () => get<NotificationStats>('/notifications/in-app/stats');

export const markNotificationAsRead = (notificationId: number) =>
  put(`/notifications/in-app/${notificationId}/read`, {});

export const markAllNotificationsAsRead = () =>
  put('/notifications/in-app/mark-all-read', {});

export const deleteNotification = (notificationId: number) =>
  del(`/notifications/in-app/${notificationId}`);

export const deleteAllReadNotifications = () =>
  del('/notifications/in-app/clear-read');

// ── Perfil Trabajador ──────────────────────────────────────
export interface TrabajadorCustodiaRow {
  custodia_id: string;
  articulo_id: string;
  entrega_id: string;
  desde_en: string;
  fecha_devolucion_esperada: string | null;
  codigo: string;
  nro_serie: string;
  estado: ArticuloEstado;
  nombre: string;
  tipo: ArticuloTipo;
  bodega_nombre?: string | null;
  proyecto_nombre?: string | null;
  dias_en_custodia: number;
  semaforo: 'verde' | 'amarillo' | 'rojo' | 'sin_plazo';
  dias_restantes: number | null;
}

export interface TrabajadorProfileResponse {
  id: string;
  persona_id: string;
  rut: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  email?: string;
  cargo?: string;
  fecha_ingreso?: string;
  estado: string;
  custodias: TrabajadorCustodiaRow[];
  stats: {
    activos_en_custodia: number;
    total_custodias: number;
    total_entregas: number;
    dias_promedio_custodia: number;
    activos_vencidos_o_proximos: number;
  };
}

export const getTrabajadorProfile = (id: string) =>
  get<TrabajadorProfileResponse>(`/trabajadores/${id}/profile`);
