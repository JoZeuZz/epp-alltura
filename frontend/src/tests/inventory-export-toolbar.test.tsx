import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../pages/admin/inventory/AdminInventoryScopedAssetCards', () => ({
  default: () => <div data-testid="asset-cards" />,
}));

const mockGetArticulos = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ items: [], total: 0 })
);
vi.mock('../services/apiService', () => ({
  getArticulos: mockGetArticulos,
}));

const mockUseGet = vi.hoisted(() => vi.fn(() => ({ data: [] })));
const mockUseTour = vi.hoisted(() =>
  vi.fn(() => ({ isActive: false, currentDemoAction: null }))
);
vi.mock('../hooks', () => ({
  useGet: mockUseGet,
  useTour: mockUseTour,
}));

vi.mock('../components/ArticuloCreateModal', () => ({
  ArticuloCreateModal: ({ isOpen, tipo }: { isOpen: boolean; tipo: string }) =>
    isOpen ? <div data-testid="articulo-create-modal">{tipo}</div> : null,
}));

import AdminInventoryScopedAssetPage from '../pages/admin/inventory/AdminInventoryScopedAssetPage';

const createWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('AdminInventoryScopedAssetPage — scoped header', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the scoped page title for epp', () => {
    render(<AdminInventoryScopedAssetPage scope="epp" />, { wrapper: createWrapper() });
    expect(screen.getByRole('heading', { name: /gestor de epp/i })).toBeInTheDocument();
  });

  it('queries articulos with the scoped tipo', async () => {
    render(<AdminInventoryScopedAssetPage scope="herramientas" />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(mockGetArticulos).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'herramienta' })
      );
    });
  });
});

describe('AdminInventoryScopedAssetPage — Nuevo artículo button', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders "Nuevo" button for epp scope', () => {
    render(<AdminInventoryScopedAssetPage scope="epp" />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: /nuevo epp/i })).toBeInTheDocument();
  });

  it('renders "Nuevo" button for herramientas scope', () => {
    render(<AdminInventoryScopedAssetPage scope="herramientas" />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: /nuevo herramienta/i })).toBeInTheDocument();
  });

  it('renders "Nuevo" button for equipos scope', () => {
    render(<AdminInventoryScopedAssetPage scope="equipos" />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: /nuevo equipo/i })).toBeInTheDocument();
  });

  it('opens the ArticuloCreateModal when the button is clicked', () => {
    render(<AdminInventoryScopedAssetPage scope="epp" />, { wrapper: createWrapper() });
    expect(screen.queryByTestId('articulo-create-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /nuevo epp/i }));
    expect(screen.getByTestId('articulo-create-modal')).toBeInTheDocument();
  });
});

describe('AdminInventoryScopedAssetPage — tabs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders Dashboard and Inventario tab buttons', () => {
    render(<AdminInventoryScopedAssetPage scope="epp" />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: /^dashboard$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^inventario$/i })).toBeInTheDocument();
  });

  it('shows KPI section by default (dashboard tab)', () => {
    render(<AdminInventoryScopedAssetPage scope="epp" />, { wrapper: createWrapper() });
    expect(screen.getByRole('region', { name: /kpis de epp/i })).toBeInTheDocument();
    expect(screen.queryByTestId('asset-cards')).not.toBeInTheDocument();
  });

  it('shows asset cards after clicking Inventario tab', () => {
    render(<AdminInventoryScopedAssetPage scope="epp" />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /^inventario$/i }));
    expect(screen.getByTestId('asset-cards')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /kpis de epp/i })).not.toBeInTheDocument();
  });

  it('returns to Dashboard KPIs after clicking Dashboard tab again', () => {
    render(<AdminInventoryScopedAssetPage scope="epp" />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /^inventario$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^dashboard$/i }));
    expect(screen.getByRole('region', { name: /kpis de epp/i })).toBeInTheDocument();
    expect(screen.queryByTestId('asset-cards')).not.toBeInTheDocument();
  });

  it('Nuevo button is visible on Dashboard tab', () => {
    render(<AdminInventoryScopedAssetPage scope="epp" />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: /nuevo epp/i })).toBeInTheDocument();
  });

  it('Nuevo button is visible on Inventario tab', () => {
    render(<AdminInventoryScopedAssetPage scope="epp" />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /^inventario$/i }));
    expect(screen.getByRole('button', { name: /nuevo epp/i })).toBeInTheDocument();
  });
});
