import axios from 'axios';

const apiService = axios.create({
  baseURL: '/api',
});

// Interceptor de peticiones: Agregar token de autenticación
apiService.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de respuestas: Manejar errores 401 (token inválido/expirado)
apiService.interceptors.response.use(
  (response) => response, // Pasar respuestas exitosas sin cambios
  (error) => {
    // Si el servidor responde con 401, el token es inválido
    if (error.response?.status === 401) {
      // Limpiar el token inválido del localStorage
      localStorage.removeItem('accessToken');
      
      // Redirigir al login solo si no estamos ya ahí
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Rechazar la promesa para que el error se propague
    return Promise.reject(error);
  }
);

export const get = <T = unknown>(url: string, params?: unknown) =>
  apiService.get<T>(url, { params }).then((res) => res.data);
export const post = <T = unknown>(url: string, data?: unknown) =>
  apiService.post<T>(url, data).then((res) => res.data);
export const put = <T = unknown>(url: string, data?: unknown) =>
  apiService.put<T>(url, data).then((res) => res.data);
export const del = <T = unknown>(url: string) => apiService.delete<T>(url).then((res) => res.data);
