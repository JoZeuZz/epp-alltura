import { createBrowserRouter, redirect, LoaderFunctionArgs, ActionFunctionArgs } from 'react-router-dom';
import { lazy } from 'react';
import AppLayout from '../layouts/AppLayout';
import LoginPage from '../pages/LoginPage';
import ErrorPage from '../components/ErrorPage';
import type { User } from '../types/api';
import { refreshAccessToken, clearStoredTokens } from '../services/authRefresh';

// Admin Pages (lazy loaded)
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const ClientsPage = lazy(() => import('../pages/admin/ClientsPage'));
const ProjectsPage = lazy(() => import('../pages/admin/ProjectsPage'));
const UsersPage = lazy(() => import('../pages/admin/UsersPage'));
const UserHistoryPage = lazy(() => import('../pages/admin/UserHistoryPage'));
const ScaffoldsPage = lazy(() => import('../pages/admin/ScaffoldsPage'));
const ProjectGalleryPage = lazy(() => import('../pages/ProjectGalleryPage'));

// Supervisor Pages (lazy loaded)
const SupervisorDashboard = lazy(() => import('../pages/supervisor/SupervisorDashboard'));
const ProjectScaffoldsPage = lazy(() => import('../pages/supervisor/ProjectScaffoldsPage'));
const CreateScaffoldPage = lazy(() => import('../pages/supervisor/CreateScaffoldPage'));
const DisassembleScaffoldPage = lazy(() => import('../pages/supervisor/DisassembleScaffoldPage'));
const HistoryPage = lazy(() => import('../pages/supervisor/HistoryPage'));

// Client Pages (lazy loaded)
const ClientDashboard = lazy(() => import('../pages/client/ClientDashboard'));
const ClientProjectScaffoldsPage = lazy(() => import('../pages/client/ClientProjectScaffoldsPage'));

// Shared Pages (lazy loaded)
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const UserFormPage = lazy(() => import('../pages/UserFormPage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

// API Base URL - usar /api directamente para que Vite proxy maneje la redirección
const API_URL = '/api';

// Helper para obtener el token de autenticación
function getAuthToken() {
  return localStorage.getItem('accessToken');
}

// Helper para hacer fetch autenticado
async function fetchAPI(endpoint: string, options: RequestInit = {}, allowRetry = true) {
  const token = getAuthToken();

  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401 && allowRetry) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return fetchAPI(
          endpoint,
          {
            ...options,
            headers: {
              ...(options.headers || {}),
              Authorization: `Bearer ${newToken}`,
            },
          },
          false
        );
      }
      clearStoredTokens();
    }

    // Intentar extraer el mensaje de error del backend
    let errorMessage = 'Error del servidor';
    let validationErrors: Array<{ field: string; message: string }> = [];
    
    try {
      const errorData = await response.json();
      // El backend puede enviar: { error, message, errors }
      if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        validationErrors = errorData.errors;
        errorMessage = errorData.message || 'Error de validación';
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (e) {
      // Si no se puede parsear la respuesta, usar mensaje genérico
      console.error('Error parsing error response:', e);
    }

    if (response.status === 401) {
      const error = new Error('No autorizado') as any;
      error.validationErrors = validationErrors;
      throw error;
    }
    if (response.status === 404) {
      const error = new Error('No encontrado') as any;
      error.validationErrors = validationErrors;
      throw error;
    }
    
    // Lanzar error con el mensaje detallado del backend y los errores de validación
    const error = new Error(errorMessage) as any;
    error.validationErrors = validationErrors;
    throw error;
  }

  return response.json();
}

// Helper para obtener el usuario desde el token
async function getUserFromToken(): Promise<
  Pick<User, 'id' | 'email' | 'role' | 'first_name' | 'last_name'> | null
