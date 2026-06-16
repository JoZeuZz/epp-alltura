import type { TourRole, TourStep } from '@jozeuzz/alltura-ui';

export const TOUR_VERSION = 'v4';

export const onboardingStepsByRole: Record<TourRole, TourStep[]> = {
  admin: [
    { id: 'admin-ob-dashboard', role: 'admin', route: '/dashboard', selector: '[data-tour="admin-dashboard-root"]', title: 'Panel operativo', body: 'Vista central con KPIs de activos, entregas, devoluciones y firmas.', placement: 'bottom' },
    { id: 'admin-ob-epp-kpis', role: 'admin', route: '/inventario/epp', selector: '[data-tour="admin-inventory-kpis"]', title: 'Inventario EPP', body: 'Stock disponible, asignados y valor bajo responsabilidad. El rojo marca agotados o de baja.', placement: 'bottom', mobilePlacement: 'bottom' },
    { id: 'admin-ob-epp-tab-inventario', role: 'admin', route: '/inventario/epp', title: 'Listado de activos', body: 'Pasamos al listado de activos físicos individuales con su código, estado y ubicación.', placement: 'center', mobilePlacement: 'center', demoAction: 'switch-tab:inventario' },
    { id: 'admin-ob-epp-grid', role: 'admin', route: '/inventario/epp', selector: '[data-tour="admin-inventory-grid"]', title: 'Tarjetas de activos', body: 'Cada tarjeta es un activo único. Abrimos el primero para recorrer su perfil.', placement: 'top', mobilePlacement: 'bottom', demoAction: 'open-modal:activo-first' },
    { id: 'admin-ob-activo-entregar', role: 'admin', route: '/inventario/epp', selector: '[data-tour="activo-modal-btn-entregar"]', title: 'Entregar activo', body: 'Asigna a un trabajador con firma digital; el acta queda en PDF.', placement: 'bottom', mobilePlacement: 'bottom' },
    { id: 'admin-ob-notifications', role: 'admin', route: '/notifications', selector: '[data-tour="notifications-filters"]', title: 'Notificaciones', body: 'Bandeja de actividad operativa. Filtra por pendientes y no leídas.', placement: 'bottom', mobilePlacement: 'bottom' },
    { id: 'admin-ob-profile', role: 'admin', route: '/profile', selector: '[data-tour="profile-picture"]', title: 'Tu perfil', body: 'Actualiza foto, contacto y credenciales. Tu foto aparece en los registros de entrega.', placement: 'bottom', mobilePlacement: 'bottom' },
    { id: 'admin-ob-tour-launcher', role: 'admin', route: '*', selector: '[data-tour="tour-launcher"]', title: 'Guía contextual', body: 'Este botón reabre la ayuda específica de la pantalla actual cuando la necesites.', placement: 'top', mobilePlacement: 'top' },
  ],
  supervisor: [
    { id: 'supervisor-ob-dashboard', role: 'supervisor', route: '/dashboard', selector: '[data-tour="admin-dashboard-root"]', title: 'Panel supervisor', body: 'Estado del inventario a tu cargo: stock, asignados, en mantención y de baja.', placement: 'bottom', mobilePlacement: 'bottom' },
    { id: 'supervisor-ob-epp-grid', role: 'supervisor', route: '/inventario/epp', selector: '[data-tour="admin-inventory-grid"]', title: 'Activos físicos', body: 'Cada tarjeta es un activo único. Abrimos el primero para ver su perfil.', placement: 'top', mobilePlacement: 'bottom', demoAction: 'open-modal:activo-first' },
    { id: 'supervisor-ob-notifications', role: 'supervisor', route: '/notifications', selector: '[data-tour="notifications-filters"]', title: 'Notificaciones', body: 'Filtra por pendientes para no perder eventos críticos.', placement: 'bottom', mobilePlacement: 'bottom' },
    { id: 'supervisor-ob-profile', role: 'supervisor', route: '/profile', selector: '[data-tour="profile-picture"]', title: 'Tu perfil', body: 'Actualiza foto y datos de contacto. Tu firma aparece en actas.', placement: 'bottom', mobilePlacement: 'bottom' },
    { id: 'supervisor-ob-tour-launcher', role: 'supervisor', route: '*', selector: '[data-tour="tour-launcher"]', title: 'Guía contextual', body: 'Reabre la ayuda operativa de la pantalla actual cuando la necesites.', placement: 'top', mobilePlacement: 'top' },
  ],
};

