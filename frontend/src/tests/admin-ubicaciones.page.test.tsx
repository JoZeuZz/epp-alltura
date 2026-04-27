import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as hooks from '../hooks';
import * as apiService from '../services/apiService';
import AdminUbicacionesPage, { type AdminUbicacionScope } from '../pages/admin/AdminUbicacionesPage';

vi.mock('../hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks')>();
  return {
    ...actual,
    useGet: vi.fn(),
  };
});

vi.mock('../services/apiService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/apiService')>();
  return {
    ...actual,
    post: vi.fn(),
    put: vi.fn(),
  };
});

vi.mock('../components/Modal', () => ({
  __esModule: true,
  default: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) =>
    isOpen ? <div>{children}</div> : null,
}));

const mockUseGet = hooks.useGet as unknown as {
  mockImplementation: (fn: (...args: unknown[]) => unknown) => void;
  mockReset: () => void;
};

const postMock = vi.mocked(apiService.post);

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderPage = (scope: AdminUbicacionScope = 'all') => {
  const client = createQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <AdminUbicacionesPage scope={scope} />
    </QueryClientProvider>
  );
};

describe('AdminUbicacionesPage', () => {
  beforeEach(() => {
    mockUseGet.mockReset();
    postMock.mockReset();

    postMock.mockResolvedValue({ id: 'new-1' } as never);

    mockUseGet.mockImplementation(() => ({
      data: [
        { id: '1', nombre: 'Bodega Norte', tipo: 'bodega', estado: 'activo' },
        { id: '2', nombre: 'Proyecto Minero', tipo: 'proyecto', estado: 'activo' },
      ],
      isLoading: false,
      error: null,
    }));
  });

  it('scope proyectos filtra resultados y bloquea filtro de tipo', () => {
    renderPage('proyectos');

    expect(screen.getByRole('heading', { name: 'Proyectos' })).toBeInTheDocument();
    expect(screen.getByText('Proyecto Minero')).toBeInTheDocument();
    expect(screen.queryByText('Bodega Norte')).not.toBeInTheDocument();

    const tipoFiltro = screen.getAllByRole('combobox')[0];
    expect(tipoFiltro).toBeDisabled();
    expect(tipoFiltro).toHaveValue('proyecto');
  });

  it('scope bodegas fuerza tipo bodega al crear', async () => {
    const user = userEvent.setup();
    renderPage('bodegas');

    await user.click(screen.getByRole('button', { name: 'Nueva Bodega' }));

    const nombreInput = screen.getByPlaceholderText('Ej: Bodega Central Planta Santiago');
    await user.type(nombreInput, 'Bodega Sur');

    const modalTipoSelect = screen.getAllByRole('combobox')[2];
    expect(modalTipoSelect).toBeDisabled();
    expect(modalTipoSelect).toHaveValue('bodega');

    await user.click(screen.getByRole('button', { name: 'Crear Ubicación' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith(
        '/ubicaciones',
        expect.objectContaining({
          nombre: 'Bodega Sur',
          tipo: 'bodega',
        })
      );
    });
  });
});