> {
  let token = localStorage.getItem('accessToken');

  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Verificar si el token está expirado
    const isExpired = payload.exp && payload.exp * 1000 < Date.now();
    if (isExpired) {
      const refreshedToken = await refreshAccessToken();
      if (!refreshedToken) {
        clearStoredTokens();
        return null;
      }
      token = refreshedToken;
    }

    const freshPayload = JSON.parse(atob(token.split('.')[1]));
    const userData = freshPayload.user || freshPayload;

    return {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      first_name: userData.first_name,
      last_name: userData.last_name,
    };
  } catch (error) {
    console.error('[getUserFromToken] Error decoding token:', error);
    clearStoredTokens();
    return null;
  }
}

// Auth loader - verificar autenticación antes de renderizar rutas protegidas
async function protectedLoader() {
  try {
    const user = await getUserFromToken();
    
    if (!user) {
      throw new Response('No autenticado', { status: 401 });
    }
    
    return { user };
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('Error en protectedLoader:', error);
    return redirect('/login');
  }
}

// Root loader - redirigir según el rol del usuario
async function rootLoader() {
  try {
    const user = await getUserFromToken();
    
    if (!user) {
      return redirect('/login');
    }
    
    if (user.role === 'admin') {
      return redirect('/admin/dashboard');
    } else if (user.role === 'supervisor') {
      return redirect('/supervisor/dashboard');
    } else if (user.role === 'client') {
      return redirect('/client/dashboard');
    }
    
    return redirect('/login');
  } catch (error) {
    console.error('Error en rootLoader:', error);
    return redirect('/login');
  }
}

// ============= ADMIN LOADERS =============

// Loader para AdminDashboard - obtener métricas del dashboard
async function adminDashboardLoader() {
  const user = await getUserFromToken();
  if (!user) throw redirect('/login');
  
  // Validar que el usuario sea admin
  if (user.role !== 'admin') {
    console.warn('Intento de acceso no autorizado a admin dashboard', {
      userId: user.id,
      role: user.role
    });
    throw redirect(`/${user.role}/dashboard`);
  }

  try {
    const summary = await fetchAPI('/dashboard/summary');
    return { user, summary };
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    throw error;
  }
}

// Loader para ClientsPage - obtener lista de clientes
async function clientsPageLoader() {
  const user = await getUserFromToken();
  if (!user) throw redirect('/login');
  
  // Validar que el usuario sea admin
  if (user.role !== 'admin') {
    console.warn('Intento de acceso no autorizado a clients page', {
      userId: user.id,
      role: user.role
    });
    throw redirect(`/${user.role}/dashboard`);
  }

  try {
    const clients = await fetchAPI('/clients');
    return { user, clients };
  } catch (error) {
    console.error('Error loading clients:', error);
    throw error;
  }
}