const sharedContextSteps = (role: TourRole): TourStep[] => [
  { id: `${role}-ctx-notifications-filters`, role, route: '/notifications', selector: '[data-tour="notifications-filters"]', title: 'Filtrar notificaciones', body: 'Prioriza pendientes y no leídas con los filtros.', placement: 'bottom' },
  { id: `${role}-ctx-notifications-list`, role, route: '/notifications', selector: '[data-tour="notifications-list"]', title: 'Bandeja de actividad', body: 'Aquí se concentra el seguimiento de eventos operativos.', placement: 'top' },
  { id: `${role}-ctx-profile-picture`, role, route: '/profile', selector: '[data-tour="profile-picture"]', title: 'Foto de perfil', body: 'Actualiza tu foto para identificación en registros internos.', placement: 'bottom' },
  { id: `${role}-ctx-profile-account`, role, route: '/profile', selector: '[data-tour="profile-account"]', title: 'Datos de cuenta', body: 'Actualiza nombre, contacto y credenciales según corresponda.', placement: 'top' },
  { id: `${role}-ctx-profile-save`, role, route: '/profile', selector: '[data-tour="profile-save"]', title: 'Guardar cambios', body: 'Confirma los cambios para mantener tus datos consistentes.', placement: 'top' },
];

const inventoryContextSteps = (role: TourRole, scope: 'epp' | 'equipos' | 'herramientas', noun: string): TourStep[] => {
  const route = `/inventario/${scope}`;
  const cap = noun.charAt(0).toUpperCase() + noun.slice(1);
  return [
    { id: `${role}-ctx-${scope}-kpis`, role, route, selector: '[data-tour="admin-inventory-kpis"]', title: `KPIs de ${noun}`, body: 'Total, en stock, asignados y valor bajo responsabilidad activa.', placement: 'bottom' },
    { id: `${role}-ctx-${scope}-new-article`, role, route, selector: '[data-tour="admin-inventory-new-article"]', title: 'Nuevo artículo', body: `Crea un tipo de ${noun} del catálogo; luego se generan sus unidades físicas.`, placement: 'bottom' },
    { id: `${role}-ctx-${scope}-tab`, role, route, title: 'Listado de activos', body: 'Pasamos al listado de unidades físicas individuales.', placement: 'center', mobilePlacement: 'center', demoAction: 'switch-tab:inventario' },
    { id: `${role}-ctx-${scope}-filters`, role, route, selector: '[data-tour="admin-inventory-filters"]', title: 'Filtros de inventario', body: 'Busca por código o serie; filtra por estado o bodega de origen.', placement: 'bottom' },
    { id: `${role}-ctx-${scope}-grid`, role, route, selector: '[data-tour="admin-inventory-grid"]', title: `Tarjetas de ${noun}`, body: 'Cada tarjeta es una unidad física. Abrimos la primera para recorrer su perfil.', placement: 'top', demoAction: 'open-modal:activo-first' },
    { id: `${role}-ctx-${scope}-activo-header`, role, route, selector: '[data-tour="activo-modal-header"]', title: `Identidad ${cap}`, body: 'Código, estado y nombre. El badge indica disponibilidad: verde stock, azul asignado, naranja mantención.', placement: 'bottom', mobilePlacement: 'bottom' },
    { id: `${role}-ctx-${scope}-activo-entregar`, role, route, selector: '[data-tour="activo-modal-btn-entregar"]', title: 'Entregar', body: 'Asigna a un trabajador con firma digital; el acta queda en PDF.', placement: 'bottom', mobilePlacement: 'bottom' },
    { id: `${role}-ctx-${scope}-activo-estado`, role, route, selector: '[data-tour="activo-modal-estado"]', title: 'Cambio de estado', body: 'Registra mantención, baja o pérdida (solo si no está asignado). Queda en el historial.', placement: 'top', mobilePlacement: 'bottom' },
    { id: `${role}-ctx-${scope}-activo-historial`, role, route, selector: '[data-tour="activo-modal-historial"]', title: 'Historial', body: 'Trazabilidad completa: cada entrega, devolución y cambio de estado con fecha, responsable y destino.', placement: 'top', mobilePlacement: 'bottom' },
  ];
};

