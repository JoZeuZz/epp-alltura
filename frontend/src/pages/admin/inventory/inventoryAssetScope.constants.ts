import type { InventoryActivoTypeScope } from '../../../services/apiService';

export interface InventoryAssetScopeCopy {
  pageTitle: string;
  pageSubtitle: string;
  managerTitle: string;
  managerDescription: string;
  totalLabel: string;
  emptyMessage: string;
  errorMessage: string;
  loadMoreLabel: string;
}

export const INVENTORY_ASSET_SCOPE_COPY: Record<InventoryActivoTypeScope, InventoryAssetScopeCopy> = {
  herramientas: {
    pageTitle: 'Gestor de Herramientas',
    pageSubtitle: 'Gestión de herramientas con filtros y acciones operativas.',
    managerTitle: 'Gestión de Herramientas',
    managerDescription:
      'Administra cada herramienta como una entidad individual, revisando responsable, ubicación, estado y valor asociado.',
    totalLabel: 'Total herramientas',
    emptyMessage: 'No se encontraron herramientas para los filtros seleccionados.',
    errorMessage: 'No fue posible cargar herramientas. Intenta nuevamente.',
    loadMoreLabel: 'Cargar más herramientas',
  },
  epp: {
    pageTitle: 'Gestor de EPP',
    pageSubtitle: 'Gestión de EPP con filtros y acciones operativas.',
    managerTitle: 'Gestión de EPP',
    managerDescription:
      'Administra cada EPP serializado en formato de tarjetas, revisando custodio, ubicación, estado y valor asociado.',
    totalLabel: 'Total EPP',
    emptyMessage: 'No se encontraron activos EPP para los filtros seleccionados.',
    errorMessage: 'No fue posible cargar activos EPP. Intenta nuevamente.',
    loadMoreLabel: 'Cargar más EPP',
  },
  equipos: {
    pageTitle: 'Gestor de Equipos',
    pageSubtitle: 'Gestión de equipos con filtros y acciones operativas.',
    managerTitle: 'Gestión de Equipos',
    managerDescription:
      'Administra cada equipo serializado en formato de tarjetas, revisando custodio, ubicación, estado y valor asociado.',
    totalLabel: 'Total equipos',
    emptyMessage: 'No se encontraron equipos para los filtros seleccionados.',
    errorMessage: 'No fue posible cargar equipos. Intenta nuevamente.',
    loadMoreLabel: 'Cargar más equipos',
  },
};
