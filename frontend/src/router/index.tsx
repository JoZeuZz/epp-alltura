import { lazy } from 'react';
import { createBrowserRouter, redirect } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import LoginPage from '../pages/LoginPage';
import ErrorPage from '../components/ErrorPage';
import type { User } from '../types/api';
import { clearStoredTokens, refreshAccessToken } from '../services/authRefresh';

const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const AdminInventoryLayout = lazy(
  () => import('../pages/admin/inventory/AdminInventoryLayout')
);
const AdminInventoryArticlesPage = lazy(
  () => import('../pages/admin/inventory/AdminInventoryArticlesPage')
);
const AdminInventoryStockPage = lazy(
  () => import('../pages/admin/inventory/AdminInventoryStockPage')
);
const AdminInventoryMovementsPage = lazy(
  () => import('../pages/admin/inventory/AdminInventoryMovementsPage')
);
const AdminInventoryIngressPage = lazy(
  () => import('../pages/admin/inventory/AdminInventoryIngressPage')
);
const AdminInventoryEgressPage = lazy(
  () => import('../pages/admin/inventory/AdminInventoryEgressPage')
);
const AdminInventoryActivosPage = lazy(
  () => import('../pages/admin/inventory/AdminInventoryActivosPage')
);
const UsersPage = lazy(() => import('../pages/admin/UsersPage'));
const SupervisorDashboard = lazy(() => import('../pages/supervisor/SupervisorDashboard'));
const WarehouseDashboard = lazy(() => import('../pages/bodega/WarehouseDashboard'));
const WorkerDashboard = lazy(() => import('../pages/worker/WorkerDashboard'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const UnauthorizedPage = lazy(() => import('../pages/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const PublicSignPage = lazy(() => import('../pages/PublicSignPage'));
const AdminTrabajadoresPage = lazy(() => import('../pages/admin/AdminTrabajadoresPage'));
const AdminUbicacionesPage = lazy(() => import('../pages/admin/AdminUbicacionesPage'));
const AdminEntregasPage = lazy(() => import('../pages/admin/AdminEntregasPage'));
const AdminDevolucionesPage = lazy(() => import('../pages/admin/AdminDevolucionesPage'));

const API_URL = '/api';
type RouteRole = 'admin' | 'supervisor' | 'bodega' | 'worker';

function getAuthToken() {
  return localStorage.getItem('accessToken');
}

function normalizeRole(role?: string | null): RouteRole | '' {
  if (!role) return '';
  const value = String(role).toLowerCase();

  if (value === 'trabajador' || value === 'worker' || value === 'client') return 'worker';
  if (value === 'admin' || value === 'supervisor' || value === 'bodega') {
    return value;
  }

  return '';
}

function unwrapResponsePayload<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}, allowRetry = true): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    if (response.status === 401 && allowRetry) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return fetchAPI<T>(endpoint, options, false);
      }
      clearStoredTokens();
      throw redirect('/login');
    }

    let message = 'Error del servidor';
    try {
      const payload = await response.json();
      if (payload?.message) {
        message = payload.message;
      }
    } catch {
      // Ignore parse errors.
    }

    throw new Error(message);
  }

  const payload = await response.json();
  return unwrapResponsePayload<T>(payload);
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
    case 'bodega':
      return '/bodega/dashboard';
    case 'worker':
      return '/worker/dashboard';
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
    fetchAPI('/dashboard/summary').catch(() => null),
    fetchAPI('/inventario/stock').catch(() => []),
    fetchAPI('/inventario/movimientos-stock?limit=25').catch(() => []),
    fetchAPI('/inventario/movimientos-activo?limit=25').catch(() => []),
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
    fetchAPI('/dashboard/summary').catch(() => null),
    fetchAPI('/entregas').catch(() => []),
    fetchAPI('/devoluciones').catch(() => []),
    fetchAPI('/inventario/movimientos-activo?limit=20').catch(() => []),
  ]);

  return {
    user,
    summary,
    entregas,
    devoluciones,
    movimientosActivo,
  };
}

async function warehouseDashboardLoader() {
  const { user } = (await requireRole(['bodega', 'admin', 'supervisor'])()) as { user: User };

  const [trabajadores, ubicaciones, articulos, entregas, devoluciones, stock, proveedores] = await Promise.all([
    fetchAPI('/trabajadores').catch(() => []),
    fetchAPI('/ubicaciones').catch(() => []),
    fetchAPI('/articulos').catch(() => []),
    fetchAPI('/entregas').catch(() => []),
    fetchAPI('/devoluciones').catch(() => []),
    fetchAPI('/inventario/stock').catch(() => []),
    fetchAPI('/proveedores').catch(() => []),
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

async function workerDashboardLoader() {
  const { user } = (await requireRole(['worker'])()) as { user: User };

  const [pendientesFirma, custodiasActivas] = await Promise.all([
    fetchAPI('/firmas/pendientes/me').catch(() => ({ entregas: [] })),
    fetchAPI('/devoluciones/mis-custodias/activos').catch(() => ({ custodias: [] })),
  ]);

  return {
    user,
    pendientesFirma,
    custodiasActivas,
  };
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
        loader: requireRole(['admin']),
        element: <AdminUbicacionesPage />,
      },
      {
        path: 'admin/entregas',
        loader: requireRole(['admin', 'supervisor', 'bodega']),
        element: <AdminEntregasPage />,
      },
      {
        path: 'admin/devoluciones',
        loader: requireRole(['admin', 'bodega']),
        element: <AdminDevolucionesPage />,
      },
      {
        path: 'admin/inventario',
        loader: requireRole(['admin']),
        element: <AdminInventoryLayout />,
        children: [
          {
            index: true,
            loader: () => redirect('/admin/inventario/articulos'),
          },
          {
            path: 'articulos',
            element: <AdminInventoryArticlesPage />,
          },
          {
            path: 'stock',
            element: <AdminInventoryStockPage />,
          },
          {
            path: 'movimientos',
            element: <AdminInventoryMovementsPage />,
          },
          {
            path: 'ingresos',
            element: <AdminInventoryIngressPage />,
          },
          {
            path: 'egresos',
            element: <AdminInventoryEgressPage />,
          },
          {
            path: 'activos',
            element: <AdminInventoryActivosPage />,
          },
        ],
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
        path: 'bodega/dashboard',
        loader: warehouseDashboardLoader,
        element: <WarehouseDashboard key="bodega-dashboard" />,
      },
      {
        path: 'bodega/operaciones',
        loader: warehouseDashboardLoader,
        element: <WarehouseDashboard key="bodega-operaciones" />,
      },
      {
        path: 'bodega/devoluciones',
        loader: requireRole(['admin', 'bodega']),
        element: <AdminDevolucionesPage />,
      },
      {
        path: 'worker/dashboard',
        loader: workerDashboardLoader,
        element: <WorkerDashboard key="worker-dashboard" />,
      },
      {
        path: 'worker/firmas',
        loader: workerDashboardLoader,
        element: <WorkerDashboard key="worker-firmas" />,
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
