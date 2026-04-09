import React, { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import ArticleFormModal from '../../../components/forms/ArticleFormModal';
import ConfirmationModal from '../../../components/ConfirmationModal';
import { ResponsiveTable, type TableColumn } from '../../../components/layout';
import { useGet } from '../../../hooks';
import {
  createArticulo,
  deactivateArticulo,
  permanentDeleteArticulo,
  type Articulo,
  type ArticuloCreatePayload,
  type ArticuloQueryParams,
  type ArticuloUpdatePayload,
  updateArticulo,
} from '../../../services/apiService';

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

const statusBadgeClasses = (status?: string | null): string => {
  return status === 'inactivo' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700';
};

const trackModeLabel = (value?: string | null): string => {
  if (value === 'lote') return 'Por Lote';
  return 'Por Unidad';
};

const retornoLabel = (value?: string | null): string => {
  return value === 'consumible' ? 'Consumible' : 'Retornable';
};

const tipoLabel = (value?: string | null): string => {
  if (value === 'epp') return 'EPP';
  if (value === 'consumible') return 'Consumible';
  return 'Herramienta';
};

type ArticleActionType = 'deactivate' | 'activate' | 'permanent';

interface ArticleActionState {
  type: ArticleActionType;
  articulo: Articulo;
}

const AdminInventoryArticlesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingArticulo, setEditingArticulo] = useState<Articulo | null>(null);
  const [pendingAction, setPendingAction] = useState<ArticleActionState | null>(null);
  const [filters, setFilters] = useState<{
    search: string;
    tipo: '' | ArticuloQueryParams['tipo'];
    tracking_mode: '' | ArticuloQueryParams['tracking_mode'];
    estado: '' | ArticuloQueryParams['estado'];
    limit: number;
    offset: number;
  }>({
    search: '',
    tipo: '',
    tracking_mode: '',
    estado: '',
    limit: 25,
    offset: 0,
  });

  const queryParams = useMemo(
    () => ({
      search: filters.search || undefined,
      tipo: filters.tipo || undefined,
      tracking_mode: filters.tracking_mode || undefined,
      estado: filters.estado || undefined,
      limit: filters.limit,
      offset: filters.offset,
    }),
    [filters]
  );

  const {
    data: articulos = [],
    isLoading,
    error,
  } = useGet<Articulo[]>(
    ['admin-inventory', 'articulos', queryParams],
    '/articulos',
    queryParams,
    {
      placeholderData: keepPreviousData,
    }
  );

  const invalidateInventoryArticleQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-inventory', 'articulos'] });
    queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
  };

  const createArticleMutation = useMutation<Articulo, Error, ArticuloCreatePayload>({
    mutationFn: (payload) => createArticulo(payload),
    onSuccess: () => {
      invalidateInventoryArticleQueries();
    },
    onError: (mutationError) => {
      toast.error(toErrorMessage(mutationError));
    },
  });

  const updateArticleMutation = useMutation<Articulo, Error, ArticuloUpdatePayload>({
    mutationFn: (payload) => updateArticulo(payload),
    onSuccess: () => {
      invalidateInventoryArticleQueries();
    },
    onError: (mutationError) => {
      toast.error(toErrorMessage(mutationError));
    },
  });

  const deactivateArticleMutation = useMutation<Articulo, Error, string>({
    mutationFn: (id) => deactivateArticulo(id),
    onSuccess: () => {
      invalidateInventoryArticleQueries();
    },
    onError: (mutationError) => {
      toast.error(toErrorMessage(mutationError));
    },
  });

  const permanentDeleteArticleMutation = useMutation<unknown, Error, string>({
    mutationFn: (id) => permanentDeleteArticulo(id),
    onSuccess: () => {
      invalidateInventoryArticleQueries();
    },
    onError: (mutationError) => {
      toast.error(toErrorMessage(mutationError));
    },
  });

  const handleCreateArticle = async (payload: ArticuloCreatePayload) => {
    await createArticleMutation.mutateAsync(payload);
    toast.success('Artículo creado correctamente.');
    setIsCreateModalOpen(false);
  };

  const handleUpdateArticle = async (payload: ArticuloCreatePayload) => {
    if (!editingArticulo) return;

    await updateArticleMutation.mutateAsync({
      id: editingArticulo.id,
      ...payload,
    });
    toast.success('Artículo actualizado correctamente.');
    setEditingArticulo(null);
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    const { articulo, type } = pendingAction;

    try {
      if (type === 'deactivate') {
        await deactivateArticleMutation.mutateAsync(articulo.id);
        toast.success('Artículo desactivado correctamente.');
      }

      if (type === 'activate') {
        await updateArticleMutation.mutateAsync({
          id: articulo.id,
          estado: 'activo',
        });
        toast.success('Artículo activado correctamente.');
      }

      if (type === 'permanent') {
        await permanentDeleteArticleMutation.mutateAsync(articulo.id);
        toast.success('Artículo eliminado permanentemente.');
      }
    } catch {
      // Error toast is handled in mutation-level onError.
    } finally {
      setPendingAction(null);
    }
  };

  const hasPendingAction =
    createArticleMutation.isPending ||
    updateArticleMutation.isPending ||
    deactivateArticleMutation.isPending ||
    permanentDeleteArticleMutation.isPending;

  const columns = useMemo<TableColumn<Articulo>[]>(
    () => [
      {
        key: 'nombre',
        header: 'Artículo',
        render: (_value, row) => (
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900">{row.nombre}</span>
            <span className="text-xs text-gray-500">
              {[row.marca, row.modelo, row.categoria].filter(Boolean).join(' · ') || '-'}
            </span>
          </div>
        ),
      },
      {
        key: 'tipo',
        header: 'Tipo',
        render: (value) => tipoLabel(String(value || '')),
      },
      {
        key: 'tracking_mode',
        header: 'Seguimiento',
        render: (value) => trackModeLabel(String(value || '')),
      },
      {
        key: 'retorno_mode',
        header: 'Retorno',
        render: (value) => retornoLabel(String(value || '')),
      },
      {
        key: 'unidad_medida',
        header: 'Unidad',
      },
      {
        key: 'estado',
        header: 'Estado',
        render: (value) => (
          <span
            className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${statusBadgeClasses(
              String(value || 'activo')
            )}`}
          >
            {String(value || 'activo') === 'inactivo' ? 'Inactivo' : 'Activo'}
          </span>
        ),
      },
      {
        key: 'acciones',
        header: 'Acciones',
        render: (_value, row) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-tour="admin-inventory-article-edit"
              className="px-2 py-1 text-xs rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-60"
              onClick={() => setEditingArticulo(row)}
              disabled={hasPendingAction}
            >
              Editar
            </button>

            {row.estado === 'inactivo' ? (
              <button
                type="button"
                className="px-2 py-1 text-xs rounded-md bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-60"
                onClick={() => setPendingAction({ type: 'activate', articulo: row })}
                disabled={hasPendingAction}
              >
                Activar
              </button>
            ) : (
              <button
                type="button"
                data-tour="admin-inventory-article-deactivate"
                className="px-2 py-1 text-xs rounded-md bg-yellow-100 text-yellow-700 hover:bg-yellow-200 disabled:opacity-60"
                onClick={() => setPendingAction({ type: 'deactivate', articulo: row })}
                disabled={hasPendingAction}
              >
                Desactivar
              </button>
            )}

            {row.estado === 'inactivo' ? (
              <button
                type="button"
                data-tour="admin-inventory-article-permanent-delete"
                className="px-2 py-1 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60"
                onClick={() => setPendingAction({ type: 'permanent', articulo: row })}
                disabled={hasPendingAction}
              >
                Eliminar definitivo
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [hasPendingAction]
  );

  return (
    <section className="bg-white rounded-lg shadow-md p-5 space-y-4" data-tour="admin-inventory-articles-table">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-dark-blue">Catálogo de Artículos</h2>
          <p className="text-sm text-gray-500">
            Administra los artículos disponibles para ingresos, stock y operación EPP.
          </p>
        </div>
        <button
          type="button"
          data-tour="admin-inventory-open-article-modal"
          className="px-4 py-2 rounded-md bg-primary-blue text-white hover:bg-blue-700 disabled:opacity-60"
          onClick={() => setIsCreateModalOpen(true)}
          disabled={createArticleMutation.isPending}
        >
          Nuevo Artículo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          className="border rounded-md p-2 md:col-span-2"
          placeholder="Buscar por nombre, marca o modelo"
          value={filters.search}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, search: event.target.value, offset: 0 }))
          }
        />

        <select
          className="border rounded-md p-2"
          value={filters.tipo}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              tipo: event.target.value as typeof prev.tipo,
              offset: 0,
            }))
          }
        >
          <option value="">Todos los tipos</option>
          <option value="herramienta">Herramienta</option>
          <option value="epp">EPP</option>
          <option value="consumible">Consumible</option>
        </select>

        <select
          className="border rounded-md p-2"
          value={filters.tracking_mode}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              tracking_mode: event.target.value as typeof prev.tracking_mode,
              offset: 0,
            }))
          }
        >
          <option value="">Todos los modos</option>
          <option value="serial">Por Unidad</option>
          <option value="lote">Por Lote</option>
        </select>

        <select
          className="border rounded-md p-2"
          value={filters.estado}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              estado: event.target.value as typeof prev.estado,
              offset: 0,
            }))
          }
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>

      <ResponsiveTable
        caption="Catálogo de artículos de inventario"
        columns={columns}
        data={articulos}
        loading={isLoading}
        emptyMessage="No hay artículos para los filtros seleccionados."
      />

      {error ? <p className="text-sm text-red-600">{toErrorMessage(error)}</p> : null}

      <ArticleFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateArticle}
        isSubmitting={createArticleMutation.isPending}
      />

      <ArticleFormModal
        isOpen={Boolean(editingArticulo)}
        mode="edit"
        initialValues={editingArticulo}
        onClose={() => setEditingArticulo(null)}
        onSubmit={handleUpdateArticle}
        isSubmitting={updateArticleMutation.isPending}
      />

      <ConfirmationModal
        isOpen={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          void handleConfirmAction();
        }}
        title={
          pendingAction?.type === 'permanent'
            ? 'Eliminar artículo definitivamente'
            : pendingAction?.type === 'activate'
              ? 'Activar artículo'
              : 'Desactivar artículo'
        }
        message={
          pendingAction?.type === 'permanent'
            ? `Vas a eliminar permanentemente "${pendingAction?.articulo?.nombre || ''}". Esta acción es irreversible y solo aplica si no tiene trazabilidad.`
            : pendingAction?.type === 'activate'
              ? `¿Quieres activar nuevamente "${pendingAction?.articulo?.nombre || ''}"?`
              : `¿Quieres desactivar "${pendingAction?.articulo.nombre || ''}"?`
        }
        confirmText={pendingAction?.type === 'permanent' ? 'Eliminar definitivo' : 'Confirmar'}
        variant={pendingAction?.type === 'permanent' ? 'danger' : 'warning'}
      />
    </section>
  );
};

export default AdminInventoryArticlesPage;
