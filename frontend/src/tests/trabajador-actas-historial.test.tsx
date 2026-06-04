import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Mock window.matchMedia for useElasticScroll in alltura-ui
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
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

// Modal uses focus-trap-react — stub it
vi.mock('focus-trap-react', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// Mock apiService
const mockGetTrabajadorProfile = vi.hoisted(() => vi.fn());
const mockGetTrabajadorActas = vi.hoisted(() => vi.fn());

vi.mock('../services/apiService', () => ({
  getTrabajadorProfile: mockGetTrabajadorProfile,
  getTrabajadorActas: mockGetTrabajadorActas,
}));

// Mock ActaDetailModal
vi.mock('../components/forms/ActaDetailModal', () => ({
  default: ({ type, id, onClose }: { type: string; id: string; onClose: () => void }) => (
    <div data-testid="acta-detail-modal" data-type={type} data-id={id}>
      <button onClick={onClose}>Cerrar</button>
    </div>
  ),
}));

import TrabajadorProfileModal from '../components/forms/TrabajadorProfileModal';

const createWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

const MOCK_PROFILE = {
  id: 'worker-1',
  nombres: 'Juan',
  apellidos: 'Pérez',
  rut: '12.345.678-9',
  cargo: 'Operario',
  email: null,
  estado: 'activo',
  fecha_ingreso: null,
  custodias: [],
  stats: { activos_en_custodia: 0, total_custodias: 0, total_entregas: 1 },
};

const MOCK_ACTAS = [
  {
    entrega_id: 'e1',
    entrega_fecha: '2024-01-15T12:00:00Z',
    articulo_codigo: 'EPP-001',
    articulo_nombre: 'Casco MSA',
    articulo_tipo: 'epp',
    es_activo: true,
    devolucion_id: null,
    devolucion_fecha: null,
  },
  {
    entrega_id: 'e2',
    entrega_fecha: '2024-02-01T10:00:00Z',
    articulo_codigo: 'EPP-002',
    articulo_nombre: 'Guante 3M',
    articulo_tipo: 'epp',
    es_activo: false,
    devolucion_id: 'd1',
    devolucion_fecha: '2024-03-01T10:00:00Z',
  },
];

describe('TrabajadorProfileModal — ActasHistorial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTrabajadorProfile.mockResolvedValue(MOCK_PROFILE);
    mockGetTrabajadorActas.mockResolvedValue(MOCK_ACTAS);
  });

  it('renders Historial de Actas section', async () => {
    render(
      <TrabajadorProfileModal trabajadorId="worker-1" onClose={() => {}} />,
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(screen.getByText(/historial de actas/i)).toBeInTheDocument());
  });

  it('shows article name for each acta', async () => {
    render(
      <TrabajadorProfileModal trabajadorId="worker-1" onClose={() => {}} />,
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(screen.getByText('Casco MSA')).toBeInTheDocument());
    expect(screen.getByText('Guante 3M')).toBeInTheDocument();
  });

  it('shows Activo badge for active custody', async () => {
    render(
      <TrabajadorProfileModal trabajadorId="worker-1" onClose={() => {}} />,
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(screen.getByText('Activo')).toBeInTheDocument());
  });

  it('shows Devuelto badge for returned custody', async () => {
    render(
      <TrabajadorProfileModal trabajadorId="worker-1" onClose={() => {}} />,
      { wrapper: createWrapper() }
    );
    await waitFor(() => expect(screen.getByText('Devuelto')).toBeInTheDocument());
  });

  it('opens ActaDetailModal with type=entrega when Entrega button clicked', async () => {
    render(
      <TrabajadorProfileModal trabajadorId="worker-1" onClose={() => {}} />,
      { wrapper: createWrapper() }
    );
    await waitFor(() => screen.getByText('Casco MSA'));
    const entregaButtons = screen.getAllByRole('button', { name: /entrega/i });
    fireEvent.click(entregaButtons[0]);
    expect(screen.getByTestId('acta-detail-modal')).toHaveAttribute('data-type', 'entrega');
    expect(screen.getByTestId('acta-detail-modal')).toHaveAttribute('data-id', 'e1');
  });

  it('shows Devolucion button only for rows with devolucion_id', async () => {
    render(
      <TrabajadorProfileModal trabajadorId="worker-1" onClose={() => {}} />,
      { wrapper: createWrapper() }
    );
    await waitFor(() => screen.getByText('Guante 3M'));
    const devButtons = screen.queryAllByRole('button', { name: /devolución/i });
    expect(devButtons).toHaveLength(1); // only the devuelta row
  });

  it('shows empty state when no actas', async () => {
    mockGetTrabajadorActas.mockResolvedValue([]);
    render(
      <TrabajadorProfileModal trabajadorId="worker-1" onClose={() => {}} />,
      { wrapper: createWrapper() }
    );
    await waitFor(() =>
      expect(screen.getByText(/sin actas registradas/i)).toBeInTheDocument()
    );
  });
});
