import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock window.matchMedia for useElasticScroll in alltura-ui
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Stub focus-trap-react
vi.mock('focus-trap-react', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// Hoist toast mocks so they can be referenced in vi.mock factories
const mockToastSuccess = vi.hoisted(() => vi.fn());
const mockToastError   = vi.hoisted(() => vi.fn());
vi.mock('react-hot-toast', () => ({
  default: { success: mockToastSuccess, error: mockToastError },
}));

// Hoist apiService mocks
const mockGetActivoProfile  = vi.hoisted(() => vi.fn());
const mockGetEntregaById    = vi.hoisted(() => vi.fn());
const mockCreateEntrega     = vi.hoisted(() => vi.fn());
const mockCambiarEstado     = vi.hoisted(() => vi.fn());

vi.mock('../services/apiService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/apiService')>();
  return {
    ...original,
    getActivoProfile:    mockGetActivoProfile,
    getEntregaById:      mockGetEntregaById,
    createEntrega:       mockCreateEntrega,
    cambiarEstadoArticulo: mockCambiarEstado,
  };
});

// Hooks
vi.mock('../hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks')>();
  return {
    ...actual,
    useGet:  vi.fn().mockReturnValue({ data: [], isLoading: false, error: null }),
    useAuth: vi.fn().mockReturnValue({ user: { id: 'user-1', role: 'admin' } }),
    useTour: vi.fn().mockReturnValue({ isActive: false, currentDemoAction: null }),
  };
});

vi.mock('../hooks/usePdfDownload', () => ({
  usePdfDownload: () => ({ downloadPdf: vi.fn().mockResolvedValue(undefined), isLoading: false }),
}));

// Child modals — stubbed so their internal network calls don't interfere
vi.mock('../components/forms/EntregaCreateModal', () => ({
  default: ({ onSubmit, onClose, isOpen }: any) =>
    isOpen ? (
      <div data-testid="entrega-create-modal">
        <button
          onClick={() =>
            onSubmit({
              trabajador_id: 'w1',
              ubicacion_origen_id: 'b1',
              ubicacion_destino_id: 'p1',
              detalles: [],
            })
          }
        >
          Submit entrega
        </button>
        <button onClick={onClose}>Cerrar entrega</button>
      </div>
    ) : null,
}));

vi.mock('../components/forms/EntregaFirmaModal', () => ({
  default: ({ isOpen, onClose, onCompleted }: any) =>
    isOpen ? (
      <div data-testid="entrega-firma-modal">
        <button onClick={onCompleted}>Completar firma entrega</button>
        <button onClick={onClose}>Cerrar firma entrega</button>
      </div>
    ) : null,
}));

vi.mock('../components/forms/DevolucionActivoModal', () => ({
  default: ({ onClose, onDraftCreated }: any) => (
    <div data-testid="devolucion-activo-modal">
      <button
        onClick={() =>
          onDraftCreated({ id: 'dev-1', estado: 'borrador', trabajador_id: 'w1' })
        }
      >
        Crear devolucion
      </button>
      <button onClick={onClose}>Cerrar devolucion</button>
    </div>
  ),
}));

vi.mock('../components/forms/DevolucionFirmaModal', () => ({
  default: ({ isOpen, onClose, onCompleted }: any) =>
    isOpen ? (
      <div data-testid="devolucion-firma-modal">
        <button onClick={onCompleted}>Completar firma devolucion</button>
        <button onClick={onClose}>Cerrar firma devolucion</button>
      </div>
    ) : null,
}));

vi.mock('../components/forms/EditarActivoModal', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="editar-activo-modal">
      <button onClick={onClose}>Cerrar editar</button>
    </div>
  ),
}));

vi.mock('../components/forms/ActaDetailModal', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="acta-detail-modal">
      <button onClick={onClose}>Cerrar acta</button>
    </div>
  ),
}));

import ActivoProfileModal from '../components/forms/ActivoProfileModal';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_PROFILE = {
  id: 'aaa',
  tipo: 'epp' as const,
  nombre: 'Casco',
  codigo: 'EPP-001',
  nro_serie: 'SN-ABC',
  estado: 'en_stock' as const,
  valor: 25000,
  fecha_vencimiento: null,
  fecha_compra: null,
  foto_url: null,
  foto_color_dominante: null,
  bodega_actual_id: null,
  bodega_nombre: null,
  proyecto_actual_id: null,
  proyecto_nombre: null,
  proveedor_id: null,
  proveedor_nombre: null,
  factura_url: null,
  manual_url: null,
  descripcion: null,
  marca: null,
  modelo: null,
  especialidades: [],
  certificaciones: [],
  creado_en: '2026-01-01T00:00:00.000Z',
  custodia_activa: null,
  timeline: [],
  custodias: [],
  estadisticas: { total_entregas: 0, total_devoluciones: 0, dias_total_custodia: 0 },
  alerta_devolucion: false,
};

const PROFILE_WITH_CUSTODIA = {
  ...BASE_PROFILE,
  estado: 'asignado' as const,
  custodia_activa: {
    id: 'cust-1',
    trabajador_id: 'w1',
    entrega_id: 'ent-1',
    ubicacion_destino_id: null,
    desde_en: '2026-01-01T00:00:00.000Z',
    hasta_en: null,
    estado: 'activa',
    custodio_nombres: 'Juan',
    custodio_apellidos: 'Pérez',
    custodia_ubicacion_nombre: 'Faena Norte',
    dias_en_custodia: 30,
  },
};

const DRAFT_ENTREGA = {
  id: 'ent-draft-1',
  creado_por_usuario_id: 'user-1',
  trabajador_id: 'w1',
  ubicacion_origen_id: 'b1',
  ubicacion_destino_id: 'p1',
  tipo: 'entrega' as const,
  estado: 'borrador' as const,
  nombres: 'Juan',
  apellidos: 'Pérez',
  rut: '12.345.678-9',
  creado_en: new Date().toISOString(),
  detalles: [],
};