// Action para ClientsPage - crear, actualizar y eliminar clientes
async function clientsPageAction({ request }: ActionFunctionArgs) {
  const user = await getUserFromToken();
  if (!user) throw redirect('/login');

  const formData = await request.formData();
  const intent = formData.get('intent'); // 'create', 'update', 'delete', 'reactivate'

  try {
    switch (intent) {
      case 'create': {
        const clientData = {
          name: formData.get('name'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          address: formData.get('address'),
          specialty: formData.get('specialty'),
        };
        const createdClient = await fetchAPI('/clients', {
          method: 'POST',
          body: JSON.stringify(clientData),
        });
        return {
          success: true,
          message: 'Cliente creado correctamente',
          createdClient: createdClient ? { id: createdClient.id, name: createdClient.name } : undefined,
        };
      }
      
      case 'update': {
        const id = formData.get('id');
        const clientData = {
          name: formData.get('name'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          address: formData.get('address'),
          specialty: formData.get('specialty'),
        };
        await fetchAPI(`/clients/${id}`, {
          method: 'PUT',
          body: JSON.stringify(clientData),
        });
        return { success: true, message: 'Cliente actualizado correctamente' };
      }
      
      case 'delete': {
        const id = formData.get('id');
        const result = await fetchAPI(`/clients/${id}`, {
          method: 'DELETE',
        });
        
        if (result?.deactivated) {
          return { 
            success: true, 
            message: 'Cliente desactivado correctamente (tiene proyectos vinculados)',
            warning: true 
          };
        }
        return { success: true, message: 'Cliente eliminado correctamente' };
      }
      
      case 'reactivate': {
        const id = formData.get('id');
        await fetchAPI(`/clients/${id}/reactivate`, {
          method: 'POST',
        });
        return { success: true, message: 'Cliente reactivado correctamente' };
      }
      
      default:
        throw new Response('Acción no válida', { status: 400 });
    }
  } catch (error: any) {
    // Solo loguear errores inesperados, no errores de validación
    const isValidationError = error.validationErrors && Array.isArray(error.validationErrors) && error.validationErrors.length > 0;
    if (!isValidationError) {
      console.error('Error in clients action:', error);
    }
    
    let message = 'Error al procesar la solicitud';
    let fieldErrors: Record<string, string> = {};
    
    if (error instanceof Error) {
      message = error.message;
    }
    
    // Extraer errores de validación si existen
    if (error.validationErrors && Array.isArray(error.validationErrors)) {
      error.validationErrors.forEach((err: { field: string; message: string }) => {
        fieldErrors[err.field] = err.message;
      });
    }
    
    return { 
      success: false, 
      message,
      fieldErrors
    };
  }
}

// Loader para ProjectsPage - obtener proyectos, clientes y usuarios
async function projectsPageLoader() {
  const user = await getUserFromToken();
  if (!user) throw redirect('/login');
  
  // Validar que el usuario sea admin
  if (user.role !== 'admin') {
    console.warn('Intento de acceso no autorizado a projects page', {
      userId: user.id,
      role: user.role
    });
    throw redirect(`/${user.role}/dashboard`);
  }

  try {
    const [projects, clients, users] = await Promise.all([
      fetchAPI('/projects'),
      fetchAPI('/clients'),
      fetchAPI('/users'),
    ]);
    return { user, projects, clients, users };
  } catch (error) {
    console.error('Error loading projects:', error);
    throw error;
  }
}

// Action para ProjectsPage - crear, actualizar, eliminar y asignar usuarios
async function projectsPageAction({ request }: ActionFunctionArgs) {
  const user = await getUserFromToken();
  if (!user) throw redirect('/login');

  const formData = await request.formData();
  const intent = formData.get('intent'); // 'create', 'update', 'delete', 'assign'

  try {
    switch (intent) {
      case 'create': {
        const projectData = {
          name: formData.get('name'),
          client_id: Number(formData.get('client_id')),
          status: formData.get('status'),
          assigned_supervisor_id: formData.get('assigned_supervisor_id') 
            ? Number(formData.get('assigned_supervisor_id')) 
            : null,
          assigned_client_id: formData.get('assigned_client_id') 
            ? Number(formData.get('assigned_client_id')) 
            : null,
        };
        await fetchAPI('/projects', {
          method: 'POST',
          body: JSON.stringify(projectData),
        });
        return { success: true, message: 'Proyecto creado correctamente' };
      }
      
      case 'update': {
        const id = formData.get('id');
        const projectData = {
          name: formData.get('name'),
          client_id: Number(formData.get('client_id')),
          status: formData.get('status'),
          assigned_supervisor_id: formData.get('assigned_supervisor_id') 
            ? Number(formData.get('assigned_supervisor_id')) 
            : null,
          assigned_client_id: formData.get('assigned_client_id') 
            ? Number(formData.get('assigned_client_id')) 
            : null,
        };
        await fetchAPI(`/projects/${id}`, {
          method: 'PUT',
          body: JSON.stringify(projectData),
        });
        return { success: true, message: 'Proyecto actualizado correctamente' };
      }
      
      case 'delete': {
        const id = formData.get('id');
        const response = await fetchAPI(`/projects/${id}`, {
          method: 'DELETE',
        });
        // El backend devuelve si fue desactivado o eliminado
        const message = response.deactivated 
          ? 'Proyecto desactivado correctamente' 
          : 'Proyecto eliminado permanentemente';
        return { success: true, message };
      }
      
      case 'reactivate': {
        const id = formData.get('id');
        await fetchAPI(`/projects/${id}/reactivate`, {
          method: 'PATCH',
        });
        return { success: true, message: 'Proyecto reactivado correctamente' };
      }
      
      case 'assign': {
        const projectId = formData.get('projectId');
        const userIdsStr = formData.get('userIds');
        const userIds = userIdsStr ? JSON.parse(userIdsStr as string) : [];
        
        await fetchAPI(`/projects/${projectId}/users`, {
          method: 'POST',
          body: JSON.stringify({ userIds }),
        });
        return { success: true, message: 'Usuarios asignados correctamente' };
      }
      
      default:
        throw new Response('Acción no válida', { status: 400 });
    }
  } catch (error: any) {
    // Solo loguear errores inesperados, no errores de validación
    const isValidationError = error.validationErrors && Array.isArray(error.validationErrors) && error.validationErrors.length > 0;
    if (!isValidationError) {
      console.error('Error in projects action:', error);
    }
    
    let message = 'Error al procesar la solicitud';
    let fieldErrors: Record<string, string> = {};
    
    if (error instanceof Error) {
      message = error.message;
    }
    
    // Extraer errores de validación si existen
    if (error.validationErrors && Array.isArray(error.validationErrors)) {
      error.validationErrors.forEach((err: { field: string; message: string }) => {
        fieldErrors[err.field] = err.message;
      });
    }
    
    return { 
      success: false, 
      message,
      fieldErrors
    };
  }
}

// Loader para UsersPage - obtener lista de usuarios y clientes
async function usersPageLoader() {
  const user = await getUserFromToken();
  if (!user) throw redirect('/login');
  
  // Validar que el usuario sea admin
  if (user.role !== 'admin') {
    console.warn('Intento de acceso no autorizado a users page', {
      userId: user.id,
      role: user.role
    });
    throw redirect(`/${user.role}/dashboard`);
  }

  try {
    const [users, clients] = await Promise.all([
      fetchAPI('/users'),
      fetchAPI('/clients')
    ]);
    return { user, users, clients };
  } catch (error) {
    console.error('Error loading users:', error);
    throw error;
  }
}

// Action para UsersPage - crear, actualizar y eliminar usuarios
async function usersPageAction({ request }: ActionFunctionArgs) {
  const user = await getUserFromToken();
  if (!user) throw redirect('/login');

  const formData = await request.formData();
  const intent = formData.get('intent'); // 'create', 'update', 'delete'

  try {
    switch (intent) {
      case 'create': {
        const role = formData.get('role');
        let clientId = formData.get('client_id');

        if (role === 'client') {
          if (clientId === '__new__') {
            const clientName = formData.get('client_create_name');
            if (!clientName || String(clientName).trim() === '') {
              return {
                success: false,
                message: 'Debes ingresar el nombre de la empresa cliente',
                fieldErrors: { client_create_name: 'El nombre de la empresa es obligatorio' },
              };
            }

            const clientData = {
              name: clientName,
              email: formData.get('client_create_email'),
              phone: formData.get('client_create_phone'),
              address: formData.get('client_create_address'),
              specialty: formData.get('client_create_specialty'),
            };

            const createdClient = await fetchAPI('/clients', {
              method: 'POST',
              body: JSON.stringify(clientData),
            });

            clientId = createdClient?.id ? String(createdClient.id) : null;
          }
        } else {
          clientId = null;
        }

        const userData = {
          first_name: formData.get('first_name'),
          last_name: formData.get('last_name'),
          email: formData.get('email'),
          password: formData.get('password'),
          role,
          client_id: clientId ? Number(clientId) : null,
        };
        await fetchAPI('/users', {
          method: 'POST',
          body: JSON.stringify(userData),
        });
        return { success: true, message: 'Usuario creado correctamente' };
      }
      
      case 'update': {
        const id = formData.get('id');
        const userData: Partial<User> = {
          first_name: formData.get('first_name') as string,
          last_name: formData.get('last_name') as string,
          email: formData.get('email') as string,
          role: formData.get('role') as User['role'],
        };
        
        // Solo incluir client_id si se proporcionó
        const clientId = formData.get('client_id');
        if (clientId && clientId !== '') {
          userData.client_id = parseInt(clientId as string, 10);
        } else {
          userData.client_id = null;
        }
        
        // Solo incluir contraseña si se proporcionó
        const password = formData.get('password');
        if (password && password !== '') {
          userData.password = password as string;
        }
        
        await fetchAPI(`/users/${id}`, {
          method: 'PUT',
          body: JSON.stringify(userData),
        });
        return { success: true, message: 'Usuario actualizado correctamente' };
      }
      
      case 'delete': {
        const id = formData.get('id');
        await fetchAPI(`/users/${id}`, {
          method: 'DELETE',
        });
        return { success: true, message: 'Usuario eliminado correctamente' };
      }
      
      default:
        throw new Response('Acción no válida', { status: 400 });
    }
  } catch (error: any) {
    // Solo loguear errores inesperados, no errores de validación
    const isValidationError = error.validationErrors && Array.isArray(error.validationErrors) && error.validationErrors.length > 0;
    if (!isValidationError) {
      console.error('Error in users action:', error);
    }
    
    let message = 'Error al procesar la solicitud';
    let fieldErrors: Record<string, string> = {};
    
    if (error instanceof Error) {
      message = error.message;
    }
    
    // Extraer errores de validación si existen
    if (error.validationErrors && Array.isArray(error.validationErrors)) {
      error.validationErrors.forEach((err: { field: string; message: string }) => {
        fieldErrors[err.field] = err.message;
      });
    }
    
    return { 
      success: false, 
      message,
      fieldErrors
    };
  }
}

// Loader para UserHistoryPage - obtener usuario y su historial
async function userHistoryPageLoader({ params }: LoaderFunctionArgs) {
  const user = await getUserFromToken();
  if (!user) throw redirect('/login');

  try {
    const { userId } = params;
    const [userData, history] = await Promise.all([
      fetchAPI(`/users/${userId}`),
      fetchAPI(`/scaffolds/user-history/${userId}`),
    ]);
    return { user, userData, history };
  } catch (error) {
    console.error('Error loading user history:', error);
    throw error;
  }
}

// Loader para ScaffoldsPage - obtener proyectos
async function scaffoldsPageLoader() {
  console.log('[scaffoldsPageLoader] START - Checking authentication');
  const user = await getUserFromToken();
  if (!user) throw redirect('/login');

  try {
    const projects = await fetchAPI('/projects');
    return { user, projects };
  } catch (error) {
    console.error('Error loading scaffolds page:', error);
    throw error;
  }
}

// ============= SUPERVISOR LOADERS =============

// Loader para SupervisorDashboard - obtener proyectos asignados
async function supervisorDashboardLoader() {
  const user = await getUserFromToken();
  if (!user) throw redirect('/login');
  
  // Validar que el usuario sea supervisor
  if (user.role !== 'supervisor') {
    console.warn('Intento de acceso no autorizado a supervisor dashboard', {
      userId: user.id,
      role: user.role
    });
    throw redirect(`/${user.role}/dashboard`);
  }

  try {
    const projects = await fetchAPI('/projects/');
    return { user, projects };
  } catch (error) {
    console.error('Error loading supervisor dashboard:', error);
    throw error;
  }
}

// Loader para ProjectScaffoldsPage - obtener proyecto y andamios
async function projectScaffoldsPageLoader({ params }: LoaderFunctionArgs) {
  const user = await getUserFromToken();
  if (!user) throw redirect('/login');

  try {
    const { projectId } = params;
    const [project, scaffolds] = await Promise.all([
      fetchAPI(`/projects/${projectId}`),
      fetchAPI(`/scaffolds/project/${projectId}`),
    ]);
    return { user, project, scaffolds };
  } catch (error) {
    console.error('Error loading project scaffolds:', error);
    throw error;
  }
}

// Loader para CreateScaffoldPage - obtener proyecto
async function createScaffoldPageLoader({ params }: LoaderFunctionArgs) {
  const user = await getUserFromToken();
  if (!user) throw redirect('/login');

  try {
    const { projectId } = params;
    const project = await fetchAPI(`/projects/${projectId}`);
    return { user, project };
  } catch (error) {
    console.error('Error loading create scaffold page:', error);
    throw error;
  }
}

// Action para CreateScaffoldPage - crear andamio con FormData (incluye archivos)
async function createScaffoldPageAction({ request, params }: ActionFunctionArgs) {
  const user = await getUserFromToken();
  if (!user) throw redirect('/login');

  try {
    const formData = await request.formData();
    const { projectId } = params;
    
    // No recrear FormData - usar el original que ya tiene la imagen
    // Solo verificar que la imagen esté presente
    const assemblyImage = formData.get('assembly_image');
    if (!assemblyImage || !(assemblyImage instanceof File)) {
      return {
        success: false,
        message: 'La imagen de montaje es obligatoria'
      };
    }
    
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/scaffolds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // No establecer Content-Type para que el navegador lo haga con boundary
      },
      body: formData, // Usar FormData original directamente
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend error:', errorData);
      throw new Error(errorData.error || errorData.message || 'Error al crear el andamio');
    }
    
    // Redirigir según el rol del usuario
    const userRole = user?.role;
    const redirectUrl = userRole === 'admin' 
      ? `/admin/scaffolds?projectId=${projectId}`
      : `/supervisor/project/${projectId}`;
    
    return redirect(redirectUrl);
  } catch (error: unknown) {
    console.error('Error in create scaffold action:', error);
    const message = error instanceof Error ? error.message : 'Error al crear el andamio';
    return { 
      success: false, 
      message
    };
  }
}

