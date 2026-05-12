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
  demoAction?: string;
}

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

const sharedContextSteps = (role: TourRole): TourStep[] => [
  {
    id: `${role}-ctx-notifications-filters`,
    role,
    route: '/notifications',
    selector: '[data-tour="notifications-filters"]',
    title: 'Filtrar notificaciones',
    body: 'Usa filtros para priorizar pendientes y no leídas.',
    placement: 'bottom',
  },
  {
    id: `${role}-ctx-notifications-list`,
    role,
    route: '/notifications',
    selector: '[data-tour="notifications-list"]',
    title: 'Bandeja de actividad',
    body: 'Aquí se concentra el seguimiento de eventos operativos.',
    placement: 'top',
  },
  {
    id: `${role}-ctx-profile-picture`,
    role,
    route: '/profile',
    selector: '[data-tour="profile-picture"]',
    title: 'Foto de perfil',
    body: 'Actualiza tu foto para identificación en registros internos.',
    placement: 'bottom',
  },
  {
    id: `${role}-ctx-profile-account`,
    role,
    route: '/profile',
    selector: '[data-tour="profile-account"]',
    title: 'Datos de cuenta',
    body: 'Actualiza nombre, contacto y credenciales según corresponda.',
    placement: 'top',
  },
  {
    id: `${role}-ctx-profile-save`,
    role,
    route: '/profile',
    selector: '[data-tour="profile-save"]',
    title: 'Guardar cambios',
    body: 'Confirma los cambios para mantener consistencia de tus datos.',
    placement: 'top',
  },
];

