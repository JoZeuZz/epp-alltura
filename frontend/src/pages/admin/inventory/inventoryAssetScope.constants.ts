import type { ArticuloTipo } from '../../../services/apiService';

export interface InventoryAssetScopeCopy {
  tipo: ArticuloTipo;
  pageTitle: string;
  pageSubtitle: string;
  totalLabel: string;
  emptyMessage: string;
  errorMessage: string;
  loadMoreLabel: string;
  icon: string;
}

export type AssetScopeKey = 'epp' | 'herramientas' | 'equipos';

export const INVENTORY_ASSET_SCOPE_COPY: Record<AssetScopeKey, InventoryAssetScopeCopy> = {
  epp: {
    tipo: 'epp',
    pageTitle: 'Gestor de EPP',
    pageSubtitle: 'Elementos de Protección Personal',
    totalLabel: 'Total EPP',
    emptyMessage: 'No hay EPP registrados.',
    errorMessage: 'No fue posible cargar EPP. Intenta nuevamente.',
    loadMoreLabel: 'Cargar más EPP',
    icon: '',
  },
  herramientas: {
    tipo: 'herramienta',
    pageTitle: 'Gestor de Herramientas',
    pageSubtitle: 'Herramientas manuales y eléctricas',
    totalLabel: 'Total herramientas',
    emptyMessage: 'No hay herramientas registradas.',
    errorMessage: 'No fue posible cargar herramientas. Intenta nuevamente.',
    loadMoreLabel: 'Cargar más herramientas',
    icon: '',
  },
  equipos: {
    tipo: 'equipo',
    pageTitle: 'Gestor de Equipos',
    pageSubtitle: 'Equipos de medición y ensayos',
    totalLabel: 'Total equipos',
    emptyMessage: 'No hay equipos registrados.',
    errorMessage: 'No fue posible cargar equipos. Intenta nuevamente.',
    loadMoreLabel: 'Cargar más equipos',
    icon: '',
  },
};
