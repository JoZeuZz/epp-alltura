import { lazy } from 'react';
import { createBrowserRouter, redirect } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import LoginPage from '../pages/LoginPage';
import ErrorPage from '../components/ErrorPage';
import type { User } from '../types/api';
import { clearStoredTokens, refreshAccessToken } from '../services/authRefresh';

const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const UsersPage = lazy(() => import('../pages/admin/UsersPage'));
const SupervisorDashboard = lazy(() => import('../pages/supervisor/SupervisorDashboard'));
const WarehouseDashboard = lazy(() => import('../pages/bodega/WarehouseDashboard'));
const WorkerDashboard = lazy(() => import('../pages/worker/WorkerDashboard'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const UnauthorizedPage = lazy(() => import('../pages/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

const API_URL = '/api';

function getAuthToken() {
  return localStorage.getItem('accessToken');
}

async function fetchAPI(endpoint: string, options: RequestInit = {}, allowRetry = true) {
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
        return fetchAPI(endpoint, options, false);
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
      // Ignore parse errors and use default message.
    }

    throw new Error(message);
  }

  return response.json();
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

    return {
      id: userData.id,
      email: userData.email,
      role: userData.role,
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

const roleDefaultRoute = (role: string) => {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'supervisor':
      return '/supervisor/dashboard';
    case 'bodega':
      return '/bodega/dashboard';
    case 'worker':
    case 'client':
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
  return redirect(roleDefaultRoute(user.role as string));
}

const requireRole = (allowedRoles: string[]) => async () => {
  const user = await getUserFromToken();
  if (!user) {
    throw redirect('/login');
  }

  if (!allowedRoles.includes(user.role as string)) {
    throw redirect('/unauthorized');
  }

  return { user };
};

async function adminDashboardLoader() {
  const { user } = (await requireRole(['admin'])()) as { user: User };
  try {
    const summary = await fetchAPI('/dashboard/summary');
    return { user, summary };
  } catch {
    return {
      user,
      summary: {
        activeProjects: 0,
        activeClients: 0,
        totalScaffolds: 0,
        recentScaffoldsCount: 0,
      },
    };
  }
}

async function usersLoader() {
  const { user } = (await requireRole(['admin'])()) as { user: User };
  const users = await fetchAPI('/users');
  return { user, users };
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
    path: '/',
    element: <AppLayout />,
    loader: protectedLoader,
    errorElement: <ErrorPage />,
    children: [
      {
        path: 'admin/dashboard',
        loader: adminDashboardLoader,
        element: <AdminDashboard />,
      },
      {
        path: 'admin/users',
        loader: usersLoader,
        element: <UsersPage />,
      },
      {
        path: 'admin/clients',
        loader: adminDashboardLoader,
        element: <AdminDashboard />,
      },
      {
        path: 'admin/projects',
        loader: adminDashboardLoader,
        element: <AdminDashboard />,
      },
      {
        path: 'admin/scaffolds',
        loader: adminDashboardLoader,
        element: <AdminDashboard />,
      },
      {
        path: 'supervisor/dashboard',
        loader: requireRole(['supervisor']),
        element: <SupervisorDashboard />,
      },
      {
        path: 'supervisor/history',
        loader: requireRole(['supervisor']),
        element: <SupervisorDashboard />,
      },
      {
        path: 'bodega/dashboard',
        loader: requireRole(['bodega']),
        element: <WarehouseDashboard />,
      },
      {
        path: 'worker/dashboard',
        loader: requireRole(['worker', 'client']),
        element: <WorkerDashboard />,
      },
      {
        path: 'client/dashboard',
        loader: requireRole(['client']),
        element: <WorkerDashboard />,
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
