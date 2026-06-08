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
  makeItem({ id: '1', bodega_nombre: 'Bodega Santiago' }),
  makeItem({ id: '2', bodega_nombre: 'Bodega Santiago' }),
  makeItem({ id: '3', bodega_nombre: 'Bodega Valparaíso' }),
  makeItem({ id: '4', bodega_nombre: null, proyecto_nombre: null }),
];

describe('InventoryLocationPieChart', () => {
  it('renders loading skeleton when isLoading=true', () => {
    const { container } = render(
      <InventoryLocationPieChart items={[]} isLoading={true} onLocationClick={vi.fn()} />
    );
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders "sin datos" message when fewer than 2 cities', () => {
    const items = [makeItem({ id: '1', bodega_nombre: 'Bodega Santiago' })];
    render(<InventoryLocationPieChart items={items} isLoading={false} onLocationClick={vi.fn()} />);
    expect(screen.getByText(/sin datos suficientes/i)).toBeInTheDocument();
  });

  it('renders a slice label for each unique location', () => {
    render(<InventoryLocationPieChart items={ITEMS} isLoading={false} onLocationClick={vi.fn()} />);
    expect(screen.getByText('Bodega Santiago')).toBeInTheDocument();
    expect(screen.getByText('Bodega Valparaíso')).toBeInTheDocument();
    expect(screen.getByText('Sin ubicación')).toBeInTheDocument();
  });

  it('shows total article count badge', () => {
    render(<InventoryLocationPieChart items={ITEMS} isLoading={false} onLocationClick={vi.fn()} />);
    expect(screen.getByText(`${ITEMS.length} artículos`)).toBeInTheDocument();
  });

  it('shows "Ver inventario" strip after clicking a slice', () => {
    render(<InventoryLocationPieChart items={ITEMS} isLoading={false} onLocationClick={vi.fn()} />);
    const bodegaSantiagoSlice = screen.getAllByRole('group').find(el =>
      el.getAttribute('aria-label')?.startsWith('Bodega Santiago')
    );
    expect(bodegaSantiagoSlice).toBeDefined();
    fireEvent.click(bodegaSantiagoSlice!);
    expect(screen.getByText(/ver inventario/i)).toBeInTheDocument();
  });

  it('calls onLocationClick with location string when "Ver inventario" is clicked', () => {
    const onLocationClick = vi.fn();
    render(<InventoryLocationPieChart items={ITEMS} isLoading={false} onLocationClick={onLocationClick} />);
    const slice = screen.getAllByRole('group').find(el =>
      el.getAttribute('aria-label')?.startsWith('Bodega Santiago')
    );
    fireEvent.click(slice!);
    fireEvent.click(screen.getByRole('button', { name: /ver inventario/i }));
    expect(onLocationClick).toHaveBeenCalledWith('Bodega Santiago');
  });

  it('calls onLocationClick with null for "Sin ubicación"', () => {
    const onLocationClick = vi.fn();
    render(<InventoryLocationPieChart items={ITEMS} isLoading={false} onLocationClick={onLocationClick} />);
    const slice = screen.getAllByRole('group').find(el =>
      el.getAttribute('aria-label')?.startsWith('Sin ubicación')
    );
    fireEvent.click(slice!);
    fireEvent.click(screen.getByRole('button', { name: /ver inventario/i }));
    expect(onLocationClick).toHaveBeenCalledWith(null);
  });

  it('truncates labels longer than 18 chars and shows full name in strip', () => {
    const longName = 'Bodega Central Antofagasta Norte';
    const onLocationClick = vi.fn();
    const items = [
      makeItem({ id: '1', bodega_nombre: longName }),
      makeItem({ id: '2', bodega_nombre: 'Bodega Sur' }),
    ];
    render(<InventoryLocationPieChart items={items} isLoading={false} onLocationClick={onLocationClick} />);

    // El SVG label debe mostrar versión truncada (slice(0,18) + '…')
    // "Bodega Central Antofagasta Norte".slice(0,18) === "Bodega Central Ant"
    expect(screen.getByText('Bodega Central Ant…')).toBeInTheDocument();
    // El nombre completo NO debe aparecer en el DOM antes de hacer click
    expect(screen.queryByText(longName)).not.toBeInTheDocument();

    // Hacer click en el sector con nombre largo
    const slice = screen.getAllByRole('group').find(el =>
      el.getAttribute('aria-label')?.startsWith(longName)
    );
    fireEvent.click(slice!);

    // La franja inferior muestra el nombre completo
    expect(screen.getByText(longName)).toBeInTheDocument();

    // Click en "Ver inventario" llama onLocationClick con el nombre completo sin truncar
    fireEvent.click(screen.getByRole('button', { name: /ver inventario/i }));
    expect(onLocationClick).toHaveBeenCalledWith(longName);
  });

  it('groups by proyecto_nombre when bodega_nombre is null', () => {
    const items = [
      makeItem({ id: '1', bodega_nombre: null, proyecto_nombre: 'Proyecto Minera' }),
      makeItem({ id: '2', bodega_nombre: null, proyecto_nombre: 'Proyecto Minera' }),
      makeItem({ id: '3', bodega_nombre: 'Bodega Sur', proyecto_nombre: null }),
    ];
    render(<InventoryLocationPieChart items={items} isLoading={false} onLocationClick={vi.fn()} />);
    expect(screen.getByText('Proyecto Minera')).toBeInTheDocument();
    expect(screen.getByText('Bodega Sur')).toBeInTheDocument();
  });
});
