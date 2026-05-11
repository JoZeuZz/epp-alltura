import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Modal uses focus-trap-react — stub it
vi.mock('focus-trap-react', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// useGet is used for trabajadores/bodegas/proyectos/articulos lookups — return empty arrays
vi.mock('../hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks')>();
  return {
    ...actual,
    useGet: vi.fn().mockReturnValue({ data: [], isLoading: false, error: null }),
  };
});

const mockDownloadPdf = vi.fn().mockResolvedValue(undefined);
vi.mock('../hooks/usePdfDownload', () => ({
  usePdfDownload: () => ({ downloadPdf: mockDownloadPdf, isLoading: false }),
}));

vi.mock('../services/apiService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/apiService')>();
  return {
    ...original,
    getActivoProfile: vi.fn().mockResolvedValue({
      id: 'aaa',
      codigo: 'EPP-001',
      nro_serie: 'SN-ABC',
      articulo_id: 'art-1',
      articulo_nombre: 'Casco',
      estado: 'disponible',
      valor: null,
      fecha_vencimiento: null,
      foto_url: null,
      ubicacion_actual_id: null,
      ubicacion_nombre: null,
      custodia_activa: null,
      compra: null,
      timeline: [
        {
          id: 't1',
          tipo: 'entrega',
          fecha_movimiento: new Date().toISOString(),
          entrega_id: 'ent-001',
        },
      ],
      custodias: [],
      estadisticas: { total_entregas: 1, total_devoluciones: 0, dias_total_custodia: 0 },
    }),
    getEntregaById: vi.fn().mockResolvedValue(null),
  };
});

import ActivoProfileModal from '../components/forms/ActivoProfileModal';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('ActivoProfileModal PDF downloads', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders "Descargar ficha PDF" button', async () => {
    render(<ActivoProfileModal activoId="aaa" onClose={() => {}} />, { wrapper });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /descargar ficha pdf/i })).toBeInTheDocument();
    });
  });

  it('calls downloadPdf with activo id when ficha button clicked', async () => {
    render(<ActivoProfileModal activoId="aaa" onClose={() => {}} />, { wrapper });
    await waitFor(() => screen.getByRole('button', { name: /descargar ficha pdf/i }));
    fireEvent.click(screen.getByRole('button', { name: /descargar ficha pdf/i }));
    await waitFor(() => {
      expect(mockDownloadPdf).toHaveBeenCalledWith(
        '/inventario/activos/aaa/pdf',
        expect.stringMatching(/ficha-activo/)
      );
    });
  });

  it('renders download button for timeline entrega entries', async () => {
    render(<ActivoProfileModal activoId="aaa" onClose={() => {}} />, { wrapper });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /acta/i })).toBeInTheDocument();
    });
  });
});
