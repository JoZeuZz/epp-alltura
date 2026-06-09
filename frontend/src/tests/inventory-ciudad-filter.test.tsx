import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminInventoryScopedAssetCards from '../pages/admin/inventory/AdminInventoryScopedAssetCards';
import type { Articulo } from '../services/apiService';
import { INVENTORY_ASSET_SCOPE_COPY } from '../pages/admin/inventory/inventoryAssetScope.constants';

vi.mock('../components/forms/ActivoProfileModal', () => ({ default: () => <div /> }));
vi.mock('../components/forms/TourDemoActivoModal', () => ({ default: () => <div /> }));
vi.mock('../hooks', () => ({
  useTour: () => ({ isActive: false, currentDemoAction: null }),
  useTourActions: vi.fn(),
  useInventoryExport: () => ({ exporting: false, exportExcel: vi.fn(), exportPdf: vi.fn() }),
}));
vi.mock('../pages/admin/inventory/AdminInventoryScopedAssetListView', () => ({ default: () => <div data-testid="list-view" /> }));

const makeItem = (id: string, bodega_nombre: string | null, proyecto_nombre: string | null = null): Articulo => ({
  id,
  tipo: 'epp',
  nombre: `Item ${id}`,
  nro_serie: `SN-${id}`,
  codigo: `EPP-${id}`,
  valor: 0,
  estado: 'en_stock',
  especialidades: [],
  creado_en: '2024-01-01T00:00:00.000Z',
  bodega_actual_id: null,
  bodega_nombre,
  proyecto_actual_id: null,
  proyecto_nombre,
});

const ITEMS: Articulo[] = [
  makeItem('1', 'Bodega Central'),
  makeItem('2', 'Bodega Central'),
  makeItem('3', 'Bodega Norte'),
  makeItem('4', null),
];

const BASE_PROPS = {
  scope: 'epp' as const,
  items: ITEMS,
  isLoading: false,
  isError: false,
  onRefetch: vi.fn(),
  copy: INVENTORY_ASSET_SCOPE_COPY.epp,
};

describe('AdminInventoryScopedAssetCards — location filter', () => {
  it('shows all items when locationFilter is undefined', () => {
    render(<AdminInventoryScopedAssetCards {...BASE_PROPS} locationFilter={undefined} onClearLocation={vi.fn()} />);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
    expect(screen.getByText('Item 4')).toBeInTheDocument();
  });

  it('shows only matching items when locationFilter="Bodega Central"', () => {
    render(<AdminInventoryScopedAssetCards {...BASE_PROPS} locationFilter="Bodega Central" onClearLocation={vi.fn()} />);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.queryByText('Item 3')).not.toBeInTheDocument();
    expect(screen.queryByText('Item 4')).not.toBeInTheDocument();
  });

  it('shows only items with no location when locationFilter=null', () => {
    render(<AdminInventoryScopedAssetCards {...BASE_PROPS} locationFilter={null} onClearLocation={vi.fn()} />);
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Item 3')).not.toBeInTheDocument();
    expect(screen.getByText('Item 4')).toBeInTheDocument();
  });

  it('shows location chip when locationFilter is set', () => {
    render(<AdminInventoryScopedAssetCards {...BASE_PROPS} locationFilter="Bodega Central" onClearLocation={vi.fn()} />);
    expect(screen.getByText(/ubicación:.*bodega central/i)).toBeInTheDocument();
  });

  it('does not show location chip when locationFilter is undefined', () => {
    render(<AdminInventoryScopedAssetCards {...BASE_PROPS} locationFilter={undefined} onClearLocation={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /quitar filtro de ubicación/i })).not.toBeInTheDocument();
  });
});
