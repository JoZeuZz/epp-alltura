import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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
vi.mock('../services/apiService', () => ({
  getInventoryActivosAll: mockGetAll,
}));

import AdminInventoryScopedAssetPage from '../pages/admin/inventory/AdminInventoryScopedAssetPage';

describe('AdminInventoryScopedAssetPage export toolbar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders PDF and Excel export buttons', () => {
    render(<AdminInventoryScopedAssetPage scope="epp" />);
    expect(screen.getByRole('button', { name: /exportar pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exportar excel/i })).toBeInTheDocument();
  });

  it('calls downloadPdf with correct URL when PDF button clicked', async () => {
    render(<AdminInventoryScopedAssetPage scope="epp" />);
    fireEvent.click(screen.getByRole('button', { name: /exportar pdf/i }));
    await waitFor(() => {
      expect(mockDownloadPdf).toHaveBeenCalledWith(
        '/inventario/export/pdf?categoria=epp',
        expect.stringMatching(/inventario-epp/)
      );
    });
  });
});
