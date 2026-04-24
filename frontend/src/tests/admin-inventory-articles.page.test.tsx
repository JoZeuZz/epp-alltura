import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as hooks from '../hooks';
import * as apiService from '../services/apiService';
import AdminInventoryArticlesPage from '../pages/admin/inventory/AdminInventoryArticlesPage';

vi.mock('focus-trap-react', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => children,
}));

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
    createArticulo: vi.fn(),
    updateArticulo: vi.fn(),
    deactivateArticulo: vi.fn(),
    permanentDeleteArticulo: vi.fn(),
  };
});

const mockUseGet = hooks.useGet as unknown as {
  mockImplementation: (fn: (...args: unknown[]) => unknown) => void;
  mockReset: () => void;
};

const createArticuloMock = vi.mocked(apiService.createArticulo);
const updateArticuloMock = vi.mocked(apiService.updateArticulo);
const deactivateArticuloMock = vi.mocked(apiService.deactivateArticulo);
const permanentDeleteArticuloMock = vi.mocked(apiService.permanentDeleteArticulo);

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderPage = () => {
  const client = createQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <AdminInventoryArticlesPage />
    </QueryClientProvider>
  );
};

describe('AdminInventoryArticlesPage', () => {
  beforeEach(() => {
    mockUseGet.mockReset();
    createArticuloMock.mockReset();
    updateArticuloMock.mockReset();
    deactivateArticuloMock.mockReset();
    permanentDeleteArticuloMock.mockReset();

    createArticuloMock.mockResolvedValue({ id: 'article-new', nombre: 'Casco' } as never);
    updateArticuloMock.mockResolvedValue({ id: 'article-1', nombre: 'Casco ABS' } as never);
    deactivateArticuloMock.mockResolvedValue({ id: 'article-1', estado: 'inactivo' } as never);
    permanentDeleteArticuloMock.mockResolvedValue({ deleted_permanently: true } as never);

    mockUseGet.mockImplementation((...args) => {
      const url = args[1] as string;

      if (url === '/articulos') {
        return {
          data: [
            {
              id: 'article-1',
              nombre: 'Guantes dieléctricos',
              grupo_principal: 'equipo',
              subclasificacion: 'epp',
              especialidades: ['ooee'],
              tracking_mode: 'serial',
              nivel_control: 'alto',
              unidad_medida: 'par',
              estado: 'activo',
            },
            {
              id: 'article-2',
              nombre: 'Lentes de seguridad',
              grupo_principal: 'herramienta',
              subclasificacion: 'manual',
              especialidades: ['oocc'],
              tracking_mode: 'serial',
              nivel_control: 'medio',
              unidad_medida: 'unidad',
              estado: 'inactivo',
            },
          ],
          isLoading: false,
          error: null,
        };
      }

      return { data: [], isLoading: false, error: null };
    });
  });

  it('renderiza catálogo de artículos', () => {
    renderPage();

    expect(screen.getByText('Catálogo de Equipos y Herramientas')).toBeInTheDocument();
    expect(screen.getByText('Guantes dieléctricos')).toBeInTheDocument();
  });

  it('muestra copy operativo sin etiquetas legacy visibles', () => {
    renderPage();

    expect(screen.getByText('Catálogo de Equipos y Herramientas')).toBeInTheDocument();
    expect(screen.queryByText(/EPP Control/i)).not.toBeInTheDocument();
  });

  it('crea un artículo desde el modal', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Nuevo Artículo' }));

    const modalTitle = await screen.findByRole('heading', { name: 'Nuevo Artículo' });
    const modal = modalTitle.closest('form') as HTMLFormElement;

    await user.type(within(modal).getByPlaceholderText('Ej: Casco de seguridad'), 'Casco ABS');
    await user.click(within(modal).getByRole('button', { name: 'Crear artículo' }));

    await waitFor(() => {
      expect(createArticuloMock).toHaveBeenCalledTimes(1);
    });

    expect(createArticuloMock).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Casco ABS',
      })
    );
  });

  it('crea un equipo con subclasificación compatible y especialidades seleccionadas', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Nuevo Artículo' }));

    const modalTitle = await screen.findByRole('heading', { name: 'Nuevo Artículo' });
    const modal = modalTitle.closest('form') as HTMLFormElement;

    const groupSelect = within(modal).getByDisplayValue('Herramienta');
    await user.selectOptions(groupSelect, 'equipo');

    const specialtyOOCC = within(modal).getByRole('checkbox', { name: 'OOCC' });
    const specialtyOOEE = within(modal).getByRole('checkbox', { name: 'OOEE' });
    await user.click(specialtyOOCC);
    await user.click(specialtyOOEE);

    await user.type(within(modal).getByPlaceholderText('Ej: Casco de seguridad'), 'Arnés Pro');
    await user.click(within(modal).getByRole('button', { name: 'Crear artículo' }));

    await waitFor(() => {
      expect(createArticuloMock).toHaveBeenCalledTimes(1);
    });

    expect(createArticuloMock).toHaveBeenCalledWith(
      expect.objectContaining({
        grupo_principal: 'equipo',
        subclasificacion: 'epp',
        especialidades: ['ooee'],
        nombre: 'Arnés Pro',
      })
    );
  });

  it('edita un artículo existente', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getAllByRole('button', { name: 'Editar' })[0]);

    const modalTitle = await screen.findByRole('heading', { name: 'Editar Artículo' });
    const modal = modalTitle.closest('form') as HTMLFormElement;
    const nameInput = within(modal).getByPlaceholderText(
      'Ej: Casco de seguridad'
    ) as HTMLInputElement;

    await user.clear(nameInput);
    await user.type(nameInput, 'Guantes actualizados');
    await user.click(within(modal).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(updateArticuloMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'article-1',
          nombre: 'Guantes actualizados',
        })
      );
    });
  });

  it('edita un artículo y permite cambiar a flujo herramienta con subclasificación válida', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getAllByRole('button', { name: 'Editar' })[0]);

    const modalTitle = await screen.findByRole('heading', { name: 'Editar Artículo' });
    const modal = modalTitle.closest('form') as HTMLFormElement;

    const groupSelect = within(modal).getByDisplayValue('Equipo');
    await user.selectOptions(groupSelect, 'herramienta');

    const subclasificacionSelect = within(modal).getByDisplayValue('Manual');
    await user.selectOptions(subclasificacionSelect, 'electrica_cable');

    const nameInput = within(modal).getByPlaceholderText(
      'Ej: Casco de seguridad'
    ) as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, 'Taladro reformulado');
    await user.click(within(modal).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(updateArticuloMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'article-1',
          grupo_principal: 'herramienta',
          subclasificacion: 'electrica_cable',
          nombre: 'Taladro reformulado',
        })
      );
    });
  });

  it('desactiva un artículo activo desde acciones', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Desactivar' }));
    const confirmationDialog = await screen.findByRole('dialog');
    await user.click(within(confirmationDialog).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => {
      expect(deactivateArticuloMock).toHaveBeenCalledWith('article-1');
    });
  });

  it('activa un artículo inactivo y permite eliminarlo definitivamente', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Activar' }));
    const activateDialog = await screen.findByRole('dialog');
    await user.click(within(activateDialog).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => {
      expect(updateArticuloMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'article-2',
          estado: 'activo',
        })
      );
    });

    await user.click(screen.getByRole('button', { name: 'Eliminar definitivo' }));
    const permanentDeleteDialog = await screen.findByRole('dialog');
    await user.click(
      within(permanentDeleteDialog).getByRole('button', { name: 'Eliminar definitivo' })
    );

    await waitFor(() => {
      expect(permanentDeleteArticuloMock).toHaveBeenCalledWith('article-2');
    });
  });
});
