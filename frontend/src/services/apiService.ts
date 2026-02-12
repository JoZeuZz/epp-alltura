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