const contextualStepsByRole: Record<TourRole, TourStep[]> = {
  admin: [
    {
      id: 'admin-ctx-dashboard',
      role: 'admin',
      route: '/admin/dashboard',
      selector: '[data-tour="admin-dashboard-root"]',
      title: 'Vista ejecutiva operativa',
      body: 'Monitorea salud operativa y detecta desviaciones temprano desde esta vista central.',
      placement: 'bottom',
    },
    {
      id: 'admin-ctx-dashboard-kpis',
      role: 'admin',
      route: '/admin/dashboard',
      selector: '[data-tour="admin-dashboard-kpis"]',
      title: 'Métricas de stock',
      body: 'Stock disponible vs reservado. Los registros agotados aparecen destacados en rojo.',
      placement: 'top',
    },
    {
      id: 'admin-ctx-trazabilidad',
      role: 'admin',
      route: '/admin/trazabilidad',
      selector: '[data-tour="admin-dashboard-root"]',
      title: 'Trazabilidad operacional',
      body: 'Audita movimientos de stock y activos. Filtra por tipo para rastrear transferencias o asignaciones.',
      placement: 'bottom',
    },
    {
      id: 'admin-ctx-users',
      role: 'admin',
      route: '/admin/users',
      selector: '[data-tour="admin-users-role-filters"]',
      title: 'Filtros por rol',
      body: 'Filtra usuarios por administrador o supervisor para gestionar accesos rápidamente.',
      placement: 'bottom',
    },
    {
      id: 'admin-ctx-users-table',
      role: 'admin',
      route: '/admin/users',
      selector: '[data-tour="admin-users-table"]',
      title: 'Tabla de usuarios',
      body: 'Edita, activa, desactiva o elimina cuentas. Un usuario no puede eliminarse a sí mismo.',
      placement: 'top',
    },
    {
      id: 'admin-ctx-trabajadores',
      role: 'admin',
      route: '/admin/trabajadores',
      selector: '[data-tour="admin-trabajadores-root"]',
      title: 'Gestión de trabajadores',
      body: 'Registra y edita personal. Los trabajadores reciben activos vía flujo de entrega con firma digital.',
      placement: 'bottom',
    },
    {
      id: 'admin-ctx-trabajadores-table',
      role: 'admin',
      route: '/admin/trabajadores',
      selector: '[data-tour="admin-trabajadores-table"]',
      title: 'Tabla de trabajadores',
      body: 'Busca por nombre, RUT o cargo. Abre el perfil para ver historial de custodias.',
      placement: 'top',
    },
    {
      id: 'admin-ctx-bodegas',
      role: 'admin',
      route: '/admin/ubicacion/bodegas',
      selector: '[data-tour="admin-bodegas-root"]',
      title: 'Gestión de bodegas',
      body: 'Crea y administra bodegas operativas. El stock se mueve entre bodegas mediante transferencias.',
      placement: 'bottom',
    },
    {
      id: 'admin-ctx-proyectos',
      role: 'admin',
      route: '/admin/ubicacion/proyectos',
      selector: '[data-tour="admin-proyectos-root"]',
      title: 'Gestión de proyectos',
      body: 'Define frentes de trabajo. Los activos asignados a un trabajador registran el proyecto como destino.',
      placement: 'bottom',
    },
    {
      id: 'admin-ctx-articulos-table',
      role: 'admin',
      route: '/admin/inventario/articulos',
      selector: '[data-tour="admin-inventory-articles-table"]',
      title: 'Catálogo operativo',
      body: 'Edita artículos, activa/desactiva y elimina definitivamente solo si están inactivos y sin trazabilidad.',
      placement: 'top',
    },
    {
      id: 'admin-ctx-epp-kpis',
      role: 'admin',
      route: '/admin/inventario/epp',
      selector: '[data-tour="admin-inventory-kpis"]',
      title: 'KPIs de EPP',
      body: 'Total, disponibles, asignados y valor monetario bajo responsabilidad activa.',
      placement: 'bottom',
    },
    {
      id: 'admin-ctx-epp-grid',
      role: 'admin',
      route: '/admin/inventario/epp',
      selector: '[data-tour="admin-inventory-grid"]',
      title: 'Tarjetas de activos EPP',
      body: 'Haz clic en cualquier tarjeta para abrir el perfil completo con historial y acciones.',
      placement: 'top',
    },
    {
      id: 'admin-ctx-equipos-kpis',
      role: 'admin',
      route: '/admin/inventario/equipos',
      selector: '[data-tour="admin-inventory-kpis"]',
      title: 'KPIs de equipos',
      body: 'Disponibilidad y valor bajo responsabilidad. Detecta equipos sin devolver en "Asignados".',
      placement: 'bottom',
    },
    {
      id: 'admin-ctx-equipos-grid',
      role: 'admin',
      route: '/admin/inventario/equipos',
      selector: '[data-tour="admin-inventory-grid"]',
      title: 'Tarjetas de equipos',
      body: 'Filtra por estado o ubicación. Haz clic para ver perfil, cambiar estado o reubicar.',
      placement: 'top',
    },
    {
      id: 'admin-ctx-herramientas-kpis',
      role: 'admin',
      route: '/admin/inventario/herramientas',
      selector: '[data-tour="admin-inventory-kpis"]',
      title: 'KPIs de herramientas',
      body: 'Resumen de disponibilidad. Los activos en mantención aparecen separados para fácil seguimiento.',
      placement: 'bottom',
    },
    {
      id: 'admin-ctx-herramientas-grid',
      role: 'admin',
      route: '/admin/inventario/herramientas',
      selector: '[data-tour="admin-inventory-grid"]',
      title: 'Tarjetas de herramientas',
      body: 'Usa la búsqueda por código o serie para localizar herramientas específicas rápidamente.',
      placement: 'top',
    },
    ...sharedContextSteps('admin'),
  ],
  supervisor: [
    {
      id: 'supervisor-ctx-dashboard',
      role: 'supervisor',
      route: '/supervisor/dashboard',
      selector: '[data-tour="supervisor-dashboard-root"]',
      title: 'Panel supervisor',
      body: 'Estado actual del inventario a tu cargo. Prioriza devoluciones pendientes y activos en mantención.',
      placement: 'bottom',
    },
    {
      id: 'supervisor-ctx-trazabilidad',
      role: 'supervisor',
      route: '/supervisor/trazabilidad',
      selector: '[data-tour="supervisor-dashboard-movements"]',
      title: 'Movimientos de activos',
      body: 'Historial reciente de asignaciones, devoluciones y transferencias de activos en terreno.',
      placement: 'top',
    },
    ...sharedContextSteps('supervisor'),
  ],
};

export const getContextualStepsForRoute = (role: TourRole, pathname: string) => {
  const steps = contextualStepsByRole[role] || [];
  return steps.filter((step) => matchTourRoute(pathname, step.route));
};
