import React, { useEffect, useMemo, useState } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { ResponsiveTable, type TableColumn } from '../../../components/layout';
import ActivoProfileModal from '../../../components/forms/ActivoProfileModal';
import CambiarEstadoActivoModal from '../../../components/forms/CambiarEstadoActivoModal';
import ReubicarActivoModal from '../../../components/forms/ReubicarActivoModal';
import EditarActivoModal from '../../../components/forms/EditarActivoModal';
import { useGet } from '../../../hooks';
import {
  getInventoryActivosPaged,
  type CursorPaginatedResponse,
  type InventoryActivoDetailRow,
} from '../../../services/apiService';

const ESTADO_LABELS: Record<string, string> = {
  en_stock: 'En stock',
  asignado: 'Asignado',
  en_traslado: 'En traslado',
  mantencion: 'Mantención',
  dado_de_baja: 'Dado de baja',
  perdido: 'Perdido',
};

const ESTADO_CLASSES: Record<string, string> = {
  en_stock: 'bg-green-100 text-green-700',
  asignado: 'bg-blue-100 text-blue-700',
  en_traslado: 'bg-indigo-100 text-indigo-700',
  mantencion: 'bg-amber-100 text-amber-700',
  dado_de_baja: 'bg-red-100 text-red-700',
  perdido: 'bg-gray-200 text-gray-600',
};

const FILTER_TABS: { label: string; value: string }[] = [
  { label: 'Todos', value: '' },
  { label: 'En stock', value: 'en_stock' },
  { label: 'Asignados', value: 'asignado' },
  { label: 'Mantención', value: 'mantencion' },
  { label: 'Dado de baja', value: 'dado_de_baja' },
  { label: 'Perdidos', value: 'perdido' },
];

