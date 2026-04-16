import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import {
  clearStoredTokens,
  getStoredAccessToken,
  refreshAccessToken,
} from './authRefresh';

export type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
  errors?: unknown[];
};

export function extractErrorMetadata(error: unknown): { requestId?: string; message?: string } {
  if (!error || typeof error !== 'object') {
    return {};
  }

  const axiosLike = error as {
    response?: {
      data?: {
        requestId?: string;
        message?: string;
      };
      headers?: Record<string, string | undefined>;
    };
    message?: string;
  };

  const dataRequestId = axiosLike.response?.data?.requestId;
  const headerRequestId =
    axiosLike.response?.headers?.['x-request-id'] ||
    axiosLike.response?.headers?.['X-Request-Id'];

  return {
    requestId: dataRequestId || headerRequestId,
    message: axiosLike.response?.data?.message || axiosLike.message,
  };
}

export type AuthFailureMode = 'redirect' | 'throw';

export type HttpRequestConfig = AxiosRequestConfig & {
  _retry?: boolean;
  authFailureMode?: AuthFailureMode;
};

export class HttpAuthError extends Error {
  status: number;

  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'HttpAuthError';
    this.status = 401;
  }
}

export interface HttpClient {
  instance: AxiosInstance;
  get: <T = unknown>(url: string, params?: unknown, config?: HttpRequestConfig) => Promise<T>;
  post: <T = unknown>(url: string, data?: unknown, config?: HttpRequestConfig) => Promise<T>;
  put: <T = unknown>(url: string, data?: unknown, config?: HttpRequestConfig) => Promise<T>;
  patch: <T = unknown>(url: string, data?: unknown, config?: HttpRequestConfig) => Promise<T>;
  del: <T = unknown>(url: string, config?: HttpRequestConfig) => Promise<T>;
}

type CreateHttpClientOptions = {
  baseURL?: string;
  authFailureMode?: AuthFailureMode;
};

function unwrapData<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}

export function isHttpAuthError(error: unknown): error is HttpAuthError {
  return error instanceof HttpAuthError;
}

export function createHttpClient(options: CreateHttpClientOptions = {}): HttpClient {
  const { baseURL = '/api', authFailureMode = 'redirect' } = options;

  const instance = axios.create({ baseURL });

  instance.interceptors.request.use((config) => {
    const token = getStoredAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (error.response?.status !== 401) {
        return Promise.reject(error);
      }

      const originalRequest = error.config as HttpRequestConfig | undefined;
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
          return instance(originalRequest);
        }
      }

      clearStoredTokens();

      const mode = originalRequest?.authFailureMode ?? authFailureMode;
      if (mode === 'redirect' && typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }

      return Promise.reject(new HttpAuthError());
    }
  );

  const get = <T = unknown>(url: string, params?: unknown, config?: HttpRequestConfig) =>
    instance
      .get<T | ApiEnvelope<T>>(url, {
        ...(config || {}),
        params,
      })
      .then((res) => unwrapData<T>(res.data));

  const post = <T = unknown>(url: string, data?: unknown, config?: HttpRequestConfig) =>
    instance
      .post<T | ApiEnvelope<T>>(url, data, config)
      .then((res) => unwrapData<T>(res.data));

  const put = <T = unknown>(url: string, data?: unknown, config?: HttpRequestConfig) =>
    instance
      .put<T | ApiEnvelope<T>>(url, data, config)
      .then((res) => unwrapData<T>(res.data));

  const patch = <T = unknown>(url: string, data?: unknown, config?: HttpRequestConfig) =>
    instance
      .patch<T | ApiEnvelope<T>>(url, data, config)
      .then((res) => unwrapData<T>(res.data));

  const del = <T = unknown>(url: string, config?: HttpRequestConfig) =>
    instance
      .delete<T | ApiEnvelope<T>>(url, config)
      .then((res) => unwrapData<T>(res.data));

  return {
    instance,
    get,
    post,
    put,
    patch,
    del,
  };
}

export const defaultHttpClient = createHttpClient({ authFailureMode: 'redirect' });
export const loaderHttpClient = createHttpClient({ authFailureMode: 'throw' });
