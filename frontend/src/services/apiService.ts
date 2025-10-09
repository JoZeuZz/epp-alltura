import axios from 'axios';

const apiService = axios.create({
  baseURL: '/api',
});

apiService.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const get = <T = unknown>(url: string, params?: unknown) =>
  apiService.get<T>(url, { params }).then((res) => res.data);
export const post = <T = unknown>(url: string, data?: unknown) =>
  apiService.post<T>(url, data).then((res) => res.data);
export const put = <T = unknown>(url: string, data?: unknown) =>
  apiService.put<T>(url, data).then((res) => res.data);
export const del = <T = unknown>(url: string) => apiService.delete<T>(url).then((res) => res.data);