// Loader para HistoryPage - obtener historial del supervisor
async function historyPageLoader() {
  const user = await getUserFromToken();
  if (!user) throw redirect('/login');

  try {
    const history = await fetchAPI('/scaffolds/my-history');
    return { user, history };
  } catch (error) {
    console.error('Error loading history:', error);
    throw error;
  }
}

// ============= CLIENT LOADERS =============

// Loader para ClientDashboard - obtener proyectos asignados
async function clientDashboardLoader() {
  const user = await getUserFromToken();
  if (!user) throw redirect('/login');
  
  // Validar que el usuario sea client
  if (user.role !== 'client') {
    console.warn('Intento de acceso no autorizado a client dashboard', {
      userId: user.id,
      role: user.role
    });
    throw redirect(`/${user.role}/dashboard`);
  }

  try {
    const projects = await fetchAPI('/projects/');
    return { user, projects };
  } catch (error) {
    console.error('Error loading client dashboard:', error);
    throw error;
  }
}

// Loader para ClientProjectScaffoldsPage - obtener proyecto, andamios y métricas
async function clientProjectScaffoldsPageLoader({ params }: LoaderFunctionArgs) {
  const user = await getUserFromToken();
  if (!user) throw redirect('/login');

  try {
    const { projectId } = params;
    const [project, scaffolds, summary] = await Promise.all([
      fetchAPI(`/projects/${projectId}`),
      fetchAPI(`/scaffolds/project/${projectId}`),
      fetchAPI(`/dashboard/project/${projectId}`),
    ]);
    return { user, project, scaffolds, summary };
  } catch (error) {
    console.error('Error loading client project scaffolds:', error);
    throw error;
  }
}

