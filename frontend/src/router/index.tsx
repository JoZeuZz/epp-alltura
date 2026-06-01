/* eslint-disable react-refresh/only-export-components */
import { lazy } from 'react';
import { createBrowserRouter, redirect } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import type { NavItem } from '@jozeuzz/alltura-ui';
import LoginPage from '../pages/LoginPage';
import ErrorPage from '../components/ErrorPage';
import type { User } from '../types/api';
import { clearStoredTokens, refreshAccessToken, isHttpAuthError, loaderHttpClient } from '@jozeuzz/alltura-ui';
import NotificationBell from '../components/NotificationBell';
import logoWhite from '../assets/logo-alltura-white.png';

const EppIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 3v5c0 4.97-3.05 8.88-7 10-3.95-1.12-7-5.03-7-10V6l7-3z" />
  </svg>
);
const EquiposIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8zm5-4h6a2 2 0 012 2v2H7V6a2 2 0 012-2z" />
  </svg>
);
const HerramientasIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a1 1 0 010 1.4l-2.3 2.3a3 3 0 01-4.2 4.2l-4.8 4.8 1.4 1.4 4.8-4.8a3 3 0 004.2-4.2l2.3-2.3a1 1 0 011.4 0l1.4 1.4-1.4 1.4" />
  </svg>
);
const TrabajadoresIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.655-.084-1.289-.241-1.892M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.655.084-1.289.241-1.892m0 0a5.002 5.002 0 019.518 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const UsuariosIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.655-.084-1.289-.241-1.892M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.655.084-1.289.241-1.892m0 0a5.002 5.002 0 019.518 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM6 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
const ProyectosIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M6 7v13m6-13v13m6-13v13M4 20h16" />
  </svg>
);
const BodegasIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const DashboardIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const TrazabilidadIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const navItems: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon />,
    roles: ['admin', 'supervisor'],
  },
  {
    label: 'Inventario',
    children: [
      { to: '/inventario/epp', label: 'EPP', icon: <EppIcon />, roles: ['admin', 'supervisor'] },
      { to: '/inventario/equipos', label: 'Equipos', icon: <EquiposIcon />, roles: ['admin', 'supervisor'] },
      { to: '/inventario/herramientas', label: 'Herramientas', icon: <HerramientasIcon />, roles: ['admin', 'supervisor'] },
    ],
  },
  {
    label: 'Personal',
    children: [
      { to: '/trabajadores', label: 'Trabajadores', icon: <TrabajadoresIcon />, roles: ['admin', 'supervisor'] },
      { to: '/admin/users', label: 'Usuarios del Sistema', icon: <UsuariosIcon />, roles: ['admin'] },
    ],
  },
  {
    label: 'Operaciones',
    children: [
      { to: '/ubicacion/proyectos', label: 'Proyectos', icon: <ProyectosIcon />, roles: ['admin', 'supervisor'] },
      { to: '/ubicacion/bodegas', label: 'Bodegas', icon: <BodegasIcon />, roles: ['admin', 'supervisor'] },
    ],
  },
  {
    label: 'Reportes',
    children: [
      { to: '/trazabilidad', label: 'Trazabilidad', icon: <TrazabilidadIcon />, roles: ['admin', 'supervisor'] },
    ],
  },
];

const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const UsersPage = lazy(() => import('../pages/admin/UsersPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const UnauthorizedPage = lazy(() => import('../pages/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const PublicSignPage = lazy(() => import('../pages/PublicSignPage'));
const AdminTrabajadoresPage = lazy(() => import('../pages/admin/AdminTrabajadoresPage'));
const AdminInventoryEppPage = lazy(() => import('../pages/admin/inventory/AdminInventoryEppPage'));
const AdminInventoryEquiposPage = lazy(() => import('../pages/admin/inventory/AdminInventoryEquiposPage'));
const AdminInventoryHerramientasPage = lazy(
  () => import('../pages/admin/inventory/AdminInventoryHerramientasPage')
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

async function rootLoader() {
  const user = await getUserFromToken();
  if (!user) {
    return redirect('/login');
  }
  return redirect('/dashboard');
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

async function dashboardLoader() {
  const { user } = (await requireRole(['admin', 'supervisor'])()) as { user: User };
  const [summary, stock, movimientosActivo] = await Promise.all([
    loaderGetOrThrow('/dashboard/summary'),
    loaderGetOrThrow('/inventario/stock'),
    loaderGetOrThrow('/inventario/movimientos-activo?limit=25'),
  ]);
  return { user, summary, stock, movimientosActivo };
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
    element: <AppLayout navItems={navItems} logoSrc={logoWhite} notificationBell={<NotificationBell variant="dark" />} />,
    loader: protectedLoader,
    errorElement: <ErrorPage />,
    children: [
      // ── Shared pages (admin + supervisor) ──────────────────────────────────
      {
        path: 'dashboard',
        loader: dashboardLoader,
        element: <AdminDashboard key="dashboard" />,
      },
      {
        path: 'trazabilidad',
        loader: dashboardLoader,
        element: <AdminDashboard key="trazabilidad" />,
      },
      {
        path: 'trabajadores',
        loader: requireRole(['admin', 'supervisor']),
        element: <AdminTrabajadoresPage />,
      },
      {
        path: 'ubicacion/proyectos',
        loader: requireRole(['admin', 'supervisor']),
        element: <AdminProyectosPage />,
      },
      {
        path: 'ubicacion/bodegas',
        loader: requireRole(['admin', 'supervisor']),
        element: <AdminBodegasPage />,
      },
      {
        path: 'inventario',
        loader: () => redirect('/inventario/herramientas'),
      },
      {
        path: 'inventario/epp',
        loader: requireRole(['admin', 'supervisor']),
        element: <AdminInventoryEppPage />,
      },
      {
        path: 'inventario/equipos',
        loader: requireRole(['admin', 'supervisor']),
        element: <AdminInventoryEquiposPage />,
      },
      {
        path: 'inventario/herramientas',
        loader: requireRole(['admin', 'supervisor']),
        element: <AdminInventoryHerramientasPage />,
      },
      // ── Admin-only pages ───────────────────────────────────────────────────
      {
        path: 'admin/users',
        loader: requireRole(['admin']),
        element: <UsersPage />,
      },
      // ── Authenticated-only pages ───────────────────────────────────────────
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
      // ── Backward-compat redirects ──────────────────────────────────────────
      { path: 'admin/dashboard',               loader: () => redirect('/dashboard') },
      { path: 'admin/trazabilidad',            loader: () => redirect('/trazabilidad') },
      { path: 'admin/trabajadores',            loader: () => redirect('/trabajadores') },
      { path: 'admin/ubicaciones',             loader: () => redirect('/ubicacion/bodegas') },
      { path: 'admin/ubicacion/proyectos',     loader: () => redirect('/ubicacion/proyectos') },
      { path: 'admin/ubicacion/bodegas',       loader: () => redirect('/ubicacion/bodegas') },
      { path: 'admin/inventario',              loader: () => redirect('/inventario/herramientas') },
      { path: 'admin/inventario/epp',          loader: () => redirect('/inventario/epp') },
      { path: 'admin/inventario/equipos',      loader: () => redirect('/inventario/equipos') },
      { path: 'admin/inventario/herramientas', loader: () => redirect('/inventario/herramientas') },
      { path: 'supervisor/dashboard',          loader: () => redirect('/dashboard') },
      { path: 'supervisor/trazabilidad',       loader: () => redirect('/trazabilidad') },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
