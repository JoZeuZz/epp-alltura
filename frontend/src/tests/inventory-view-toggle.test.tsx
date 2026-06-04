import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminInventoryScopedAssetCards from '../pages/admin/inventory/AdminInventoryScopedAssetCards';
import type { Articulo } from '../services/apiService';
import { INVENTORY_ASSET_SCOPE_COPY } from '../pages/admin/inventory/inventoryAssetScope.constants';

vi.mock('../components/forms/ActivoProfileModal', () => ({
  default: () => <div data-testid="activo-profile-modal" />,
}));
vi.mock('../components/forms/TourDemoActivoModal', () => ({
  default: () => <div data-testid="tour-demo-modal" />,
}));
vi.mock('../hooks', () => ({
  useTour: () => ({ isActive: false, currentDemoAction: null }),
  useTourActions: vi.fn(),
  useInventoryExport: () => ({ exporting: false, exportExcel: vi.fn(), exportPdf: vi.fn() }),
}));
vi.mock('../pages/admin/inventory/AdminInventoryScopedAssetListView', () => ({
  default: () => <div data-testid="list-view" />,
}));

const ITEM: Articulo = {
  id: 'art-1',
  tipo: 'epp',
  nombre: 'Casco',
  marca: undefined,
  modelo: undefined,
  descripcion: undefined,
  nro_serie: 'SN-1',
  codigo: 'EPP-001',
  valor: 0,
  foto_url: null,
  estado: 'en_stock',
  bodega_actual_id: null,
  bodega_nombre: null,
  proyecto_actual_id: null,
  proyecto_nombre: null,
  especialidades: [],
  fecha_vencimiento: null,
  creado_en: '2024-01-01T00:00:00.000Z',
  creado_por_email: null,
};

const DEFAULT_PROPS = {
  scope: 'epp' as const,
  items: [ITEM],
  isLoading: false,
  isError: false,
  onRefetch: vi.fn(),
  copy: INVENTORY_ASSET_SCOPE_COPY.epp,
};

describe('AdminInventoryScopedAssetCards — view toggle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders toggle buttons for both views', () => {
    render(<AdminInventoryScopedAssetCards {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /vista cards/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /vista lista/i })).toBeInTheDocument();
  });

  it('shows card grid by default (no list view)', () => {
    render(<AdminInventoryScopedAssetCards {...DEFAULT_PROPS} />);
    expect(screen.queryByTestId('list-view')).not.toBeInTheDocument();
    expect(screen.getByText('Casco')).toBeInTheDocument();
  });

  it('switches to list view when list toggle is clicked', () => {
    render(<AdminInventoryScopedAssetCards {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByRole('button', { name: /vista lista/i }));
    expect(screen.getByTestId('list-view')).toBeInTheDocument();
  });

  it('switches back to cards view when cards toggle is clicked after list', () => {
    render(<AdminInventoryScopedAssetCards {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByRole('button', { name: /vista lista/i }));
    fireEvent.click(screen.getByRole('button', { name: /vista cards/i }));
    expect(screen.queryByTestId('list-view')).not.toBeInTheDocument();
    expect(screen.getByText('Casco')).toBeInTheDocument();
  });
});