// Loader para la galería de fotos - admin
async function adminProjectGalleryLoader({ params }: LoaderFunctionArgs) {
  const user = await getUserFromToken();
  if (!user) throw redirect('/login');

  if (user.role !== 'admin') {
    console.warn('Intento de acceso no autorizado a galería admin', {
      userId: user.id,
      role: user.role,
    });
    throw redirect(`/${user.role}/dashboard`);
  }

  try {
    const { projectId } = params;
    const [project, scaffolds] = await Promise.all([
      fetchAPI(`/projects/${projectId}`),
      fetchAPI(`/scaffolds/project/${projectId}`),
    ]);
    return { user, project, scaffolds };
  } catch (error) {
    console.error('Error loading admin project gallery:', error);
    throw error;
  }
}

// Loader para la galería de fotos - client
async function clientProjectGalleryLoader({ params }: LoaderFunctionArgs) {
  const user = await getUserFromToken();
  if (!user) throw redirect('/login');

  if (user.role !== 'client') {
    console.warn('Intento de acceso no autorizado a galería cliente', {
      userId: user.id,
      role: user.role,
    });
    throw redirect(`/${user.role}/dashboard`);
  }

  try {
    const { projectId } = params;
    const [project, scaffolds] = await Promise.all([
      fetchAPI(`/projects/${projectId}`),
      fetchAPI(`/scaffolds/project/${projectId}`),
    ]);
    return { user, project, scaffolds };
  } catch (error) {
    console.error('Error loading client project gallery:', error);
    throw error;
  }
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/',
    loader: rootLoader,
    errorElement: <ErrorPage />,
  },
  {
    path: '/admin',
    element: <AppLayout />,
    loader: protectedLoader,
    errorElement: <ErrorPage />,
    children: [
      {
        path: 'dashboard',
        element: <AdminDashboard />,
        loader: adminDashboardLoader,
      },
      {
        path: 'clients',
        element: <ClientsPage />,
        loader: clientsPageLoader,
        action: clientsPageAction,
      },
      {
        path: 'projects',
        element: <ProjectsPage />,
        loader: projectsPageLoader,
        action: projectsPageAction,
      },
      {
        path: 'users',
        element: <UsersPage />,
        loader: usersPageLoader,
        action: usersPageAction,
      },
      {
        path: 'users/:userId/history',
        element: <UserHistoryPage />,
        loader: userHistoryPageLoader,
      },
      {
        path: 'users/new',
        element: <UserFormPage />,
      },
      {
        path: 'users/edit/:id',
        element: <UserFormPage />,
      },
      {
        path: 'scaffolds',
        element: <ScaffoldsPage />,
        loader: scaffoldsPageLoader,
      },
      {
        path: 'project/:projectId/gallery',
        element: <ProjectGalleryPage />,
        loader: adminProjectGalleryLoader,
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,
      },
      {
        path: 'project/:projectId/create-scaffold',
        element: <CreateScaffoldPage />,
        loader: createScaffoldPageLoader,
        action: createScaffoldPageAction,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: '/supervisor',
    element: <AppLayout />,
    loader: protectedLoader,
    errorElement: <ErrorPage />,
    children: [
      {
        path: 'dashboard',
        element: <SupervisorDashboard />,
        loader: supervisorDashboardLoader,
      },
      {
        path: 'project/:projectId',
        element: <ProjectScaffoldsPage />,
        loader: projectScaffoldsPageLoader,
      },
      {
        path: 'project/:projectId/create-scaffold',
        element: <CreateScaffoldPage />,
        loader: createScaffoldPageLoader,
        action: createScaffoldPageAction,
      },
      {
        path: 'scaffold/:scaffoldId/disassemble',
        element: <DisassembleScaffoldPage />,
      },
      {
        path: 'history',
        element: <HistoryPage />,
        loader: historyPageLoader,
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: '/client',
    element: <AppLayout />,
    loader: protectedLoader,
    errorElement: <ErrorPage />,
    children: [
      {
        path: 'dashboard',
        element: <ClientDashboard />,
        loader: clientDashboardLoader,
      },
      {
        path: 'project/:projectId',
        element: <ClientProjectScaffoldsPage />,
        loader: clientProjectScaffoldsPageLoader,
      },
      {
        path: 'project/:projectId/gallery',
        element: <ProjectGalleryPage />,
        loader: clientProjectGalleryLoader,
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
], {
  future: {
    v7_partialHydration: false, // Desactivar hydration para CSR (client-side rendering)
  },
});
