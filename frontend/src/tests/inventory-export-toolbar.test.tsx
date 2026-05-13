import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../pages/admin/inventory/AdminInventoryScopedAssetCards', () => ({
  default: () => <div data-testid="asset-cards" />,
}));

vi.mock('../hooks/useExcelExport', () => ({
  useExcelExport: () => ({ exportToExcel: vi.fn() }),
}));

const mockDownloadPdf = vi.fn().mockResolvedValue(undefined);
vi.mock('../hooks/usePdfDownload', () => ({
  usePdfDownload: () => ({ downloadPdf: mockDownloadPdf, isLoading: false }),
}));

const mockGetAll = vi.hoisted(() =>
  vi.fn().mockResolvedValue([{ codigo: 'A1', articulo_nombre: 'Casco', estado: 'ok' }])
);
const mockCreateArticulo = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ id: 'art-new', nombre: 'Casco' })
);
vi.mock('../services/apiService', () => ({
  getInventoryActivosAll: mockGetAll,
  createArticulo: mockCreateArticulo,
}));

vi.mock('../components/forms/ArticleFormModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="article-form-modal" /> : null,
}));

import AdminInventoryScopedAssetPage from '../pages/admin/inventory/AdminInventoryScopedAssetPage';

const createWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('AdminInventoryScopedAssetPage export toolbar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders PDF and Excel export buttons', () => {
    render(<AdminInventoryScopedAssetPage scope="epp" />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: /exportar pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar excel/i })).toBeInTheDocument();
  });

  it('calls downloadPdf with correct URL when PDF button clicked', async () => {
    render(<AdminInventoryScopedAssetPage scope="epp" />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByRole('button', { name: /exportar pdf/i }));
    await waitFor(() => {
      expect(mockDownloadPdf).toHaveBeenCalledWith(
        '/inventario/export/pdf?categoria=epp',
        expect.stringMatching(/inventario-epp/)
      );
    });
  });
});

describe('AdminInventoryScopedAssetPage — Nuevo artículo button', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders "Nuevo artículo" button for epp scope', () => {
    render(<AdminInventoryScopedAssetPage scope="epp" />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: /nuevo artículo/i })).toBeInTheDocument();
  });

  it('renders "Nuevo artículo" button for herramientas scope', () => {
    render(<AdminInventoryScopedAssetPage scope="herramientas" />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: /nuevo artículo/i })).toBeInTheDocument();
  });

  it('renders "Nuevo artículo" button for equipos scope', () => {
    render(<AdminInventoryScopedAssetPage scope="equipos" />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: /nuevo artículo/i })).toBeInTheDocument();
  });
});
