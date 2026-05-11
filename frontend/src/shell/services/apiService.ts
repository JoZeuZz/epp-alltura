import { defaultHttpClient, type ApiEnvelope } from './httpClient';

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

export type ArticuloGrupoPrincipal = 'epp' | 'equipo' | 'herramienta';
export type ArticuloSubclasificacion =
  | 'epp'
  | 'medicion_ensayos'
  | 'manual'
  | 'electrica_cable'
  | 'inalambrica_bateria';
export type ArticuloEspecialidad =
  | 'oocc'
  | 'ooee'
  | 'equipos'
  | 'trabajos_verticales_lineas_de_vida';
export type ArticuloTipo = ArticuloGrupoPrincipal;
export type ArticuloTrackingMode = 'serial' | 'lote';
export type ArticuloRetornoMode = 'retornable';
export type ArticuloNivelControl = 'alto' | 'medio' | 'bajo' | 'fuera_scope';
export type ArticuloEstado = 'activo' | 'inactivo';

export interface Articulo {
  id: string;
  grupo_principal: ArticuloGrupoPrincipal;
  subclasificacion?: ArticuloSubclasificacion | string | null;
  especialidades: ArticuloEspecialidad[];
  nombre: string;
  marca: string;
  modelo: string;
  nivel_control?: ArticuloNivelControl;
  requiere_vencimiento: boolean;
  unidad_medida: string;
  estado: ArticuloEstado;
  creado_en?: string;
}

