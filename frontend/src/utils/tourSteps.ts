export type TourRole = 'admin' | 'supervisor' | 'bodega' | 'worker';

export interface TourStep {
  id: string;
  role: TourRole;
  route?: string;
  selector?: string;
  title: string;
  body: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  mobilePlacement?: 'bottom' | 'center' | 'top';
  highlightPadding?: number;
  autoNavigate?: boolean;
}

export const TOUR_VERSION = 'v2';

const normalizePath = (path: string) => {
  if (!path) return '/';
  const trimmed = path.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
};

export const matchTourRoute = (pathname: string, route?: string) => {
  if (!route || route === '*') return true;
  const cleanPath = normalizePath(pathname);
  const cleanRoute = normalizePath(route);
  if (cleanRoute.includes(':')) {
    const pattern = `^${cleanRoute.replace(/:[^/]+/g, '[^/]+')}$`;
    return new RegExp(pattern).test(cleanPath);
  }
  return cleanPath === cleanRoute;
};

export const onboardingStepsByRole: Record<TourRole, TourStep[]> = {
  admin: [
    {
      id: 'admin-dashboard-root',
      role: 'admin',
      route: '/admin/dashboard',
      selector: '[data-tour="admin-dashboard-root"]',
      title: 'Dashboard EPP',
      body: 'Aquí tienes los KPIs operativos de inventario, entregas, devoluciones y firmas.',
      placement: 'bottom',
    },
    {
      id: 'admin-trazabilidad',
      role: 'admin',
      route: '/admin/trazabilidad',
      title: 'Trazabilidad',
      body: 'Revisa movimientos de stock y activos para auditoría operacional.',
      placement: 'center',
      mobilePlacement: 'bottom',
    },
    {
      id: 'admin-auditoria',
      role: 'admin',
      route: '/admin/auditoria',
      title: 'Auditoría',
      body: 'Consulta eventos y acciones de usuarios para seguimiento de cumplimiento.',
      placement: 'center',
      mobilePlacement: 'bottom',
    },
    {
      id: 'admin-tour-launcher',
      role: 'admin',
      route: '*',
      selector: '[data-tour="tour-launcher"]',
      title: 'Guía contextual',
      body: 'Este botón permite reabrir la guía según la pantalla actual.',
      placement: 'top',
      mobilePlacement: 'top',
    },
  ],
  supervisor: [
    {
      id: 'supervisor-dashboard',
      role: 'supervisor',
      route: '/supervisor/dashboard',
      title: 'Seguimiento supervisor',
      body: 'Controla entregas, devoluciones y movimientos recientes por cuadrilla.',
      placement: 'center',
      mobilePlacement: 'bottom',
    },
    {
      id: 'supervisor-trazabilidad',
      role: 'supervisor',
      route: '/supervisor/trazabilidad',
      title: 'Trazabilidad de operación',
      body: 'Valida estados de activos y evolución de movimientos críticos.',
      placement: 'center',
      mobilePlacement: 'bottom',
    },
    {
      id: 'supervisor-tour-launcher',
      role: 'supervisor',
      route: '*',
      selector: '[data-tour="tour-launcher"]',
      title: 'Guía contextual',
      body: 'Puedes reabrir la ayuda operativa cuando la necesites.',
      placement: 'top',
      mobilePlacement: 'top',
    },
  ],
  bodega: [
    {
      id: 'bodega-dashboard',
      role: 'bodega',
      route: '/bodega/dashboard',
      title: 'Operación de bodega',
      body: 'Desde aquí gestionas entregas, firmas, devoluciones y stock.',
      placement: 'center',
      mobilePlacement: 'bottom',
    },
    {
      id: 'bodega-operaciones',
      role: 'bodega',
      route: '/bodega/operaciones',
      title: 'Entregas y devoluciones',
      body: 'Crea borradores, confirma flujos y consulta trazabilidad de custodia.',
      placement: 'center',
      mobilePlacement: 'bottom',
    },
    {
      id: 'bodega-tour-launcher',
      role: 'bodega',
      route: '*',
      selector: '[data-tour="tour-launcher"]',
      title: 'Guía contextual',
      body: 'Accede a una guía rápida para cada pantalla operativa.',
      placement: 'top',
      mobilePlacement: 'top',
    },
  ],
  worker: [
    {
      id: 'worker-dashboard',
      role: 'worker',
      route: '/worker/dashboard',
      title: 'Mis activos en custodia',
      body: 'Consulta tu custodia activa y estado de asignaciones.',
      placement: 'center',
      mobilePlacement: 'bottom',
    },
    {
      id: 'worker-signatures',
      role: 'worker',
      route: '/worker/firmas',
      title: 'Firmas pendientes',
      body: 'Completa firma de recepción por dispositivo o token cuando corresponda.',
      placement: 'center',
      mobilePlacement: 'bottom',
    },
    {
      id: 'worker-tour-launcher',
      role: 'worker',
      route: '*',
      selector: '[data-tour="tour-launcher"]',
      title: 'Guía contextual',
      body: 'Puedes reabrir esta guía en cualquier momento.',
      placement: 'top',
      mobilePlacement: 'top',
    },
  ],
};

