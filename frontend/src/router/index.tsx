import { lazy } from 'react';
import { createBrowserRouter, redirect } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import LoginPage from '../pages/LoginPage';
import ErrorPage from '../components/ErrorPage';
import type { User } from '../types/api';
import { clearStoredTokens, refreshAccessToken } from '../services/authRefresh';
import { isHttpAuthError, loaderHttpClient } from '../services/httpClient';

const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const UsersPage = lazy(() => import('../pages/admin/UsersPage'));
const SupervisorDashboard = lazy(() => import('../pages/supervisor/SupervisorDashboard'));
const SupervisorOperationsPage = lazy(() => import('../pages/supervisor/SupervisorOperationsPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const UnauthorizedPage = lazy(() => import('../pages/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const PublicSignPage = lazy(() => import('../pages/PublicSignPage'));
const AdminTrabajadoresPage = lazy(() => import('../pages/admin/AdminTrabajadoresPage'));
const AdminEntregasPage = lazy(() => import('../pages/admin/AdminEntregasPage'));
const AdminDevolucionesPage = lazy(() => import('../pages/admin/AdminDevolucionesPage'));
const AdminInventoryEppPage = lazy(() => import('../pages/admin/inventory/AdminInventoryEppPage'));
const AdminInventoryEquiposPage = lazy(() => import('../pages/admin/inventory/AdminInventoryEquiposPage'));
const AdminInventoryHerramientasPage = lazy(
  () => import('../pages/admin/inventory/AdminInventoryHerramientasPage')
);
const AdminInventoryArticlesPage = lazy(
  () => import('../pages/admin/inventory/AdminInventoryArticlesPage')
);
const AdminProyectosPage = lazy(() => import('../pages/admin/AdminProyectosPage'));
const AdminBodegasPage = lazy(() => import('../pages/admin/AdminBodegasPage'));

type RouteRole = 'admin' | 'supervisor';

function normalizeRole(role?: string | null): RouteRole | '' {
  if (!role) return '';
  const value = String(role).toLowerCase();

  if (value === 'admin' || value === 'supervisor') {
    return value;
  }

  return '';
}

const buildLoaderError = (endpoint: string, error: unknown) => {
  const axiosLike = error as {
    response?: {
      status?: number;
      data?: { message?: string; requestId?: string };
      headers?: Record<string, string | undefined>;
    };
  };

  const status = axiosLike.response?.status;
  const responseMessage = axiosLike.response?.data?.message;
  const requestId =
    axiosLike.response?.data?.requestId ||
    axiosLike.response?.headers?.['x-request-id'] ||
    axiosLike.response?.headers?.['X-Request-Id'];

  const message = responseMessage || `No se pudo cargar ${endpoint}`;
  const withRequestId = requestId ? `${message} (requestId: ${requestId})` : message;
  const loaderError = new Error(withRequestId) as Error & { status?: number };
  if (status) {
    loaderError.status = status;
  }

  return loaderError;
};


async function loaderGetOrThrow<T>(endpoint: string): Promise<T> {
  try {
    return await loaderHttpClient.get<T>(endpoint);
  } catch (error) {
    if (isHttpAuthError(error)) {
      throw redirect('/login');
    }
    throw buildLoaderError(endpoint, error);
  }
}

async function getUserFromToken(): Promise<Pick<User, 'id' | 'email' | 'role' | 'first_name' | 'last_name'> | null> {
  let token = localStorage.getItem('accessToken');
  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expired = payload.exp && payload.exp * 1000 < Date.now();
    if (expired) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        clearStoredTokens();
        return null;
      }
      token = refreshed;
    }

    const freshPayload = JSON.parse(atob(token.split('.')[1]));
    const userData = freshPayload.user || freshPayload;
    const normalizedRole = normalizeRole(userData.role);
    if (!normalizedRole) {
      clearStoredTokens();
      return null;
    }

    return {
      id: userData.id,
      email: userData.email,
      role: normalizedRole,
      first_name: userData.first_name,
      last_name: userData.last_name,
    };
  } catch {
    clearStoredTokens();
    return null;
  }
}

async function protectedLoader() {
  const user = await getUserFromToken();
  if (!user) {
    throw redirect('/login');
  }
  return { user };
}

const roleDefaultRoute = (role: User['role']) => {
  switch (normalizeRole(role)) {
    case 'admin':
      return '/admin/dashboard';
    case 'supervisor':
      return '/supervisor/dashboard';
    default:
      return '/login';
  }
};

async function rootLoader() {
  const user = await getUserFromToken();
  if (!user) {
    return redirect('/login');
  }
  return redirect(roleDefaultRoute(user.role));
}

const requireRole = (allowedRoles: RouteRole[]) => async () => {
  const user = await getUserFromToken();
  if (!user) {
    throw redirect('/login');
  }

  const normalizedRole = normalizeRole(user.role);
  if (!normalizedRole || !allowedRoles.includes(normalizedRole)) {
    throw redirect('/unauthorized');
  }

  return { user };
};