export interface ArticuloQueryParams {
  grupo_principal?: ArticuloGrupoPrincipal;
  subclasificacion?: ArticuloSubclasificacion;
  especialidad?: ArticuloEspecialidad;
  estado?: ArticuloEstado;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ArticuloCreatePayload {
  grupo_principal: ArticuloGrupoPrincipal;
  subclasificacion: ArticuloSubclasificacion;
  especialidades: ArticuloEspecialidad[];
  nombre: string;
  marca: string;
  modelo: string;
  nivel_control?: ArticuloNivelControl;
  requiere_vencimiento?: boolean;
  unidad_medida: string;
  estado?: ArticuloEstado;
}

export interface ArticuloUpdatePayload extends Partial<ArticuloCreatePayload> {
  id: string;
}

export const getArticulos = (params?: ArticuloQueryParams) => get<Articulo[]>('/articulos', params);
export const createArticulo = <T = Articulo>(payload: ArticuloCreatePayload) =>
  post<T>('/articulos', payload);
export const updateArticulo = <T = Articulo>({ id, ...payload }: ArticuloUpdatePayload) =>
  put<T>(`/articulos/${id}`, payload);
export const deactivateArticulo = <T = Articulo>(id: string) => del<T>(`/articulos/${id}`);
export const permanentDeleteArticulo = <T = unknown>(id: string) =>
  del<T>(`/articulos/${id}/permanent`);

export interface InventoryStockQueryParams {
  search?: string;
  articulo_id?: string;
  ubicacion_id?: string;
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


export interface InventoryActivoDetailQueryParams extends CursorPaginationParams {
  search?: string;
  articulo_id?: string;
  ubicacion_id?: string;
  estado?: string;
  solo_entregados?: boolean;
  tipo_activo?: InventoryActivoTypeScope;
}

export type InventoryActivoTypeScope = 'herramientas' | 'epp' | 'equipos';

export interface InventoryActivoDetailRow {
  id: string;
  codigo?: string;
  nro_serie?: string | null;
  articulo_id?: string;
  articulo_nombre?: string;
  ubicacion_id?: string | null;
  ubicacion_nombre?: string | null;
  estado?: string;
  valor?: number | null;
  fecha_vencimiento?: string | null;
  custodia_id?: string | null;
  custodia_estado?: string | null;
  custodia_desde_en?: string | null;
  custodio_trabajador_id?: string | null;
  custodio_nombres?: string | null;
  custodio_apellidos?: string | null;
  custodia_ubicacion_id?: string | null;
  custodia_ubicacion_nombre?: string | null;
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

export interface InventoryAvailableAssetQueryParams {
  articulo_id: string;
  ubicacion_id: string;
  search?: string;
  limit?: number;
}

export interface InventoryAvailableAssetRow {
  id: string;
  codigo: string;
  nro_serie?: string | null;
  estado: 'en_stock' | 'entregado' | 'mantencion' | 'baja' | string;
  articulo_id: string;
  articulo_nombre?: string;
  ubicacion_id: string;
  ubicacion_nombre?: string;
}

export interface ReturnEligibleAssetQueryParams {
  trabajador_id: string;
  articulo_id?: string;
  search?: string;
  limit?: number;
}

export interface ReturnEligibleAssetRow {
  custodia_activo_id: string;
  trabajador_id: string;
  desde_en: string;
  activo_id: string;
  codigo: string;
  nro_serie?: string | null;
  activo_estado?: string;
  articulo_id: string;
  articulo_nombre?: string;
  ubicacion_actual_id?: string | null;
  ubicacion_actual_nombre?: string | null;
}

export type DevolucionEstado = 'borrador' | 'pendiente_firma' | 'confirmada' | 'anulada';
export type DevolucionDisposicion = 'devuelto' | 'perdido' | 'baja' | 'mantencion';
export type DevolucionCondicionEntrada = 'ok' | 'usado' | 'danado' | 'perdido';

export interface DevolucionDetalleRow {
  id: string;
  devolucion_id: string;
  custodia_activo_id?: string | null;
  articulo_id?: string | null;
  articulo_nombre?: string;
  activo_id?: string | null;
  activo_codigo?: string | null;
  activo_nro_serie?: string | null;
  cantidad: number;
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
  cantidad_detalles?: number;
  firma_imagen_url?: string | null;
  firmado_en?: string | null;
  detalles?: DevolucionDetalleRow[];
  /* trazabilidad cruzada: entrega de origen (primera) */
  entrega_origen_id?: string | null;
  entrega_origen_fecha?: string | null;
}

export interface DevolucionDetallePayload {
  custodia_activo_id?: string | null;
  articulo_id?: string | null;
  activo_ids?: string[];
  cantidad: number;
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
  compra_id?: string;
  egreso_id?: string;
  entrega_id?: string;
  devolucion_id?: string;
  desde?: string;
  hasta?: string;
  limit?: number;
}



export const getInventoryStock = (params?: InventoryStockQueryParams) =>
  get('/inventario/stock', params);

export const getInventoryActivosPaged = (params?: InventoryActivoDetailQueryParams) =>
  get<CursorPaginatedResponse<InventoryActivoDetailRow>>('/inventario/activos-paged', params);

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

export interface DevolverActivoDetallePayload {
  articulo_id: string;
  activo_ids: string[];
  condicion_entrada?: 'ok' | 'usado' | 'danado' | 'perdido';
  disposicion: 'devuelto' | 'perdido' | 'baja' | 'mantencion';
  notas?: string | null;
}

export interface DevolverActivoPayload {
  trabajador_id: string;
  ubicacion_recepcion_id: string;
  notas?: string | null;
  detalles: DevolverActivoDetallePayload[];
}

export interface ActivoProfileResponse {
  id: string;
  codigo: string;
  nro_serie?: string | null;
  estado: string;
  foto_url?: string | null;
  ubicacion_actual_id?: string | null;
  ubicacion_nombre?: string | null;
  fecha_compra?: string | null;
  fecha_vencimiento?: string | null;
  valor?: number | null;
  creado_en: string;
  articulo_id: string;
  articulo_nombre: string;
  custodia_activa?: ActivoCustodiaEntry | null;
  compra?: {
    compra_id: string;
    fecha_compra: string;
    proveedor_nombre?: string | null;
    precio_unitario?: number | null;
  } | null;
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
export interface CambiarEstadoActivoPayload {
  nuevo_estado: string;
  motivo: string;
  bodega_destino_id?: string;
}

export interface ReubicarActivoPayload {
  bodega_destino_id: string;
  motivo?: string;
}

export interface EditarActivoPayload {
  valor?: number | null;
  fecha_vencimiento?: string | null;
}

export const cambiarEstadoActivo = (id: string, payload: CambiarEstadoActivoPayload) =>
  patch<{ id: string; estado: string; ubicacion_actual_id: string }>(`/inventario/activos/${id}/estado`, payload);

export const reubicarActivo = (id: string, payload: ReubicarActivoPayload) =>
  patch<{ id: string; ubicacion_actual_id: string }>(`/inventario/activos/${id}/reubicar`, payload);

export const editarActivo = (id: string, payload: EditarActivoPayload) =>
  patch<{ id: string; valor: number | null; fecha_vencimiento: string | null }>(`/inventario/activos/${id}`, payload);

export const devolverActivo = (id: string, payload: DevolverActivoPayload) =>
  post<DevolucionRow>(`/activos/${id}/devolver`, payload);

export const entregarActivo = (activoId: string, payload: EntregarActivoPayload) =>
  post<EntregaRow>(`/activos/${activoId}/entregar`, payload);

export const getInventoryAvailableAssets = (params: InventoryAvailableAssetQueryParams) =>
  get<InventoryAvailableAssetRow[]>('/inventario/activos-disponibles', params);

export const getReturnEligibleAssets = (params: ReturnEligibleAssetQueryParams) =>
  get<ReturnEligibleAssetRow[]>('/devoluciones/activos-elegibles', params);

export const getDevoluciones = (params?: { estado?: DevolucionEstado; trabajador_id?: string }) =>
  get<DevolucionRow[]>('/devoluciones', params);

export const getDevolucionById = (id: string) =>
  get<DevolucionRow>(`/devoluciones/${id}`);

export const createDevolucion = (payload: DevolucionCreatePayload) =>
  post<DevolucionRow>('/devoluciones', payload);

export const confirmDevolucion = (id: string) =>
  post<DevolucionRow>(`/devoluciones/${id}/confirm`);

export const getInventoryStockMovements = (params?: InventoryMovementQueryParams) =>
  get('/inventario/movimientos-stock', params);

// ============ ENTREGAS ============

export type EntregaTipo = 'entrega';
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
  activo_id?: string | null;
  activo_codigo?: string | null;
  tipo_item_entrega?: 'retornable' | 'asignacion';
  cantidad: number;
  condicion_salida: CondicionSalida;
  notas?: string | null;
  /* trazabilidad cruzada: estado devolución por ítem */
  custodia_estado?: string | null;
  custodia_cerrada_en?: string | null;
  devuelto?: boolean | null;
  devolucion_disposicion?: string | null;
}

export type EntregaEstadoDevolucion = 'devuelta_completa' | 'parcialmente_devuelta' | 'pendiente_devolucion';

export interface EntregaRow {
  id: string;
  creado_por_usuario_id: string;
  trabajador_id: string;
  nombres?: string;
  apellidos?: string;
  rut?: string;
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
  activo_ids?: string[];
  cantidad?: number;
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

export interface EntregarActivoPayload {
  trabajador_id: string;
  ubicacion_origen_id: string;
  ubicacion_destino_id: string;
  nota_destino?: string | null;
  fecha_devolucion_esperada?: string | null;
  detalles: EntregaDetallePayload[];
}


export interface FirmaDispositivoPayload {
  texto_aceptacion: string;
  firma_imagen_url?: string;
  texto_aceptacion_detalle?: { detalle_id: string | null; texto: string }[];
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

export const createEntrega = (payload: EntregaCreatePayload) =>
  post<EntregaRow>('/entregas', payload);

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

export const getInAppNotifications = (params?: {
  unread_only?: boolean;
  limit?: number;
  offset?: number;
}) => get('/notifications/in-app', params);

export const getUnreadNotificationsCount = () =>
  get<{ count: number }>('/notifications/in-app/unread-count');

export const getNotificationStats = () => get('/notifications/in-app/stats');

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
  activo_id: string;
  entrega_id: string;
  desde_en: string;
  fecha_devolucion_esperada: string | null;
  codigo: string;
  nro_serie: string | null;
  activo_estado: string;
  articulo_id: string;
  articulo_nombre: string;
  articulo_tipo: string;
  ubicacion_nombre: string;
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