const sharedContextSteps = (role: TourRole): TourStep[] => [
  {
    id: `${role}-notifications-filters`,
    role,
    route: '/notifications',
    selector: '[data-tour="notifications-filters"]',
    title: 'Filtrar notificaciones',
    body: 'Usa filtros para priorizar pendientes y no leídas.',
    placement: 'bottom',
  },
  {
    id: `${role}-notifications-list`,
    role,
    route: '/notifications',
    selector: '[data-tour="notifications-list"]',
    title: 'Bandeja de actividad',
    body: 'Aquí se concentra el seguimiento de eventos operativos.',
    placement: 'top',
  },
  {
    id: `${role}-profile-picture`,
    role,
    route: '/profile',
    selector: '[data-tour="profile-picture"]',
    title: 'Foto de perfil',
    body: 'Puedes actualizar tu foto para identificación interna.',
    placement: 'bottom',
  },
  {
    id: `${role}-profile-account`,
    role,
    route: '/profile',
    selector: '[data-tour="profile-account"]',
    title: 'Datos de cuenta',
    body: 'Actualiza nombre, contacto y credenciales según corresponda.',
    placement: 'top',
  },
  {
    id: `${role}-profile-save`,
    role,
    route: '/profile',
    selector: '[data-tour="profile-save"]',
    title: 'Guardar cambios',
    body: 'Confirma los cambios para mantener consistencia de tus datos.',
    placement: 'top',
  },
];

export const contextualStepsByRole: Record<TourRole, TourStep[]> = {
  admin: [
    {
      id: 'admin-dashboard-context',
      role: 'admin',
      route: '/admin/dashboard',
      selector: '[data-tour="admin-dashboard-root"]',
      title: 'Vista ejecutiva EPP',
      body: 'Monitorea salud operativa y detecta desviaciones temprano.',
      placement: 'bottom',
    },
    ...sharedContextSteps('admin'),
  ],
  supervisor: [
    {
      id: 'supervisor-dashboard-context',
      role: 'supervisor',
      route: '/supervisor/dashboard',
      title: 'Vista supervisor',
      body: 'Prioriza entregas y devoluciones con foco en continuidad operacional.',
      placement: 'center',
    },
    ...sharedContextSteps('supervisor'),
  ],
  bodega: [
    {
      id: 'bodega-operations-context',
      role: 'bodega',
      route: '/bodega/operaciones',
      title: 'Flujo operativo',
      body: 'Este módulo concentra creación y confirmación de entregas/devoluciones.',
      placement: 'center',
    },
    ...sharedContextSteps('bodega'),
  ],
  worker: [
    {
      id: 'worker-signatures-context',
      role: 'worker',
      route: '/worker/firmas',
      title: 'Recepción y firma',
      body: 'Revisa pendientes y firma con trazabilidad legal completa.',
      placement: 'center',
    },
    ...sharedContextSteps('worker'),
  ],
};

export const getContextualStepsForRoute = (role: TourRole, pathname: string) => {
  const steps = contextualStepsByRole[role] || [];
  return steps.filter((step) => matchTourRoute(pathname, step.route));
};
