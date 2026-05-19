import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminInventoryScopedAssetListView from '../pages/admin/inventory/AdminInventoryScopedAssetListView';
import type { Articulo } from '../services/apiService';

const BASE: Articulo = {
  id: 'art-1',
  tipo: 'epp',
  nombre: 'Casco tipo II',
  marca: '3M',
  modelo: 'V200',
  descripcion: undefined,
  nro_serie: 'SN-001',
  codigo: 'EPP-0001',
  valor: 18500,
  foto_url: null,
  estado: 'en_stock',
  bodega_actual_id: 'bod-1',
  bodega_nombre: 'Bodega Sur',
  proyecto_actual_id: null,
  proyecto_nombre: null,
  especialidades: [],
  fecha_vencimiento: null,
  creado_en: '2024-01-01T00:00:00.000Z',
  creado_por_email: null,
};

describe('AdminInventoryScopedAssetListView — rendering', () => {
  it('renders article data in table cells', () => {
    render(
      <AdminInventoryScopedAssetListView
        items={[BASE]}
        onSelect={vi.fn()}
        isLoading={false}
        emptyMessage="Sin artículos"
      />
    );
    expect(screen.getByText('Casco tipo II')).toBeInTheDocument();
    expect(screen.getByText('EPP-0001')).toBeInTheDocument();
    expect(screen.getByText('En stock')).toBeInTheDocument();
    expect(screen.getByText('Bodega Sur')).toBeInTheDocument();
    expect(screen.getByText('3M · V200')).toBeInTheDocument();
  });

  it('renders column header "Vence"', () => {
    render(
      <AdminInventoryScopedAssetListView
        items={[BASE]}
        onSelect={vi.fn()}
        isLoading={false}
        emptyMessage="Sin artículos"
      />
    );
    expect(screen.getByRole('columnheader', { name: 'Vence' })).toBeInTheDocument();
  });

  it('shows empty message when items is empty', () => {
    render(
      <AdminInventoryScopedAssetListView
        items={[]}
        onSelect={vi.fn()}
        isLoading={false}
        emptyMessage="Sin artículos"
      />
    );
    expect(screen.getByText('Sin artículos')).toBeInTheDocument();
  });

  it('renders without crashing when isLoading is true', () => {
    render(
      <AdminInventoryScopedAssetListView
        items={[]}
        onSelect={vi.fn()}
        isLoading={true}
        emptyMessage="Sin artículos"
      />
    );
    // Component renders (no crash) — loading state owned by ResponsiveTable
    expect(document.body).toBeTruthy();
  });
});

describe('AdminInventoryScopedAssetListView — row click', () => {
  it('calls onSelect with article id when row is clicked', () => {
    const onSelect = vi.fn();
    render(
      <AdminInventoryScopedAssetListView
        items={[BASE]}
        onSelect={onSelect}
        isLoading={false}
        emptyMessage="Sin artículos"
      />
    );
    fireEvent.click(screen.getByText('Casco tipo II'));
    expect(onSelect).toHaveBeenCalledWith('art-1');
  });
});

describe('AdminInventoryScopedAssetListView — Vence column', () => {
  it('shows "—" when fecha_vencimiento is null', () => {
    render(
      <AdminInventoryScopedAssetListView
        items={[{ ...BASE, fecha_vencimiento: null }]}
        onSelect={vi.fn()}
        isLoading={false}
        emptyMessage="Sin artículos"
      />
    );
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('shows red warning when fecha_vencimiento is in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T00:00:00.000Z'));
    render(
      <AdminInventoryScopedAssetListView
        items={[{ ...BASE, fecha_vencimiento: '2026-04-01T00:00:00.000Z' }]}
        onSelect={vi.fn()}
        isLoading={false}
        emptyMessage="Sin artículos"
      />
    );
    const el = screen.getByText('01/04/2026 ⚠');
    expect(el).toHaveClass('text-red-600');
    vi.useRealTimers();
  });

  it('shows amber warning when fecha_vencimiento is within 30 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T00:00:00.000Z'));
    render(
      <AdminInventoryScopedAssetListView
        items={[{ ...BASE, fecha_vencimiento: '2026-06-01T00:00:00.000Z' }]}
        onSelect={vi.fn()}
        isLoading={false}
        emptyMessage="Sin artículos"
      />
    );
    const el = screen.getByText('01/06/2026 ⚠');
    expect(el).toHaveClass('text-amber-600');
    vi.useRealTimers();
  });

  it('shows plain text when fecha_vencimiento is more than 30 days away', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T00:00:00.000Z'));
    render(
      <AdminInventoryScopedAssetListView
        items={[{ ...BASE, fecha_vencimiento: '2026-08-01T00:00:00.000Z' }]}
        onSelect={vi.fn()}
        isLoading={false}
        emptyMessage="Sin artículos"
      />
    );
    const el = screen.getByText('01/08/2026');
    expect(el).not.toHaveClass('text-red-600');
    expect(el).not.toHaveClass('text-amber-600');
    vi.useRealTimers();
  });
});
