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

export const TOUR_VERSION = 'v3';

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
      id: 'admin-ob-dashboard',
      role: 'admin',
      route: '/admin/dashboard',
      selector: '[data-tour="admin-dashboard-root"]',
      title: 'Panel operativo',
      body: 'Vista central con KPIs de activos, entregas, devoluciones y firmas. Detecta desviaciones antes de que escalen.',
      placement: 'bottom',
    },
    {
      id: 'admin-ob-dashboard-kpis',
      role: 'admin',
      route: '/admin/dashboard',
      selector: '[data-tour="admin-dashboard-kpis"]',
      title: 'Métricas de inventario',
      body: 'Stock disponible, reservado y registros agotados. Las operaciones pendientes de firma se muestran aquí.',
      placement: 'top',
      mobilePlacement: 'bottom',
    },
    {
      id: 'admin-ob-trazabilidad',
      role: 'admin',
      route: '/admin/trazabilidad',
      selector: '[data-tour="admin-dashboard-root"]',
      title: 'Trazabilidad',
      body: 'Movimientos recientes de stock y activos para auditoría operacional. Misma pantalla, vista enfocada en historial.',
      placement: 'bottom',
      mobilePlacement: 'bottom',
    },
    {
      id: 'admin-ob-users',
      role: 'admin',
      route: '/admin/users',
      selector: '[data-tour="admin-users-root"]',
      title: 'Usuarios del sistema',
      body: 'Gestiona las cuentas con acceso a la plataforma. Asigna roles de administrador o supervisor.',
      placement: 'bottom',
      mobilePlacement: 'bottom',
    },
    {
      id: 'admin-ob-trabajadores',
      role: 'admin',
      route: '/admin/trabajadores',
      selector: '[data-tour="admin-trabajadores-root"]',
      title: 'Trabajadores',
      body: 'Personal interno al que se asignan activos. Los trabajadores no son usuarios del sistema por defecto.',
      placement: 'bottom',
      mobilePlacement: 'bottom',
    },
    {
      id: 'admin-ob-bodegas',
      role: 'admin',
      route: '/admin/ubicacion/bodegas',
      selector: '[data-tour="admin-bodegas-root"]',
      title: 'Bodegas',
      body: 'Ubicaciones físicas donde se almacena el inventario. El stock y los activos se mueven entre bodegas y proyectos.',
      placement: 'bottom',
      mobilePlacement: 'bottom',
    },
    {
      id: 'admin-ob-proyectos',
      role: 'admin',
      route: '/admin/ubicacion/proyectos',
      selector: '[data-tour="admin-proyectos-root"]',
      title: 'Proyectos',
      body: 'Frentes de trabajo a los que se asignan equipos y herramientas. Cada activo rastrea su ubicación actual.',
      placement: 'bottom',
      mobilePlacement: 'bottom',
    },
    {
      id: 'admin-ob-articulos',
      role: 'admin',
      route: '/admin/inventario/articulos',
      selector: '[data-tour="admin-inventory-open-article-modal"]',
      title: 'Catálogo de artículos',
      body: 'Define los tipos de activos: EPP, equipos y herramientas. Cada artículo puede tener múltiples unidades físicas.',
      placement: 'bottom',
      mobilePlacement: 'bottom',
    },
    {
      id: 'admin-ob-epp',
      role: 'admin',
      route: '/admin/inventario/epp',
      selector: '[data-tour="admin-inventory-epp"]',
      title: 'Inventario EPP',
      body: 'Elementos de protección personal por unidad. Cada activo tiene código único, estado y trazabilidad completa.',
      placement: 'bottom',
      mobilePlacement: 'bottom',
    },
    {
      id: 'admin-ob-equipos',
      role: 'admin',
      route: '/admin/inventario/equipos',
      selector: '[data-tour="admin-inventory-equipos"]',
      title: 'Inventario Equipos',
      body: 'Equipos de trabajo con seguimiento individual: asignación, custodia, mantención y baja controlada.',
      placement: 'bottom',
      mobilePlacement: 'bottom',
    },
    {
      id: 'admin-ob-herramientas',
      role: 'admin',
      route: '/admin/inventario/herramientas',
      selector: '[data-tour="admin-inventory-herramientas"]',
      title: 'Inventario Herramientas',
      body: 'Herramientas manuales y eléctricas. Mismo flujo que EPP y equipos: entrega, devolución, estado y ubicación.',
      placement: 'bottom',
      mobilePlacement: 'bottom',
    },
    {
      id: 'admin-ob-activo-demo',
      role: 'admin',
      route: '/admin/inventario/epp',
      selector: '[data-tour="admin-inventory-grid"]',
      title: 'Perfil de activo',
      body: 'Cada tarjeta abre el perfil completo del activo: historial, acciones de entrega, firma digital y descarga de ficha PDF.',
      placement: 'top',
      mobilePlacement: 'bottom',
      demoAction: 'open-activo-demo',
    },
    {
      id: 'admin-ob-notifications',
      role: 'admin',
      route: '/notifications',
      selector: '[data-tour="notifications-filters"]',
      title: 'Notificaciones',
      body: 'Bandeja de actividad operativa. Filtra por estado para priorizar pendientes y eventos sin leer.',
      placement: 'bottom',
      mobilePlacement: 'bottom',
    },
    {
      id: 'admin-ob-profile',
      role: 'admin',
      route: '/profile',
      selector: '[data-tour="profile-picture"]',
      title: 'Tu perfil',
      body: 'Actualiza foto, datos de contacto y credenciales. Tu foto aparece en los registros de entrega.',
      placement: 'bottom',
      mobilePlacement: 'bottom',
    },
    {
      id: 'admin-ob-tour-launcher',
      role: 'admin',
      route: '*',
      selector: '[data-tour="tour-launcher"]',
      title: 'Guía contextual',
      body: 'Este botón activa la ayuda específica de la pantalla actual en cualquier momento.',
      placement: 'top',
      mobilePlacement: 'top',
    },
  ],
  supervisor: [
    {
      id: 'supervisor-ob-dashboard',
      role: 'supervisor',
      route: '/supervisor/dashboard',
      selector: '[data-tour="supervisor-dashboard-root"]',
      title: 'Panel supervisor',
      body: 'Estado actual del inventario a tu cargo: activos en stock, asignados, en mantención y dados de baja.',
      placement: 'bottom',
      mobilePlacement: 'bottom',
    },
    {
      id: 'supervisor-ob-trazabilidad',
      role: 'supervisor',
      route: '/supervisor/trazabilidad',
      selector: '[data-tour="supervisor-dashboard-root"]',
      title: 'Trazabilidad',
      body: 'Revisa los movimientos recientes de activos en terreno para validar devoluciones y estado de equipos.',
      placement: 'bottom',
      mobilePlacement: 'bottom',
    },
    {
      id: 'supervisor-ob-notifications',
      role: 'supervisor',
      route: '/notifications',
      selector: '[data-tour="notifications-filters"]',
      title: 'Notificaciones',
      body: 'Bandeja de actividad operativa. Filtra por pendientes para no perder eventos críticos.',
      placement: 'bottom',
      mobilePlacement: 'bottom',
    },
    {
      id: 'supervisor-ob-profile',
      role: 'supervisor',
      route: '/profile',
      selector: '[data-tour="profile-picture"]',
      title: 'Tu perfil',
      body: 'Actualiza tu foto y datos de contacto. Tu firma aparece en actas de entrega y devolución.',
      placement: 'bottom',
      mobilePlacement: 'bottom',
    },
    {
      id: 'supervisor-ob-tour-launcher',
      role: 'supervisor',
      route: '*',
      selector: '[data-tour="tour-launcher"]',
      title: 'Guía contextual',
      body: 'Puedes reabrir la ayuda operativa de la pantalla actual cuando la necesites.',
      placement: 'top',
      mobilePlacement: 'top',
    },
  ],
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
