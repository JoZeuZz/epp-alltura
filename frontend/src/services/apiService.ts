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
export const patch = <T = unknown>(url: string, data?: unknown) =>
  apiService.patch<T>(url, data).then((res) => res.data);
export const del = <T = unknown>(url: string) => apiService.delete<T>(url).then((res) => res.data);

// ============ SCAFFOLD ENDPOINTS ============

/**
 * Obtiene todos los andamios (filtrados por rol del usuario)
 */
export const getScaffolds = () => get('/scaffolds');

/**
 * Obtiene un andamio por ID
 */
export const getScaffoldById = (id: number) => get(`/scaffolds/${id}`);

/**
 * Obtiene andamios creados por el usuario actual (supervisores)
 */
export const getMyScaffolds = () => get('/scaffolds/my-scaffolds');

/**
 * Crea un nuevo andamio
 */
export const createScaffold = (formData: FormData) =>
  post('/scaffolds', formData);

/**
 * Actualiza un andamio existente
 */
export const updateScaffold = (id: number, formData: FormData) =>
  put(`/scaffolds/${id}`, formData);

/**
 * Actualiza el estado de la tarjeta (green/red)
 */
export const updateCardStatus = (id: number, cardStatus: 'green' | 'red') =>
  patch(`/scaffolds/${id}/card-status`, { card_status: cardStatus });

/**
 * Actualiza el estado de armado (assembled/disassembled)
 */
export const updateAssemblyStatus = (
  id: number,
  assemblyStatus: 'assembled' | 'disassembled',
  disassemblyImage?: File
) => {
  const formData = new FormData();
  formData.append('assembly_status', assemblyStatus);
  if (disassemblyImage) {
    formData.append('disassembly_image', disassemblyImage);
  }
  return patch(`/scaffolds/${id}/assembly-status`, formData);
};

/**
 * Obtiene el historial de cambios de un andamio
 */
export const getScaffoldHistory = (id: number) => get(`/scaffolds/${id}/history`);

/**
 * Elimina un andamio
 */
export const deleteScaffold = (id: number) => del(`/scaffolds/${id}`);

// ============ PROJECT ASSIGNMENT ENDPOINTS ============

/**
 * Asigna un cliente a un proyecto
 */
export const assignClientToProject = (projectId: number, userId: number | null) =>
  patch(`/projects/${projectId}/assign-client`, { user_id: userId });

/**
 * Asigna un supervisor a un proyecto
 */
export const assignSupervisorToProject = (projectId: number, userId: number | null) =>
  patch(`/projects/${projectId}/assign-supervisor`, { user_id: userId });

// ============ DASHBOARD ENDPOINTS ============

/**
 * Obtiene estadísticas de metros cúbicos
 */
export const getCubicMetersStats = () => get('/dashboard/cubic-meters');

// ============ USER ENDPOINTS ============

/**
 * Obtiene usuarios filtrados por rol
 */
export const getUsersByRole = (role: 'admin' | 'supervisor' | 'client') =>
  get(`/users?role=${role}`);
