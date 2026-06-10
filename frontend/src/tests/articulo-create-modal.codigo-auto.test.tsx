import { render, screen } from '@testing-library/react';
import { vi, beforeAll } from 'vitest';
import { ArticuloCreateModal } from '../components/ArticuloCreateModal';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
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
});

// Mock completo de react-query para evitar fetch real
vi.mock('@tanstack/react-query', () => ({
  useQuery:    vi.fn(() => ({ data: [], isLoading: false, error: null, status: 'success' })),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

// Mock del API service
vi.mock('../services/apiService', () => ({
  createArticulo:   vi.fn(() => Promise.resolve({})),
  addCertificacion: vi.fn(() => Promise.resolve({})),
  getProveedores:   vi.fn(() => Promise.resolve([])),
  getPlantillas:    vi.fn(() => Promise.resolve([])),
  getPlantilla:     vi.fn(() => Promise.resolve(null)),
}));

const defaultProps = {
  tipo:    'epp' as const,
  bodegas: [{ id: 'b1', nombre: 'Bodega Central' }],
  isOpen:  true,
  onClose: vi.fn(),
};

describe('ArticuloCreateModal — código automático', () => {
  it('no muestra el campo "Código (auto)"', () => {
    render(<ArticuloCreateModal {...defaultProps} />);
    expect(screen.queryByText(/código \(auto\)/i)).toBeNull();
  });

  it('muestra nota informativa con formato EPP-XXXXX para tipo epp', () => {
    render(<ArticuloCreateModal {...defaultProps} />);
    expect(screen.getByText(/se asignará automáticamente/i)).toBeInTheDocument();
    expect(screen.getByText('EPP-00001')).toBeInTheDocument();
  });

  it('muestra formato HRR-XXXXX para tipo herramienta', () => {
    render(<ArticuloCreateModal {...defaultProps} tipo="herramienta" />);
    expect(screen.getByText('HRR-00001')).toBeInTheDocument();
  });

  it('muestra formato EQP-XXXXX para tipo equipo', () => {
    render(<ArticuloCreateModal {...defaultProps} tipo="equipo" />);
    expect(screen.getByText('EQP-00001')).toBeInTheDocument();
  });

  it('muestra el campo Descripción en la sección Identificación', () => {
    render(<ArticuloCreateModal {...defaultProps} />);
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument();
  });
});
