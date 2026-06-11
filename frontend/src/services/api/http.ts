import { defaultHttpClient, type ApiEnvelope } from '@jozeuzz/alltura-ui';

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

export const postForm = <T = unknown>(url: string, form: FormData) =>
  apiService.post<T>(url, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);

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
