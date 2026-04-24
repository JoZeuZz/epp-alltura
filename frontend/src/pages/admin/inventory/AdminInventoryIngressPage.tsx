import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ResponsiveTable, type TableColumn } from '../../../components/layout';
import InventoryIngressModal from '../../../components/forms/InventoryIngressModal';
import ConfirmationModal from '../../../components/ConfirmationModal';
import { useGet } from '../../../hooks';
import { formatQuantityInteger } from '../../../utils/quantity';
import {
  createInventoryIngreso,
  deleteInventoryIngreso,
  createSupplier,
  type InventoryIngresoCreatePayload,
  type Supplier,
  type SupplierCreatePayload,
} from '../../../services/apiService';

interface ArticuloOption {
  id: string;
  nombre: string;
  tracking_mode: 'serial' | 'lote';
}

interface UbicacionOption {
  id: string;
  nombre: string;
}

interface IngresoRow {
  id: string;
  documento_tipo?: string | null;
  documento_numero?: string | null;
  documento_fecha?: string | null;
  proveedor_nombre?: string | null;
  cantidad_items?: number;
  cantidad_total?: number;
  creado_en?: string;
}

const formatDateTime = (value?: string | null): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  const payload = error as {
    response?: {
      data?: {
        message?: string;
      };
    };
  };

  return payload?.response?.data?.message || 'No se pudo completar la operación.';
};

const AdminInventoryIngressPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [ingresoToDelete, setIngresoToDelete] = useState<IngresoRow | null>(null);

  const { data: articulos = [] } = useGet<ArticuloOption[]>(['admin-inventory', 'articulos'], '/articulos');
  const { data: ubicaciones = [] } = useGet<UbicacionOption[]>(
    ['admin-inventory', 'ubicaciones'],
    '/ubicaciones'
  );
  const {
    data: proveedores = [],
    isLoading: suppliersLoading,
  } = useGet<Supplier[]>(['admin-inventory', 'suppliers'], '/proveedores');

  const {
    data: ingresos = [],
    isLoading: ingresosLoading,
    error: ingresosError,
  } = useGet<IngresoRow[]>(['admin-inventory', 'ingresos'], '/inventario/ingresos');

  const supplierMutation = useMutation<Supplier, Error, SupplierCreatePayload>({
    mutationFn: (payload) => createSupplier(payload),
    onSuccess: () => {
      setNewSupplierName('');
      toast.success('Proveedor creado correctamente.');
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
    },
    onError: (error) => {
      toast.error(error.message || 'No se pudo crear el proveedor.');
    },
  });

  const ingresoMutation = useMutation<unknown, Error, InventoryIngresoCreatePayload | FormData>({
    mutationFn: (payload) => createInventoryIngreso(payload),
    onSuccess: () => {
      toast.success('Ingreso registrado correctamente.');
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
    },
    onError: (error) => {
      toast.error(error.message || 'No se pudo registrar el ingreso.');
    },
  });

  const deleteMutation = useMutation<unknown, Error, string>({
    mutationFn: (id) => deleteInventoryIngreso(id),
    onSuccess: () => {
      toast.success('Ingreso eliminado. Stock y movimientos revertidos.');
      setIngresoToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
    },
    onError: (error) => {
      toast.error(toErrorMessage(error));
      setIngresoToDelete(null);
    },
  });

  const handleCreateSupplier = async () => {
    const nombre = newSupplierName.trim();
    if (!nombre) {
      toast.error('Debes ingresar un nombre para el proveedor.');
      return;
    }

    await supplierMutation.mutateAsync({ nombre });
  };

  const handleSubmitIngreso = async (payload: InventoryIngresoCreatePayload | FormData) => {
    await ingresoMutation.mutateAsync(payload);
  };

  const columns = useMemo<TableColumn<IngresoRow>[]>(
    () => [
      {
        key: 'creado_en',
        header: 'Fecha ingreso',
        render: (value) => formatDateTime(String(value || '')),
      },
      {
        key: 'documento',
        header: 'Documento',
        render: (_value, row) => {
          if (!row.documento_tipo && !row.documento_numero) {
            return 'Ingreso manual';
          }
          return `${row.documento_tipo || '-'} ${row.documento_numero || '-'}`;
        },
      },
      {
        key: 'proveedor_nombre',
        header: 'Proveedor',
        render: (value) => String(value || '-'),
      },
      {
        key: 'cantidad_items',
        header: 'Ítems',
        align: 'right',
        render: (value) => formatQuantityInteger(value),
      },
      {
        key: 'cantidad_total',
        header: 'Cantidad total',
        align: 'right',
        render: (value) => formatQuantityInteger(value),
      },
      {
        key: 'acciones',
        header: '',
        align: 'right',
        render: (_value, row) => (
          <button
            type="button"
            title="Eliminar ingreso"
            className="text-red-600 hover:text-red-800 disabled:opacity-40 text-sm px-2 py-1"
            disabled={deleteMutation.isPending}
            onClick={() => setIngresoToDelete(row)}
          >
            Eliminar
          </button>
        ),
      },
    ],
    [deleteMutation.isPending, setIngresoToDelete]
  );

  return (
    <div className="space-y-6" data-tour="admin-inventory-ingress-page">
      <section className="bg-white rounded-lg shadow-md p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-dark-blue">Ingresos</h2>
            <p className="text-sm text-gray-500">
              Registra ingresos manuales o con documento, con impacto inmediato en stock y movimientos.
            </p>
          </div>
          <button
            type="button"
            data-tour="admin-inventory-open-ingress-modal"
            className="px-4 py-2 rounded-md bg-primary-blue text-white hover:bg-blue-700 disabled:opacity-60"
            onClick={() => setIsModalOpen(true)}
            disabled={ingresoMutation.isPending}
          >
            Ingresar equipo/herramienta
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
          <input
            className="border rounded-md p-2"
            placeholder="Crear proveedor rápido"
            value={newSupplierName}
            onChange={(event) => setNewSupplierName(event.target.value)}
          />
          <button
            type="button"
            className="px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
            onClick={handleCreateSupplier}
            disabled={supplierMutation.isPending}
          >
            {supplierMutation.isPending ? 'Creando...' : 'Crear Proveedor'}
          </button>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-md p-5 space-y-4" data-tour="admin-inventory-ingress-recent-table">
        <h3 className="text-lg font-semibold text-dark-blue">Ingresos recientes</h3>
        <ResponsiveTable
          caption="Ingresos recientes de inventario"
          columns={columns}
          data={ingresos.slice(0, 20)}
          loading={ingresosLoading}
          emptyMessage="Aún no hay ingresos registrados."
        />

        {ingresosError ? (
          <p className="text-sm text-red-600">{toErrorMessage(ingresosError)}</p>
        ) : null}
      </section>

      <InventoryIngressModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitIngreso}
        isSubmitting={ingresoMutation.isPending}
        articulos={articulos}
        ubicaciones={ubicaciones}
        proveedores={proveedores}
      />

      <ConfirmationModal
        isOpen={ingresoToDelete !== null}
        onClose={() => setIngresoToDelete(null)}
        onConfirm={() => {
          if (ingresoToDelete) {
            deleteMutation.mutate(ingresoToDelete.id);
          }
        }}
        title="Eliminar ingreso"
        message={`¿Estás seguro de que deseas eliminar este ingreso? Se revertirán los movimientos de stock y las cantidades asociadas. Esta acción no se puede deshacer.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      {suppliersLoading ? (
        <p className="text-xs text-gray-500">Cargando proveedores...</p>
      ) : null}
    </div>
  );
};

export default AdminInventoryIngressPage;
