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

vi.mock('../components/forms/EditarActivoModal', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="editar-activo-modal">
      <button onClick={onClose}>Cerrar editar</button>
    </div>
  ),
}));

vi.mock('../services/apiService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/apiService')>();
  return {
    ...original,
    getActivoProfile: vi.fn().mockResolvedValue({
      id: 'aaa',
      tipo: 'epp',
      nombre: 'Casco',
      codigo: 'EPP-001',
      nro_serie: 'SN-ABC',
      estado: 'en_stock',
      valor: 25000,
      fecha_vencimiento: null,
      foto_url: null,
      bodega_actual_id: null,
      bodega_nombre: null,
      proyecto_actual_id: null,
      proyecto_nombre: null,
      creado_en: '2026-01-01T00:00:00.000Z',
      custodia_activa: null,
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

  it('renders "Editar artículo" button', async () => {
    render(<ActivoProfileModal activoId="aaa" onClose={() => {}} />, { wrapper });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /editar artículo/i })).toBeInTheDocument();
    });
  });
});
