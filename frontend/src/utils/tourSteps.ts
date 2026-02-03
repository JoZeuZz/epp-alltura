export type TourRole = 'admin' | 'supervisor' | 'client';

export interface TourStep {
  id: string;
  role: TourRole;
  route?: string;
  selector?: string;
  title: string;
  body: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  mobilePlacement?: 'bottom' | 'center';
  highlightPadding?: number;
  autoNavigate?: boolean;
}

export const TOUR_VERSION = 'v1';

export const tourStepsByRole: Record<TourRole, TourStep[]> = {
  admin: [
    {
      id: 'admin-clients-create',
      role: 'admin',
      route: '/admin/clients',
      selector: '[data-tour="admin-clients-create"]',
      title: 'Empresas cliente',
      body: 'Crea la empresa cliente para luego asociar proyectos y usuarios.',
      placement: 'bottom',
    },
    {
      id: 'admin-users-create',
      role: 'admin',
      route: '/admin/users',
      selector: '[data-tour="admin-users-create"]',
      title: 'Usuarios',
      body: 'Crea el usuario cliente y/o supervisor para operar el proyecto.',
      placement: 'bottom',
    },
    {
      id: 'admin-projects-create',
      role: 'admin',
      route: '/admin/projects',
      selector: '[data-tour="admin-projects-create"]',
      title: 'Proyectos',
      body: 'Crea el proyecto y vincúlalo con la empresa cliente.',
      placement: 'bottom',
    },
    {
      id: 'admin-projects-assign',
      role: 'admin',
      route: '/admin/projects',
      selector: '[data-tour="admin-projects-assign"]',
      title: 'Asignaciones',
      body: 'Asigna usuarios al proyecto (cliente y supervisor).',
      placement: 'top',
    },
    {
      id: 'admin-scaffolds',
      role: 'admin',
      route: '/admin/scaffolds',
      selector: '[data-tour="admin-scaffolds"]',
      title: 'Andamios y reportes',
      body: 'Desde aquí puedes revisar reportes, exportar y auditar avances.',
      placement: 'bottom',
    },
    {
      id: 'admin-tour-launcher',
      role: 'admin',
      route: '*',
      selector: '[data-tour="tour-launcher"]',
      title: '¿Necesitas ayuda?',
      body: 'Este botón siempre te permite reabrir la guía cuando la necesites.',
      placement: 'top',
      mobilePlacement: 'top',
    },
  ],
  supervisor: [
    {
      id: 'sup-projects-select',
      role: 'supervisor',
      route: '/supervisor/dashboard',
      selector: '[data-tour="sup-projects-select"]',
      title: 'Proyectos activos',
      body: 'Selecciona un proyecto para comenzar a reportar andamios.',
      placement: 'bottom',
    },
    {
      id: 'sup-scaffold-create',
      role: 'supervisor',
      route: '/supervisor/project/:projectId',
      selector: '[data-tour="sup-scaffold-create"]',
      title: 'Crear andamio',
      body: 'Desde aquí inicias un nuevo reporte de andamio.',
      placement: 'bottom',
    },
    {
      id: 'sup-scaffold-form',
      role: 'supervisor',
      route: '/supervisor/project/:projectId/create-scaffold',
      selector: '[data-tour="sup-scaffold-form"]',
      title: 'Formulario del andamio',
      body: 'Completa dimensiones, área, TAG y ubicación. El sistema calcula m³ automáticamente.',
      placement: 'bottom',
    },
    {
      id: 'sup-scaffold-photos',
      role: 'supervisor',
      route: '/supervisor/project/:projectId/create-scaffold',
      selector: '[data-tour="sup-scaffold-photos"]',
      title: 'Evidencia fotográfica',
      body: 'Adjunta la foto del andamio; es obligatoria para reportar.',
      placement: 'bottom',
    },
    {
      id: 'sup-scaffold-actions',
      role: 'supervisor',
      route: '/supervisor/project/:projectId',
      selector: '[data-tour="sup-scaffold-actions"]',
      title: 'Acciones del andamio',
      body: 'Cuando el andamio esté 100% armado podrás cambiar la tarjeta y registrar el desarmado con foto.',
      placement: 'top',
    },
    {
      id: 'sup-tour-launcher',
      role: 'supervisor',
      route: '*',
      selector: '[data-tour="tour-launcher"]',
      title: '¿Necesitas ayuda?',
      body: 'Este botón siempre te permite reabrir la guía cuando la necesites.',
      placement: 'top',
      mobilePlacement: 'top',
    },
  ],
  client: [
    {
      id: 'client-projects',
      role: 'client',
      route: '/client/dashboard',
      selector: '[data-tour="client-projects"]',
      title: 'Tus proyectos',
      body: 'Aquí ves los proyectos asignados a tu empresa. Entra para revisar métricas y andamios.',
      placement: 'bottom',
    },
    {
      id: 'client-metrics',
      role: 'client',
      route: '/client/project/:projectId',
      selector: '[data-tour="client-metrics"]',
      title: 'Dashboard del proyecto',
      body: 'Revisa métricas clave como avances, metros cúbicos y estados de andamios.',
      placement: 'bottom',
    },
    {
      id: 'client-scaffolds',
      role: 'client',
      route: '/client/project/:projectId',
      selector: '[data-tour="client-scaffolds"]',
      title: 'Andamios y detalles',
      body: 'Aquí puedes ver los andamios del proyecto. Al abrir uno podrás revisar fotos y dejar notas.',
      placement: 'bottom',
    },
    {
      id: 'client-gallery',
      role: 'client',
      route: '/client/project/:projectId',
      selector: '[data-tour="client-gallery"]',
      title: 'Galería de fotos',
      body: 'Accede a la galería con evidencia fotográfica del proyecto.',
      placement: 'bottom',
    },
    {
      id: 'client-pdf',
      role: 'client',
      route: '/client/project/:projectId',
      selector: '[data-tour="client-pdf"]',
      title: 'Reporte en PDF',
      body: 'Descarga el reporte del proyecto cuando necesites compartirlo.',
      placement: 'bottom',
    },
    {
      id: 'client-tour-launcher',
      role: 'client',
      route: '*',
      selector: '[data-tour="tour-launcher"]',
      title: '¿Necesitas ayuda?',
      body: 'Este botón siempre te permite reabrir la guía cuando la necesites.',
      placement: 'top',
      mobilePlacement: 'top',
    },
  ],
};
