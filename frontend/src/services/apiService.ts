import axios from 'axios';
import { refreshAccessToken, clearStoredTokens } from './authRefresh';

export const apiService = axios.create({
  baseURL: '/api',
});

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
  errors?: unknown[];
};

apiService.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiService.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const originalRequest = error.config as (typeof error.config & { _retry?: boolean });
      const requestUrl = typeof originalRequest?.url === 'string' ? originalRequest.url : '';

      const isAuthRefresh = requestUrl.includes('/auth/refresh');
      const isAuthLogin = requestUrl.includes('/auth/login');

      if (!isAuthRefresh && !isAuthLogin && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;
        const newToken = await refreshAccessToken();

        if (newToken) {
          originalRequest.headers = {
            ...(originalRequest.headers || {}),
            Authorization: `Bearer ${newToken}`,
          };
          return apiService(originalRequest);
        }
      }

      clearStoredTokens();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export const get = <T = unknown>(url: string, params?: unknown) =>
  apiService.get<T | ApiEnvelope<T>>(url, { params }).then((res) => unwrapData<T>(res.data));
export const post = <T = unknown>(url: string, data?: unknown) =>
  apiService.post<T | ApiEnvelope<T>>(url, data).then((res) => unwrapData<T>(res.data));
export const put = <T = unknown>(url: string, data?: unknown) =>
  apiService.put<T | ApiEnvelope<T>>(url, data).then((res) => unwrapData<T>(res.data));
export const patch = <T = unknown>(url: string, data?: unknown) =>
  apiService.patch<T | ApiEnvelope<T>>(url, data).then((res) => unwrapData<T>(res.data));
export const del = <T = unknown>(url: string) =>
  apiService.delete<T | ApiEnvelope<T>>(url).then((res) => unwrapData<T>(res.data));

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

/**
 * Obtiene usuarios filtrados por rol (compatibilidad de administración MER).
 */
export const getUsersByRole = (
  role: 'admin' | 'supervisor' | 'bodega' | 'worker' | 'trabajador' | 'client'
) => get(`/users?role=${role}`);

export type UserRole = 'admin' | 'supervisor' | 'bodega' | 'worker' | 'trabajador' | 'client';

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

export type ArticuloTipo = 'herramienta' | 'epp' | 'consumible';
export type ArticuloTrackingMode = 'serial' | 'lote' | 'cantidad';
export type ArticuloRetornoMode = 'retornable' | 'consumible';
export type ArticuloNivelControl = 'alto' | 'medio' | 'bajo' | 'fuera_scope';
export type ArticuloEstado = 'activo' | 'inactivo';

export interface Articulo {
  id: string;
  tipo: ArticuloTipo;
  nombre: string;
  marca?: string | null;
  modelo?: string | null;
  categoria?: string | null;
  tracking_mode: ArticuloTrackingMode;
  retorno_mode: ArticuloRetornoMode;
  nivel_control?: ArticuloNivelControl;
  requiere_vencimiento: boolean;
  unidad_medida: string;
  estado: ArticuloEstado;
  creado_en?: string;
}

