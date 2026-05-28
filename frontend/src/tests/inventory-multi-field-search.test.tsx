import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminInventoryScopedAssetCards from '../pages/admin/inventory/AdminInventoryScopedAssetCards';
import type { Articulo } from '../services/apiService';
import { INVENTORY_ASSET_SCOPE_COPY } from '../pages/admin/inventory/inventoryAssetScope.constants';

vi.mock('../components/forms/ActivoProfileModal', () => ({ default: () => <div /> }));
vi.mock('../components/forms/TourDemoActivoModal', () => ({ default: () => <div /> }));
vi.mock('../hooks', () => ({ useTour: () => ({ isActive: false, currentDemoAction: null }) }));
vi.mock('../pages/admin/inventory/AdminInventoryScopedAssetListView', () => ({
  default: () => <div data-testid="list-view" />,
}));

const makeItem = (overrides: Partial<Articulo>): Articulo => ({
  id: 'art-1',
  tipo: 'epp',
  nombre: 'Casco tipo II',
  marca: '3M',
  modelo: 'V200',
  descripcion: undefined,
  nro_serie: 'SN-001',
  codigo: 'EPP-001',
  valor: 18500,
  foto_url: null,
  estado: 'en_stock',
  bodega_actual_id: 'bod-1',
  bodega_nombre: 'Bodega Sur',
  bodega_ciudad: 'Santiago',
  proyecto_actual_id: null,
  proyecto_nombre: null,
  proyecto_ciudad: null,
  especialidades: ['oocc'],
  fecha_vencimiento: null,
  creado_en: '2024-01-01T00:00:00.000Z',
  creado_por_email: null,
  ...overrides,
});

function makeBaseProps() {
  return {
    scope: 'epp' as const,
    isLoading: false,
    isError: false,
    onRefetch: vi.fn(),
    copy: INVENTORY_ASSET_SCOPE_COPY.epp,
    ciudadFilter: undefined as string | null | undefined,
    onClearCiudad: vi.fn(),
  };
}

function type(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

describe('AdminInventoryScopedAssetCards — multi-field search', () => {
  it('filters by marca', () => {
    const items = [
      makeItem({ id: 'a1', nombre: 'Casco', marca: 'Bosch' }),
      makeItem({ id: 'a2', nombre: 'Taladro', marca: 'DeWalt' }),
    ];
    render(<AdminInventoryScopedAssetCards {...makeBaseProps()} items={items} />);
    const input = screen.getByPlaceholderText(/nombre/i);
    type(input, 'bosch');
    expect(screen.getByText('Casco')).toBeInTheDocument();
    expect(screen.queryByText('Taladro')).not.toBeInTheDocument();
  });

  it('filters by modelo', () => {
    const items = [
      makeItem({ id: 'a1', nombre: 'Taladro', modelo: 'GSB18' }),
      makeItem({ id: 'a2', nombre: 'Sierra', modelo: 'DWE575' }),
    ];
    render(<AdminInventoryScopedAssetCards {...makeBaseProps()} items={items} />);
    const input = screen.getByPlaceholderText(/nombre/i);
    type(input, 'gsb18');
    expect(screen.getByText('Taladro')).toBeInTheDocument();
    expect(screen.queryByText('Sierra')).not.toBeInTheDocument();
  });

  it('filters by bodega_nombre', () => {
    const items = [
      makeItem({ id: 'a1', nombre: 'Casco', bodega_nombre: 'Bodega Central', proyecto_nombre: null }),
      makeItem({ id: 'a2', nombre: 'Guantes', bodega_nombre: 'Bodega Norte', proyecto_nombre: null }),
    ];
    render(<AdminInventoryScopedAssetCards {...makeBaseProps()} items={items} />);
    const input = screen.getByPlaceholderText(/nombre/i);
    type(input, 'central');
    expect(screen.getByText('Casco')).toBeInTheDocument();
    expect(screen.queryByText('Guantes')).not.toBeInTheDocument();
  });

  it('filters by proyecto_nombre', () => {
    const items = [
      makeItem({ id: 'a1', nombre: 'Casco', bodega_nombre: null, proyecto_nombre: 'Faena Norte' }),
      makeItem({ id: 'a2', nombre: 'Guantes', bodega_nombre: null, proyecto_nombre: 'Faena Sur' }),
    ];
    render(<AdminInventoryScopedAssetCards {...makeBaseProps()} items={items} />);
    const input = screen.getByPlaceholderText(/nombre/i);
    type(input, 'norte');
    expect(screen.getByText('Casco')).toBeInTheDocument();
    expect(screen.queryByText('Guantes')).not.toBeInTheDocument();
  });

  it('filters by especialidad raw key', () => {
    const items = [
      makeItem({ id: 'a1', nombre: 'Casco', especialidades: ['oocc'] }),
      makeItem({ id: 'a2', nombre: 'Guantes', especialidades: ['ooee'] }),
    ];
    render(<AdminInventoryScopedAssetCards {...makeBaseProps()} items={items} />);
    const input = screen.getByPlaceholderText(/nombre/i);
    type(input, 'oocc');
    expect(screen.getByText('Casco')).toBeInTheDocument();
    expect(screen.queryByText('Guantes')).not.toBeInTheDocument();
  });

  it('filters by especialidad display label (verticales)', () => {
    const items = [
      makeItem({ id: 'a1', nombre: 'Arnés', especialidades: ['trabajos_verticales_lineas_de_vida'] }),
      makeItem({ id: 'a2', nombre: 'Casco', especialidades: ['oocc'] }),
    ];
    render(<AdminInventoryScopedAssetCards {...makeBaseProps()} items={items} />);
    const input = screen.getByPlaceholderText(/nombre/i);
    type(input, 'verticales');
    expect(screen.getByText('Arnés')).toBeInTheDocument();
    expect(screen.queryByText('Casco')).not.toBeInTheDocument();
  });

  it('shows all items when search is empty', () => {
    const items = [
      makeItem({ id: 'a1', nombre: 'Casco' }),
      makeItem({ id: 'a2', nombre: 'Guantes' }),
    ];
    render(<AdminInventoryScopedAssetCards {...makeBaseProps()} items={items} />);
    expect(screen.getByText('Casco')).toBeInTheDocument();
    expect(screen.getByText('Guantes')).toBeInTheDocument();
  });

  it('search is case-insensitive', () => {
    const items = [makeItem({ id: 'a1', nombre: 'Casco', marca: 'Bosch' })];
    render(<AdminInventoryScopedAssetCards {...makeBaseProps()} items={items} />);
    const input = screen.getByPlaceholderText(/nombre/i);
    type(input, 'BOSCH');
    expect(screen.getByText('Casco')).toBeInTheDocument();
  });

  it('shows no items when search matches nothing', () => {
    const items = [
      makeItem({ id: 'a1', nombre: 'Casco', marca: 'Bosch', modelo: 'V1', nro_serie: 'SN-1', codigo: 'C-1' }),
      makeItem({ id: 'a2', nombre: 'Guantes', marca: 'DeWalt', modelo: 'G2', nro_serie: 'SN-2', codigo: 'C-2' }),
    ];
    render(<AdminInventoryScopedAssetCards {...makeBaseProps()} items={items} />);
    const input = screen.getByPlaceholderText(/nombre/i);
    type(input, 'xyznotexist999');
    expect(screen.queryByText('Casco')).not.toBeInTheDocument();
    expect(screen.queryByText('Guantes')).not.toBeInTheDocument();
  });
});
