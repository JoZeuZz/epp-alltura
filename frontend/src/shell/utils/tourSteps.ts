export type TourRole = 'admin' | 'supervisor';

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
      title: 'Dashboard Operativo',
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
      id: 'admin-inventario-articulos',
      role: 'admin',
      route: '/admin/inventario/articulos',
      selector: '[data-tour="admin-inventory-open-article-modal"]',
      title: 'Catálogo de artículos',
      body: 'Crea artículos y usa la tabla para editarlos, desactivarlos o eliminarlos definitivamente (si están inactivos y sin trazabilidad).',
      placement: 'bottom',
      mobilePlacement: 'bottom',
    },
    {
      id: 'admin-inventario-stock',
      role: 'admin',
      route: '/admin/inventario/stock',
      selector: '[data-tour="admin-inventory-stock-table"]',
      title: 'Stock de inventario',
      body: 'Consulta disponibilidad de equipos y herramientas por artículo y ubicación.',
      placement: 'top',
      mobilePlacement: 'bottom',
    },
    {
      id: 'admin-inventario-movimientos',
      role: 'admin',
      route: '/admin/inventario/movimientos',
      selector: '[data-tour="admin-inventory-movements-table"]',
      title: 'Movimientos de stock',
      body: 'Revisa entradas y salidas para trazabilidad operativa del inventario.',
      placement: 'top',
      mobilePlacement: 'bottom',
    },
    {
      id: 'admin-inventario-ingresos',
      role: 'admin',
      route: '/admin/inventario/ingresos',
      selector: '[data-tour="admin-inventory-open-ingress-modal"]',
      title: 'Ingresos de inventario',
      body: 'Registra ingresos manuales o con documento usando el modal por pasos.',
      placement: 'bottom',
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
      id: 'supervisor-operaciones',
      role: 'supervisor',
      route: '/supervisor/operaciones',
      title: 'Operación diaria',
      body: 'Gestiona entregas, firmas, devoluciones y stock desde una vista operativa.',
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
      title: 'Vista ejecutiva operativa',
      body: 'Monitorea salud operativa y detecta desviaciones temprano.',
      placement: 'bottom',
    },
    {
      id: 'admin-inventario-context-articulos',
      role: 'admin',
      route: '/admin/inventario/articulos',
      selector: '[data-tour="admin-inventory-articles-table"]',
      title: 'Catálogo operativo',
      body: 'Mantén el catálogo al día: edición completa, activación/desactivación y eliminación definitiva controlada.',
      placement: 'top',
    },
    {
      id: 'admin-inventario-context-stock',
      role: 'admin',
      route: '/admin/inventario/stock',
      selector: '[data-tour="admin-inventory-stock-table"]',
      title: 'Stock por ubicación',
      body: 'Filtra por artículo o ubicación para detectar disponibilidad y quiebres.',
      placement: 'top',
    },
    {
      id: 'admin-inventario-context-movements',
      role: 'admin',
      route: '/admin/inventario/movimientos',
      selector: '[data-tour="admin-inventory-movements-table"]',
      title: 'Trazabilidad de movimientos',
      body: 'Usa estos filtros para auditar entradas, salidas y ajustes recientes.',
      placement: 'top',
    },
    {
      id: 'admin-inventario-context-ingresos',
      role: 'admin',
      route: '/admin/inventario/ingresos',
      selector: '[data-tour="admin-inventory-open-ingress-modal"]',
      title: 'Ingreso controlado',
      body: 'Inicia aquí el flujo de ingreso con soporte opcional de documento.',
      placement: 'bottom',
    },
    ...sharedContextSteps('admin'),
  ],
  supervisor: [
    {
      id: 'supervisor-operations-context',
      role: 'supervisor',
      route: '/supervisor/operaciones',
      title: 'Flujo operativo',
      body: 'Este módulo concentra creación y confirmación de entregas/devoluciones.',
      placement: 'center',
    },
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
};

export const getContextualStepsForRoute = (role: TourRole, pathname: string) => {
  const steps = contextualStepsByRole[role] || [];
  return steps.filter((step) => matchTourRoute(pathname, step.route));
};