const AdminInventoryActivosPage: React.FC = () => {
  const [filters, setFilters] = useState({
    search: '',
    estado: '',
    limit: 25,
  });

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [rows, setRows] = useState<InventoryActivoDetailRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedActivoId, setSelectedActivoId] = useState<string | null>(null);
  const [activoForEstado, setActivoForEstado] = useState<InventoryActivoDetailRow | null>(null);
  const [activoForReubicar, setActivoForReubicar] = useState<InventoryActivoDetailRow | null>(null);
  const [activoForEditar, setActivoForEditar] = useState<InventoryActivoDetailRow | null>(null);

  const queryParams = useMemo(
    () => ({
      search: filters.search || undefined,
      estado: filters.estado || undefined,
      limit: filters.limit,
    }),
    [filters]
  );

  const { data, isLoading } = useGet<CursorPaginatedResponse<InventoryActivoDetailRow>>(
    ['inventory-activos', queryParams],
    '/inventario/activos-paged',
    queryParams,
    { placeholderData: keepPreviousData }
  );

  useEffect(() => {
    if (data) {
      setRows(data.items ?? []);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(data.hasMore ?? false);
    }
  }, [data]);

  const loadMore = async () => {
    if (!hasMore || !nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const more = await getInventoryActivosPaged({ ...queryParams, cursor: nextCursor });
      setRows((prev) => [...prev, ...(more.items ?? [])]);
      setNextCursor(more.nextCursor ?? null);
      setHasMore(more.hasMore ?? false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const columns: TableColumn<InventoryActivoDetailRow>[] = useMemo(() => [
    {
      key: 'codigo',
      header: 'Código',
      render: (_v, row) => (
        <button
          onClick={() => setSelectedActivoId(row.id)}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm"
        >
          {row.codigo || '—'}
        </button>
      ),
    },
    {
      key: 'nro_serie',
      header: 'Nro. Serie',
      render: (_v, row) => row.nro_serie || '—',
    },
    {
      key: 'articulo_nombre',
      header: 'Artículo',
      render: (_v, row) => row.articulo_nombre || '—',
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (_v, row) => {
        const est = row.estado ?? '';
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_CLASSES[est] ?? 'bg-gray-100 text-gray-700'}`}
          >
            {ESTADO_LABELS[est] ?? est}
          </span>
        );
      },
    },
    {
      key: 'ubicacion_nombre',
      header: 'Ubicación',
      render: (_v, row) => row.ubicacion_nombre ?? row.custodia_ubicacion_nombre ?? '—',
    },
    {
      key: 'custodio_nombres',
      header: 'Custodio',
      render: (_v, row) =>
        row.custodio_nombres && row.custodio_apellidos
          ? `${row.custodio_nombres} ${row.custodio_apellidos}`
          : '—',
    },
    {
      key: 'dias_en_custodia',
      header: 'Días custodia',
      render: (_v, row) => (row.dias_en_custodia != null ? `${row.dias_en_custodia}d` : '—'),
    },
    {
      key: 'semaforo_devolucion',
      header: 'Devolución',
      align: 'center',
      hideOnMobile: true,
      render: (_v, row) => {
        const s = row.semaforo_devolucion;
        if (!s) return '—';
        const cfg = {
          verde:    { icon: '', label: 'En plazo',     cls: 'bg-green-50 text-green-700 border-green-200' },
          amarillo: { icon: '', label: 'Por vencer',   cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
          rojo:     { icon: '', label: 'Vencido/Urgente', cls: 'bg-red-50 text-red-700 border-red-200' },
        }[s];
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
            {cfg.icon} {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'id',
      header: 'Acciones',
      render: (_v, row) => {
        const est = row.estado ?? '';
        const bloqueado = est === 'asignado' || est === 'en_traslado';
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setSelectedActivoId(row.id)}
              className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              Ver perfil
            </button>
            {!bloqueado && (
              <button
                onClick={() => setActivoForEstado(row)}
                className="px-2 py-1 text-xs text-amber-600 hover:text-amber-800 hover:underline"
              >
                Estado
              </button>
            )}
            {est === 'en_stock' && (
              <button
                onClick={() => setActivoForReubicar(row)}
                className="px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Reubicar
              </button>
            )}
            <button
              onClick={() => setActivoForEditar(row)}
              className="px-2 py-1 text-xs text-green-600 hover:text-green-800 hover:underline"
            >
              Editar
            </button>
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Buscar por código, serie o artículo..."
            className="flex-1 min-w-[200px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilters((f) => ({ ...f, estado: tab.value }))}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filters.estado === tab.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <ResponsiveTable<InventoryActivoDetailRow>
          columns={columns}
          data={rows}
          loading={isLoading}
          emptyMessage="No se encontraron activos."
          getRowKey={(row) => row.id}
        />
        {hasMore && (
          <div className="p-4 text-center border-t">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              {isLoadingMore ? 'Cargando...' : 'Cargar más'}
            </button>
          </div>
        )}
      </div>

      {/* Modal de perfil */}
      {selectedActivoId && (
        <ActivoProfileModal
          activoId={selectedActivoId}
          onClose={() => setSelectedActivoId(null)}
          onCambiarEstado={() => {
            const row = rows.find((r) => r.id === selectedActivoId);
            if (row) { setSelectedActivoId(null); setActivoForEstado(row); }
          }}
          onReubicar={() => {
            const row = rows.find((r) => r.id === selectedActivoId);
            if (row) { setSelectedActivoId(null); setActivoForReubicar(row); }
          }}
          onEditar={() => {
            const row = rows.find((r) => r.id === selectedActivoId);
            if (row) { setSelectedActivoId(null); setActivoForEditar(row); }
          }}
        />
      )}

      {/* Modal cambiar estado */}
      {activoForEstado && (
        <CambiarEstadoActivoModal
          activo={activoForEstado}
          onClose={() => setActivoForEstado(null)}
          onSuccess={() => setActivoForEstado(null)}
        />
      )}

      {/* Modal reubicar */}
      {activoForReubicar && (
        <ReubicarActivoModal
          activo={activoForReubicar}
          onClose={() => setActivoForReubicar(null)}
          onSuccess={() => setActivoForReubicar(null)}
        />
      )}

      {/* Modal editar */}
      {activoForEditar && (
        <EditarActivoModal
          activo={activoForEditar}
          onClose={() => setActivoForEditar(null)}
          onSuccess={() => setActivoForEditar(null)}
        />
      )}
    </div>
  );
};

export default AdminInventoryActivosPage;
