import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InventoryLocationPieChart from '../components/dashboard/InventoryLocationPieChart';
import type { Articulo } from '../services/apiService';

const makeItem = (overrides: Partial<Articulo> = {}): Articulo => ({
  id: 'art-1',
  tipo: 'epp',
  nombre: 'Casco',
  nro_serie: 'SN-1',
  codigo: 'EPP-001',
  valor: 0,
  estado: 'en_stock',
  especialidades: [],
  creado_en: '2024-01-01T00:00:00.000Z',
  bodega_actual_id: null,
  bodega_nombre: null,
  bodega_ciudad: null,
  proyecto_actual_id: null,
  proyecto_nombre: null,
  proyecto_ciudad: null,
  ...overrides,
});

const ITEMS: Articulo[] = [
  makeItem({ id: '1', bodega_ciudad: 'Santiago' }),
  makeItem({ id: '2', bodega_ciudad: 'Santiago' }),
  makeItem({ id: '3', bodega_ciudad: 'Valparaíso' }),
  makeItem({ id: '4', bodega_ciudad: null, proyecto_ciudad: null }),
];

describe('InventoryLocationPieChart', () => {
  it('renders loading skeleton when isLoading=true', () => {
    const { container } = render(
      <InventoryLocationPieChart items={[]} isLoading={true} onCityClick={vi.fn()} />
    );
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders "sin datos" message when fewer than 2 cities', () => {
    const items = [makeItem({ id: '1', bodega_ciudad: 'Santiago' })];
    render(<InventoryLocationPieChart items={items} isLoading={false} onCityClick={vi.fn()} />);
    expect(screen.getByText(/sin datos suficientes/i)).toBeInTheDocument();
  });

  it('renders a slice label for each unique city', () => {
    render(<InventoryLocationPieChart items={ITEMS} isLoading={false} onCityClick={vi.fn()} />);
    expect(screen.getByText('Santiago')).toBeInTheDocument();
    expect(screen.getByText('Valparaíso')).toBeInTheDocument();
    expect(screen.getByText('Sin ubicación')).toBeInTheDocument();
  });

  it('shows total article count badge', () => {
    render(<InventoryLocationPieChart items={ITEMS} isLoading={false} onCityClick={vi.fn()} />);
    expect(screen.getByText(`${ITEMS.length} artículos`)).toBeInTheDocument();
  });

  it('shows "Ver inventario" strip after clicking a slice', () => {
    render(<InventoryLocationPieChart items={ITEMS} isLoading={false} onCityClick={vi.fn()} />);
    const santiagoSlice = screen.getAllByRole('group').find(el =>
      el.getAttribute('aria-label')?.startsWith('Santiago')
    );
    expect(santiagoSlice).toBeDefined();
    fireEvent.click(santiagoSlice!);
    expect(screen.getByText(/ver inventario/i)).toBeInTheDocument();
  });

  it('calls onCityClick with city string when "Ver inventario" is clicked', () => {
    const onCityClick = vi.fn();
    render(<InventoryLocationPieChart items={ITEMS} isLoading={false} onCityClick={onCityClick} />);
    const santiagoSlice = screen.getAllByRole('group').find(el =>
      el.getAttribute('aria-label')?.startsWith('Santiago')
    );
    fireEvent.click(santiagoSlice!);
    fireEvent.click(screen.getByRole('button', { name: /ver inventario/i }));
    expect(onCityClick).toHaveBeenCalledWith('Santiago');
  });

  it('calls onCityClick with null for "Sin ubicación"', () => {
    const onCityClick = vi.fn();
    render(<InventoryLocationPieChart items={ITEMS} isLoading={false} onCityClick={onCityClick} />);
    const sinUbicacionSlice = screen.getAllByRole('group').find(el =>
      el.getAttribute('aria-label')?.startsWith('Sin ubicación')
    );
    fireEvent.click(sinUbicacionSlice!);
    fireEvent.click(screen.getByRole('button', { name: /ver inventario/i }));
    expect(onCityClick).toHaveBeenCalledWith(null);
  });
});