async function adminDashboardLoader() {
  const { user } = (await requireRole(['admin'])()) as { user: User };

  const [summary, stock, movimientosStock, movimientosActivo] = await Promise.all([
    loaderGetOrThrow('/dashboard/summary'),
    loaderGetOrThrow('/inventario/stock'),
    loaderGetOrThrow('/inventario/movimientos-stock?limit=25'),
    loaderGetOrThrow('/inventario/movimientos-activo?limit=25'),
  ]);

  return {
    user,
    summary,
    stock,
    movimientosStock,
    movimientosActivo,
  };
}

async function supervisorDashboardLoader() {
  const { user } = (await requireRole(['supervisor', 'admin'])()) as { user: User };

  const [summary, entregas, devoluciones, movimientosActivo] = await Promise.all([
    loaderGetOrThrow('/dashboard/summary'),
    loaderGetOrThrow('/entregas'),
    loaderGetOrThrow('/devoluciones'),
    loaderGetOrThrow('/inventario/movimientos-activo?limit=20'),
  ]);

  return {
    user,
    summary,
    entregas,
    devoluciones,
    movimientosActivo,
  };
}

async function supervisorOperationsLoader() {
  const { user } = (await requireRole(['admin', 'supervisor'])()) as { user: User };

  const [trabajadores, ubicaciones, articulos, entregas, devoluciones, stock, proveedores] = await Promise.all([
    loaderGetOrThrow('/trabajadores'),
    loaderGetOrThrow('/ubicaciones'),
    loaderGetOrThrow('/articulos'),
    loaderGetOrThrow('/entregas'),
    loaderGetOrThrow('/devoluciones'),
    loaderGetOrThrow('/inventario/stock'),
    loaderGetOrThrow('/proveedores'),
  ]);

  return {
    user,
    trabajadores,
    ubicaciones,
    articulos,
    entregas,
    devoluciones,
    stock,
    proveedores,
  };
}

async function adminTrabajadoresLoader() {
  return requireRole(['admin'])();
}

export const router = createBrowserRouter([
  {
    path: '/',
    loader: rootLoader,
    errorElement: <ErrorPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/firma/:token',
    element: <PublicSignPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    loader: protectedLoader,
    errorElement: <ErrorPage />,
    children: [
      {
        path: 'admin/dashboard',
        loader: adminDashboardLoader,
        element: <AdminDashboard key="admin-dashboard" />,
      },
      {
        path: 'admin/trazabilidad',
        loader: adminDashboardLoader,
        element: <AdminDashboard key="admin-trazabilidad" />,
      },
      {
        path: 'admin/users',
        loader: requireRole(['admin']),
        element: <UsersPage />,
      },
      {
        path: 'admin/trabajadores',
        loader: adminTrabajadoresLoader,
        element: <AdminTrabajadoresPage />,
      },
      {
        path: 'admin/ubicaciones',
        loader: () => redirect('/admin/ubicacion/bodegas'),
      },
      {
        path: 'admin/ubicacion/proyectos',
        loader: requireRole(['admin']),
        element: <AdminProyectosPage />,
      },
      {
        path: 'admin/ubicacion/bodegas',
        loader: requireRole(['admin']),
        element: <AdminBodegasPage />,
      },
      {
        path: 'admin/entregas',
        loader: requireRole(['admin', 'supervisor']),
        element: <AdminEntregasPage />,
      },
      {
        path: 'admin/devoluciones',
        loader: requireRole(['admin', 'supervisor']),
        element: <AdminDevolucionesPage />,
      },
      {
        path: 'admin/inventario',
        loader: () => redirect('/admin/inventario/herramientas'),
      },
      {
        path: 'admin/inventario/epp',
        loader: requireRole(['admin']),
        element: <AdminInventoryEppPage />,
      },
      {
        path: 'admin/inventario/equipos',
        loader: requireRole(['admin']),
        element: <AdminInventoryEquiposPage />,
      },
      {
        path: 'admin/inventario/herramientas',
        loader: requireRole(['admin']),
        element: <AdminInventoryHerramientasPage />,
      },
      {
        path: 'admin/inventario/articulos',
        loader: requireRole(['admin']),
        element: <AdminInventoryArticlesPage />,
      },
      {
        path: 'supervisor/dashboard',
        loader: supervisorDashboardLoader,
        element: <SupervisorDashboard key="supervisor-dashboard" />,
      },
      {
        path: 'supervisor/trazabilidad',
        loader: supervisorDashboardLoader,
        element: <SupervisorDashboard key="supervisor-trazabilidad" />,
      },
      {
        path: 'supervisor/operaciones',
        loader: supervisorOperationsLoader,
        element: <SupervisorOperationsPage key="supervisor-operaciones" />,
      },
      {
        path: 'supervisor/devoluciones',
        loader: requireRole(['admin', 'supervisor']),
        element: <AdminDevolucionesPage />,
      },
      {
        path: 'notifications',
        loader: protectedLoader,
        element: <NotificationsPage />,
      },
      {
        path: 'profile',
        loader: protectedLoader,
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