// Fresh QueryClient per test to avoid cache bleed
const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ActivoProfileModal workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActivoProfile.mockResolvedValue(BASE_PROFILE);
    mockGetEntregaById.mockResolvedValue(null);
    mockCreateEntrega.mockResolvedValue(DRAFT_ENTREGA);
    mockCambiarEstado.mockResolvedValue({ id: 'aaa', estado: 'mantencion' });
  });

  // ── Smoke ────────────────────────────────────────────────────────────────────

  it('smoke: renderiza el nombre del artículo tras cargar el perfil', async () => {
    render(<ActivoProfileModal activoId="aaa" onClose={vi.fn()} />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getAllByText('Casco')[0]).toBeInTheDocument();
    });
  });

  // ── Entregar ─────────────────────────────────────────────────────────────────

  it('botón Entregar habilitado cuando estado es en_stock', async () => {
    render(<ActivoProfileModal activoId="aaa" onClose={vi.fn()} />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getAllByText('Casco')[0]);
    expect(screen.getByRole('button', { name: 'Entregar' })).not.toBeDisabled();
  });

  it('botón Entregar deshabilitado cuando artículo no está en_stock', async () => {
    mockGetActivoProfile.mockResolvedValue({ ...BASE_PROFILE, estado: 'asignado' });
    render(<ActivoProfileModal activoId="aaa" onClose={vi.fn()} />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getAllByText('Casco')[0]);
    expect(screen.getByRole('button', { name: 'Entregar' })).toBeDisabled();
  });

  it('click Entregar → muestra EntregaCreateModal', async () => {
    render(<ActivoProfileModal activoId="aaa" onClose={vi.fn()} />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getAllByText('Casco')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Entregar' }));
    expect(screen.getByTestId('entrega-create-modal')).toBeInTheDocument();
  });

  it('entregaMutation éxito → transiciona a EntregaFirmaModal con toast', async () => {
    render(<ActivoProfileModal activoId="aaa" onClose={vi.fn()} />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getAllByText('Casco')[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Entregar' }));
    await waitFor(() => screen.getByTestId('entrega-create-modal'));

    fireEvent.click(screen.getByRole('button', { name: 'Submit entrega' }));

    await waitFor(() => {
      expect(screen.getByTestId('entrega-firma-modal')).toBeInTheDocument();
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('Entrega creada')
      );
    });
  });

  it('entregaMutation error → toast.error con mensaje de la API', async () => {
    mockCreateEntrega.mockRejectedValue(new Error('Artículo no disponible'));
    render(<ActivoProfileModal activoId="aaa" onClose={vi.fn()} />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getAllByText('Casco')[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Entregar' }));
    await waitFor(() => screen.getByTestId('entrega-create-modal'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit entrega' }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
      expect(screen.queryByTestId('entrega-firma-modal')).not.toBeInTheDocument();
    });
  });

  // ── Devolver ─────────────────────────────────────────────────────────────────

  it('botón Devolver deshabilitado cuando no hay custodia activa', async () => {
    render(<ActivoProfileModal activoId="aaa" onClose={vi.fn()} />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getAllByText('Casco')[0]);
    expect(screen.getByRole('button', { name: 'Devolver' })).toBeDisabled();
  });

  it('click Devolver con custodia activa → muestra DevolucionActivoModal', async () => {
    mockGetActivoProfile.mockResolvedValue(PROFILE_WITH_CUSTODIA);
    render(<ActivoProfileModal activoId="aaa" onClose={vi.fn()} />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getAllByText('Casco')[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Devolver' }));
    expect(screen.getByTestId('devolucion-activo-modal')).toBeInTheDocument();
  });

  // ── Cambio de estado ─────────────────────────────────────────────────────────

  it('estadoMutation éxito → toast.success y llama onRefresh', async () => {
    const onRefresh = vi.fn();
    render(
      <ActivoProfileModal activoId="aaa" onClose={vi.fn()} onRefresh={onRefresh} />,
      { wrapper: makeWrapper() }
    );
    await waitFor(() => screen.getAllByText('Casco')[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Enviar a mantención' }));

    await waitFor(() => {
      expect(mockCambiarEstado).toHaveBeenCalledWith('aaa', { nuevo_estado: 'mantencion' });
      expect(mockToastSuccess).toHaveBeenCalledWith('Estado del artículo actualizado.');
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('estadoMutation error → toast.error, no llama onRefresh', async () => {
    mockCambiarEstado.mockRejectedValue(new Error('Operación no permitida'));
    const onRefresh = vi.fn();
    render(
      <ActivoProfileModal activoId="aaa" onClose={vi.fn()} onRefresh={onRefresh} />,
      { wrapper: makeWrapper() }
    );
    await waitFor(() => screen.getAllByText('Casco')[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Enviar a mantención' }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
    expect(onRefresh).not.toHaveBeenCalled();
  });

  // ── Limpieza de subModal ──────────────────────────────────────────────────────

  it('cerrar flujo de entrega limpia subModal y restaura el modal principal', async () => {
    render(<ActivoProfileModal activoId="aaa" onClose={vi.fn()} />, { wrapper: makeWrapper() });
    await waitFor(() => screen.getAllByText('Casco')[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Entregar' }));
    await waitFor(() => screen.getByTestId('entrega-create-modal'));

    // Cerrar el flujo de entrega
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar entrega' }));

    await waitFor(() => {
      expect(screen.queryByTestId('entrega-create-modal')).not.toBeInTheDocument();
      expect(screen.getAllByText('Casco')[0]).toBeInTheDocument();
    });
  });
});