export const contextualStepsByRole: Record<TourRole, TourStep[]> = {
  admin: [
    { id: 'admin-ctx-dashboard', role: 'admin', route: '/dashboard', selector: '[data-tour="admin-dashboard-root"]', title: 'Vista ejecutiva', body: 'Monitorea salud operativa y detecta desviaciones temprano.', placement: 'bottom' },
    { id: 'admin-ctx-dashboard-kpis', role: 'admin', route: '/dashboard', selector: '[data-tour="admin-dashboard-kpis"]', title: 'Métricas de stock', body: 'Stock disponible vs reservado; agotados destacados en rojo.', placement: 'top' },
    { id: 'admin-ctx-users-filters', role: 'admin', route: '/admin/users', selector: '[data-tour="admin-users-role-filters"]', title: 'Filtros por rol', body: 'Filtra usuarios por administrador o supervisor para gestionar accesos.', placement: 'bottom' },
    { id: 'admin-ctx-users-row', role: 'admin', route: '/admin/users', selector: '[data-tour="admin-users-row-actions"]', title: 'Acciones de usuario', body: 'Edita, activa/desactiva o elimina la cuenta. Un usuario no puede eliminarse a sí mismo.', placement: 'left' },
    { id: 'admin-ctx-trabajadores', role: 'admin', route: '/trabajadores', selector: '[data-tour="admin-trabajadores-root"]', title: 'Trabajadores', body: 'Personal interno que recibe activos por flujo de entrega con firma.', placement: 'bottom' },
    { id: 'admin-ctx-trabajadores-new', role: 'admin', route: '/trabajadores', selector: '[data-tour="new-trabajador"]', title: 'Nuevo trabajador', body: 'Registra personal con nombre, RUT y cargo. Opcional: foto para identificación.', placement: 'bottom' },
    { id: 'admin-ctx-trabajadores-row', role: 'admin', route: '/trabajadores', selector: '[data-tour="admin-trabajadores-row-actions"]', title: 'Acciones de trabajador', body: 'Abre el perfil para ver historial de custodias, edita o elimina.', placement: 'left' },
    { id: 'admin-ctx-proyectos', role: 'admin', route: '/ubicacion/proyectos', selector: '[data-tour="admin-proyectos-root"]', title: 'Proyectos', body: 'Frentes de trabajo destino de activos asignados.', placement: 'bottom' },
    { id: 'admin-ctx-proyectos-row', role: 'admin', route: '/ubicacion/proyectos', selector: '[data-tour="admin-proyectos-row-actions"]', title: 'Acciones de proyecto', body: 'Abre el detalle, edita o elimina el frente de trabajo.', placement: 'left' },
    { id: 'admin-ctx-proyecto-detail', role: 'admin', route: '/ubicacion/proyectos/:id', selector: '[data-tour="proyecto-detail-root"]', title: 'Detalle de proyecto', body: 'Activos asignados al frente y sus responsables actuales.', placement: 'bottom' },
    { id: 'admin-ctx-bodegas', role: 'admin', route: '/ubicacion/bodegas', selector: '[data-tour="admin-bodegas-root"]', title: 'Bodegas', body: 'Ubicaciones físicas del inventario; el stock se mueve por transferencias.', placement: 'bottom' },
    { id: 'admin-ctx-bodegas-row', role: 'admin', route: '/ubicacion/bodegas', selector: '[data-tour="admin-bodegas-row-actions"]', title: 'Acciones de bodega', body: 'Edita o elimina la bodega operativa.', placement: 'left' },
    ...inventoryContextSteps('admin', 'epp', 'EPP'),
    ...inventoryContextSteps('admin', 'equipos', 'equipos'),
    ...inventoryContextSteps('admin', 'herramientas', 'herramientas'),
    ...sharedContextSteps('admin'),
  ],
  supervisor: [
    { id: 'supervisor-ctx-dashboard', role: 'supervisor', route: '/dashboard', selector: '[data-tour="admin-dashboard-root"]', title: 'Panel supervisor', body: 'Estado del inventario a tu cargo. Prioriza devoluciones pendientes y mantención.', placement: 'bottom' },
    { id: 'supervisor-ctx-trabajadores', role: 'supervisor', route: '/trabajadores', selector: '[data-tour="admin-trabajadores-root"]', title: 'Trabajadores', body: 'Personal interno que recibe activos en terreno.', placement: 'bottom' },
    { id: 'supervisor-ctx-proyectos', role: 'supervisor', route: '/ubicacion/proyectos', selector: '[data-tour="admin-proyectos-root"]', title: 'Proyectos', body: 'Frentes de trabajo destino de los activos asignados.', placement: 'bottom' },
    { id: 'supervisor-ctx-bodegas', role: 'supervisor', route: '/ubicacion/bodegas', selector: '[data-tour="admin-bodegas-root"]', title: 'Bodegas', body: 'Ubicaciones físicas del inventario a tu cargo.', placement: 'bottom' },
    ...inventoryContextSteps('supervisor', 'epp', 'EPP'),
    ...inventoryContextSteps('supervisor', 'equipos', 'equipos'),
    ...inventoryContextSteps('supervisor', 'herramientas', 'herramientas'),
    ...sharedContextSteps('supervisor'),
  ],
};
