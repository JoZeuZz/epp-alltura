import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminProyectoDetailPage from '../pages/admin/AdminProyectoDetailPage';

const mockUseGet = vi.hoisted(() => vi.fn());

vi.mock('../hooks', () => ({
  useGet: mockUseGet,
}));

const mockProyecto = {
  id: 'proj-1',
  nombre: 'Obra Minera Norte',
  sitio: 'Faena El Teniente',
  cliente: 'Codelco',
  presupuesto_clp: 50000000,
  estado: 'activo',
  fecha_inicio: '2026-01-01',
  fecha_fin: '2026-12-31',
};

const mockArticulos = [
  {
    id: 'art-1',
    nombre: 'Casco EPP',
    codigo: 'EPP-001',
    tipo: 'epp',
    valor: 15000,
    estado: 'asignado',
    alerta_devolucion: false,
    proyecto_actual_id: 'proj-1',
    proyecto_nombre: 'Obra Minera Norte',
    bodega_actual_id: null,
    bodega_nombre: null,
    especialidades: [],
    certificaciones: [],
    creado_en: '2026-01-01',
  },
];

describe('AdminProyectoDetailPage', () => {
  beforeEach(() => {
    mockUseGet.mockImplementation((key: unknown) => {
      if (JSON.stringify(key).includes('proyecto')) {
        return { data: mockProyecto, isLoading: false, error: null };
      }
      return { data: mockArticulos, isLoading: false, error: null };
    });
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/ubicacion/proyectos/proj-1']}>
        <Routes>
          <Route path="/ubicacion/proyectos/:id" element={<AdminProyectoDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('muestra el nombre del proyecto', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Obra Minera Norte')).toBeInTheDocument());
  });

  it('muestra el sitio del proyecto', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/Faena El Teniente/)).toBeInTheDocument());
  });

  it('muestra los artículos asignados', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Casco EPP')).toBeInTheDocument());
  });

  it('muestra el total de valor acumulado', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/valor acumulado/i)).toBeInTheDocument());
  });

  it('muestra botones de acción por artículo', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /devolver/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /trasladar/i })).toBeInTheDocument();
    });
  });
});
