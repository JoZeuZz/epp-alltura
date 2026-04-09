import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as hooks from '../hooks';
import * as apiService from '../services/apiService';
import AdminInventoryIngressPage from '../pages/admin/inventory/AdminInventoryIngressPage';

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
    createSupplier: vi.fn(),
    createInventoryIngreso: vi.fn(),
  };
});

const mockUseGet = hooks.useGet as unknown as {
  mockImplementation: (fn: (...args: unknown[]) => unknown) => void;
  mockReset: () => void;
};

const createSupplierMock = vi.mocked(apiService.createSupplier);
const createInventoryIngresoMock = vi.mocked(apiService.createInventoryIngreso);

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
      <AdminInventoryIngressPage />
    </QueryClientProvider>
  );
};

describe('AdminInventoryIngressPage', () => {
  beforeEach(() => {
    mockUseGet.mockReset();
    createSupplierMock.mockReset();
    createInventoryIngresoMock.mockReset();

    createSupplierMock.mockResolvedValue({ id: 'supplier-new', nombre: 'Proveedor Nuevo' } as never);
    createInventoryIngresoMock.mockResolvedValue({ id: 'ingreso-1' } as never);

    mockUseGet.mockImplementation((...args) => {
      const url = args[1] as string;

      switch (url) {
        case '/articulos':
          return {
            data: [
              { id: 'article-qty', nombre: 'Guante', tracking_mode: 'lote' },
              { id: 'article-serial', nombre: 'Taladro', tracking_mode: 'serial' },
            ],
            isLoading: false,
            error: null,
          };
        case '/ubicaciones':
          return {
            data: [{ id: 'location-1', nombre: 'Bodega Central' }],
            isLoading: false,
            error: null,
          };
        case '/proveedores':
          return {
            data: [{ id: 'supplier-1', nombre: 'Proveedor Uno' }],
            isLoading: false,
            error: null,
          };
        case '/inventario/ingresos':
          return {
            data: [
              {
                id: 'ingreso-100',
                documento_tipo: null,
                documento_numero: null,
                proveedor_nombre: null,
                cantidad_items: 1,
                cantidad_total: 5,
                creado_en: '2026-02-12T15:00:00.000Z',
              },
            ],
            isLoading: false,
            error: null,
          };
        default:
          return { data: [], isLoading: false, error: null };
      }
    });
  });

  it('renderiza ingresos recientes', () => {
    renderPage();

    expect(screen.getByText('Ingresos')).toBeInTheDocument();
    expect(screen.getByText('Ingresos recientes')).toBeInTheDocument();
    expect(screen.getByText('Ingreso manual')).toBeInTheDocument();
  });

  it('envía ingreso manual desde el modal wizard', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Ingresar Herramienta/EPP' }));

    const modalTitle = await screen.findByRole('heading', { name: 'Ingresar Herramienta/EPP' });
    const modal = modalTitle.closest('form') as HTMLFormElement;

    const step1Selects = within(modal).getAllByRole('combobox');
    await user.selectOptions(step1Selects[0], 'article-qty');
    await user.selectOptions(step1Selects[1], 'location-1');

    await user.click(within(modal).getByRole('button', { name: 'Siguiente' }));
    await user.click(within(modal).getByRole('button', { name: 'Siguiente' }));

    await user.click(within(modal).getByRole('button', { name: 'Registrar Ingreso' }));

    await waitFor(() => {
      expect(createInventoryIngresoMock).toHaveBeenCalledTimes(1);
    });

    expect(createInventoryIngresoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        detalles: [
          expect.objectContaining({
            articulo_id: 'article-qty',
            ubicacion_id: 'location-1',
            cantidad: 1,
          }),
        ],
      })
    );
  });
});