export interface ArticuloQueryParams {
  tipo?: ArticuloTipo;
  estado?: ArticuloEstado;
  tracking_mode?: ArticuloTrackingMode;
  retorno_mode?: ArticuloRetornoMode;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ArticuloCreatePayload {
  tipo: ArticuloTipo;
  nombre: string;
  marca?: string | null;
  modelo?: string | null;
  categoria?: string | null;
  tracking_mode: ArticuloTrackingMode;
  retorno_mode: ArticuloRetornoMode;
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
  lote_id?: string;
  limit?: number;
  offset?: number;
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

export interface InventoryMovementQueryParams {
  articulo_id?: string;
  tipo?: string;
  compra_id?: string;
  entrega_id?: string;
  devolucion_id?: string;
  desde?: string;
  hasta?: string;
  limit?: number;
}

export interface Supplier {
  id: string;
  nombre: string;
  rut?: string | null;
  email?: string | null;
  telefono?: string | null;
  estado?: 'activo' | 'inactivo';
  creado_en?: string;
}

export interface SupplierCreatePayload {
  nombre: string;
  rut?: string | null;
  email?: string | null;
  telefono?: string | null;
  estado?: 'activo' | 'inactivo';
}

export interface CompraDocumentoPayload {
  proveedor_id: string;
  tipo: 'factura' | 'boleta' | 'guia';
  numero: string;
  fecha: string;
  archivo_url?: string | null;
}

export interface CompraDetalleSerialActivoPayload {
  codigo: string;
  nro_serie?: string | null;
  valor?: number | null;
  fecha_vencimiento?: string | null;
}

export interface CompraDetalleLotePayload {
  codigo_lote?: string | null;
  fecha_fabricacion?: string | null;
  fecha_vencimiento?: string | null;
}

export interface CompraDetallePayload {
  articulo_id: string;
  ubicacion_id: string;
  cantidad: number;
  costo_unitario: number;
  notas?: string | null;
  lote_id?: string | null;
  lote?: CompraDetalleLotePayload;
  activos?: CompraDetalleSerialActivoPayload[];
}

export interface CompraCreatePayload {
  documento_compra_id?: string | null;
  documento_compra?: CompraDocumentoPayload;
  fecha_compra?: string | null;
  notas?: string | null;
  detalles: CompraDetallePayload[];
}

export interface InventoryIngresoCreatePayload {
  documento_compra_id?: string | null;
  documento_compra?: CompraDocumentoPayload;
  fecha_ingreso?: string | null;
  notas?: string | null;
  detalles: CompraDetallePayload[];
}

export const getInventoryStock = (params?: InventoryStockQueryParams) =>
  get('/inventario/stock', params);

export const getInventoryAvailableAssets = (params: InventoryAvailableAssetQueryParams) =>
  get<InventoryAvailableAssetRow[]>('/inventario/activos-disponibles', params);

export const getReturnEligibleAssets = (params: ReturnEligibleAssetQueryParams) =>
  get<ReturnEligibleAssetRow[]>('/devoluciones/activos-elegibles', params);

export const getInventoryStockMovements = (params?: InventoryMovementQueryParams) =>
  get('/inventario/movimientos-stock', params);

export const exportInventoryStockMovementsCsv = async (params?: InventoryMovementQueryParams) => {
  const response = await apiService.get('/inventario/movimientos-stock/export', {
    params,
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
  const contentDisposition = String(response.headers['content-disposition'] || '');
  const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  const fileName = fileNameMatch?.[1] || 'movimientos-stock.csv';

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const getInventoryIngresos = (params?: {
  proveedor_id?: string;
  creado_por_usuario_id?: string;
}) => get('/inventario/ingresos', params);

export const getPurchases = (params?: { proveedor_id?: string; creado_por_usuario_id?: string }) =>
  get('/compras', params);

export const createPurchase = <T = unknown>(payload: CompraCreatePayload) =>
  post<T>('/compras', payload);

export const createInventoryIngreso = <T = unknown>(
  payload: InventoryIngresoCreatePayload | FormData
) => {
  if (payload instanceof FormData) {
    return apiService
      .post<T | ApiEnvelope<T>>('/inventario/ingresos', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((res) => unwrapData<T>(res.data));
  }

  return post<T>('/inventario/ingresos', payload);
};

export const deleteInventoryIngreso = (id: string) =>
  del(`/inventario/ingresos/${id}`);

// ============ EGRESOS ============

export type EgresoTipoMotivo = 'salida' | 'baja' | 'consumo' | 'ajuste';

export interface EgresoRow {
  id: string;
  tipo_motivo: EgresoTipoMotivo;
  creado_por_nombre?: string | null;
  creado_en?: string;
  notas?: string | null;
  cantidad_items?: number;
  cantidad_total?: number;
}

export interface InventoryEgresoDetallePayload {
  articulo_id: string;
  ubicacion_id: string;
  cantidad?: number;
  activo_ids?: string[];
  lote_id?: string | null;
  notas?: string | null;
}

export interface InventoryEgresoCreatePayload {
  tipo_motivo: EgresoTipoMotivo;
  notas?: string | null;
  detalles: InventoryEgresoDetallePayload[];
}

export const getInventoryEgresos = (params?: {
  tipo_motivo?: EgresoTipoMotivo;
  creado_por_usuario_id?: string;
  desde?: string;
  hasta?: string;
  limit?: number;
}) => get<EgresoRow[]>('/inventario/egresos', params);

export const createInventoryEgreso = <T = unknown>(payload: InventoryEgresoCreatePayload) =>
  post<T>('/inventario/egresos', payload);

export const deleteInventoryEgreso = (id: string) =>
  del(`/inventario/egresos/${id}`);

// ============ ENTREGAS ============

export type EntregaTipo = 'entrega' | 'prestamo' | 'traslado';
export type EntregaEstado =
  | 'borrador'
  | 'pendiente_firma'
  | 'en_transito'
  | 'recibido'
  | 'confirmada'
  | 'anulada'
  | 'revertida_admin';
export type CondicionSalida = 'ok' | 'usado' | 'danado';

export interface EntregaDetalleRow {
  id: string;
  entrega_id: string;
  articulo_id: string;
  articulo_nombre?: string;
  tracking_mode?: 'serial' | 'lote' | 'cantidad';
  retorno_mode?: 'retornable' | 'consumible';
  activo_id?: string | null;
  activo_codigo?: string | null;
  lote_id?: string | null;
  codigo_lote?: string | null;
  tipo_item_entrega?: 'retornable' | 'asignacion';
  cantidad: number;
  condicion_salida: CondicionSalida;
  notas?: string | null;
}

export interface EntregaRow {
  id: string;
  creado_por_usuario_id: string;
  trabajador_id: string;
  transportista_trabajador_id?: string | null;
  receptor_trabajador_id?: string | null;
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
  recibido_en?: string | null;
  recibido_por_usuario_id?: string | null;
  confirmada_en?: string | null;
  cantidad_items?: number;
  firma_imagen_url?: string | null;
  firmado_en?: string | null;
  detalles?: EntregaDetalleRow[];
}

export interface EntregaDetallePayload {
  articulo_id: string;
  activo_ids?: string[];
  lote_id?: string | null;
  cantidad?: number;
  condicion_salida?: CondicionSalida;
  notas?: string | null;
}

export interface EntregaCreatePayload {
  trabajador_id: string;
  transportista_trabajador_id?: string | null;
  receptor_trabajador_id?: string | null;
  ubicacion_origen_id: string;
  ubicacion_destino_id: string;
  tipo?: EntregaTipo;
  es_traslado?: boolean;
  nota_destino?: string | null;
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

export const createEntrega = (payload: EntregaCreatePayload) =>
  post<EntregaRow>('/entregas', payload);

export const confirmEntrega = (id: string) =>
  post<EntregaRow>(`/entregas/${id}/confirm`);

export const recibirTraslado = (id: string, payload?: { receptor_trabajador_id?: string | null }) =>
  post<EntregaRow>(`/entregas/${id}/recibir`, payload || {});

export const anularEntrega = (id: string, payload: { motivo: string }) =>
  post<EntregaRow>(`/entregas/${id}/anular`, payload);

export const deshacerEntrega = (id: string, payload: { motivo: string }) =>
  post<EntregaRow>(`/entregas/${id}/deshacer`, payload);

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

export const getSuppliers = (params?: { search?: string; estado?: 'activo' | 'inactivo' }) =>
  get<Supplier[]>('/proveedores', params);

export const createSupplier = <T = Supplier>(payload: SupplierCreatePayload) =>
  post<T>('/proveedores', payload);

/**
 * Resumen de dashboard EPP.
 */
export const getDashboardSummary = () => get('/dashboard/summary');

/**
 * Indicadores operativos EPP (endpoint canónico).
 */
export const getOperationalIndicators = () => get('/dashboard/indicadores-operativos');

/**
 * Resumen por ubicación (endpoint canónico).
 */
export const getLocationDashboardSummary = (ubicacionId: string) =>
  get(`/dashboard/ubicaciones/${ubicacionId}/resumen`);

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
