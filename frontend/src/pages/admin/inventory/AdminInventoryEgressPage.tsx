import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ResponsiveTable, type TableColumn } from '../../../components/layout';
import ConfirmationModal from '../../../components/ConfirmationModal';
import InventoryEgressModal from '../../../components/forms/InventoryEgressModal';
import { useGet } from '../../../hooks';
import {
  createInventoryEgreso,
  deleteInventoryEgreso,
  type EgresoRow,
  type EgresoTipoMotivo,
  type InventoryEgresoCreatePayload,
} from '../../../services/apiService';

interface ArticuloOption {
  id: string;
  nombre: string;
  tracking_mode: 'serial' | 'lote' | 'cantidad';
}

interface UbicacionOption {
  id: string;
  nombre: string;
}

interface LoteOption {
  id: string;
  articulo_id: string;
  codigo_lote?: string | null;
}

const TIPO_MOTIVO_LABELS: Record<EgresoTipoMotivo, string> = {
  salida: 'Salida directa',
  baja: 'Baja',
  consumo: 'Consumo',
  ajuste: 'Ajuste',
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  const payload = error as { response?: { data?: { message?: string } } };
  return payload?.response?.data?.message || 'No se pudo completar la operación.';
};

const AdminInventoryEgressPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [egresoToDelete, setEgresoToDelete] = useState<EgresoRow | null>(null);

  const { data: articulos = [] } = useGet<ArticuloOption[]>(['admin-inventory', 'articulos'], '/articulos');
  const { data: ubicaciones = [] } = useGet<UbicacionOption[]>(
    ['admin-inventory', 'ubicaciones'],
    '/ubicaciones'
  );
  const { data: lotes = [] } = useGet<LoteOption[]>(['admin-inventory', 'lotes'], '/inventario/lotes');
  const {
    data: egresos = [],
    isLoading: egresosLoading,
    error: egresosError,
  } = useGet<EgresoRow[]>(['admin-inventory', 'egresos'], '/inventario/egresos');

  const egresoMutation = useMutation<unknown, Error, InventoryEgresoCreatePayload>({
    mutationFn: (payload) => createInventoryEgreso(payload),
    onSuccess: () => {
      toast.success('Egreso registrado correctamente.');
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
    },
    onError: (error) => {
      toast.error(toErrorMessage(error));
    },
  });

  const deleteMutation = useMutation<unknown, Error, string>({
    mutationFn: (id) => deleteInventoryEgreso(id),
    onSuccess: () => {
      toast.success('Egreso eliminado. Stock revertido.');
      setEgresoToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
    },
    onError: (error) => {
      toast.error(toErrorMessage(error));
      setEgresoToDelete(null);
    },
  });

  const handleSubmitEgreso = async (payload: InventoryEgresoCreatePayload) => {
    await egresoMutation.mutateAsync(payload);
  };

  const columns = useMemo<TableColumn<EgresoRow>[]>(
    () => [
      {
        key: 'creado_en',
        header: 'Fecha egreso',
        render: (value) => formatDateTime(String(value || '')),
      },
      {
        key: 'tipo_motivo',
        header: 'Motivo',
        render: (value) => TIPO_MOTIVO_LABELS[value as EgresoTipoMotivo] ?? String(value),
      },
      {
        key: 'creado_por_nombre',
        header: 'Registrado por',
        render: (value) => String(value || '-'),
      },
      {
        key: 'cantidad_items',
        header: 'Ítems',
        align: 'right',
        render: (value) => toNumber(value),
      },
      {
        key: 'cantidad_total',
        header: 'Cantidad total',
        align: 'right',
        render: (value) => toNumber(value),
      },
      {
        key: 'acciones',
        header: '',
        align: 'right',
        render: (_value, row) => (
          <button
            type="button"
            title="Eliminar egreso"
            className="text-red-600 hover:text-red-800 disabled:opacity-40 text-sm px-2 py-1"
            disabled={deleteMutation.isPending}
            onClick={() => setEgresoToDelete(row)}
          >
            Eliminar
          </button>
        ),
      },
    ],
    [deleteMutation.isPending]
  );

  return (
    <div className="space-y-6" data-tour="admin-inventory-egress-page">
      <section className="bg-white rounded-lg shadow-md p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-dark-blue">Egresos</h2>
            <p className="text-sm text-gray-500">
              Registra salidas, bajas, consumos o ajustes de stock con impacto inmediato en inventario.
            </p>
          </div>
          <button
            type="button"
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
            onClick={() => setIsModalOpen(true)}
            disabled={egresoMutation.isPending}
          >
            Registrar Egreso
          </button>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-md p-5 space-y-4" data-tour="admin-inventory-egress-recent-table">
        <h3 className="text-lg font-semibold text-dark-blue">Egresos recientes</h3>
        <ResponsiveTable
          caption="Egresos recientes de inventario"
          columns={columns}
          data={egresos.slice(0, 20)}
          loading={egresosLoading}
          emptyMessage="Aún no hay egresos registrados."
        />
        {egresosError ? (
          <p className="text-sm text-red-600">{toErrorMessage(egresosError)}</p>
        ) : null}
      </section>

      <InventoryEgressModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitEgreso}
        isSubmitting={egresoMutation.isPending}
        articulos={articulos}
        ubicaciones={ubicaciones}
        lotes={lotes}
      />

      <ConfirmationModal
        isOpen={egresoToDelete !== null}
        onClose={() => setEgresoToDelete(null)}
        onConfirm={() => {
          if (egresoToDelete) {
            deleteMutation.mutate(egresoToDelete.id);
          }
        }}
        title="Eliminar egreso"
        message="¿Estás seguro de que deseas eliminar este egreso? El stock descontado será revertido. Esta acción no se puede deshacer."
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};

export default AdminInventoryEgressPage;
