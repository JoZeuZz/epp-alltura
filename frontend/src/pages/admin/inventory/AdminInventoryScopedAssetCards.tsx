import React, { useEffect, useMemo, useState } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { ToolDetailsModal, ToolGrid } from '../../../components/tools';
import { useGet } from '../../../hooks';
import {
  getInventoryActivosPaged,
  type InventoryActivoDetailRow,
  type InventoryActivoTypeScope,
} from '../../../services/apiService';
import {
  getToolRawStatus,
  getToolVisibleCode,
  getToolVisibleLocation,
  getToolVisibleMonetaryValue,
  getToolVisibleName,
  getToolVisibleResponsible,
  toToolVisualStatus,
  type ToolPresentationSource,
} from '../../../utils/toolPresentation';
import { INVENTORY_ASSET_SCOPE_COPY } from './inventoryAssetScope.constants';

interface PagedResponseLike<T> {
  items?: T[];
  rows?: T[];
  data?:
    | T[]
    | {
        items?: T[];
        rows?: T[];
        data?: T[];
        total?: number;
        nextCursor?: string | null;
        hasMore?: boolean;
      };
  total?: number;
  nextCursor?: string | null;
  hasMore?: boolean;
}

const ESTADO_FILTERS = [
  { label: 'Todos', value: 'all' },
  { label: 'Disponibles', value: 'available' },
  { label: 'Asignadas', value: 'assigned' },
  { label: 'Mantención', value: 'maintenance' },
  { label: 'Baja', value: 'decommissioned' },
  { label: 'Perdidas', value: 'lost' },
  { label: 'Dañadas', value: 'damaged' },
  { label: 'Otros', value: 'unknown' },
] as const;

const normalizePagedResponse = (payload: unknown): {
  items: InventoryActivoDetailRow[];
  total: number | null;
  nextCursor: string | null;
  hasMore: boolean;
} => {
  const src = (payload || {}) as PagedResponseLike<InventoryActivoDetailRow>;
  const nested = Array.isArray(src.data) ? null : src.data;

  const items =
    src.items ?? src.rows ?? (Array.isArray(src.data) ? src.data : undefined) ?? nested?.items ?? nested?.rows ?? nested?.data ?? [];

  return {
    items: Array.isArray(items) ? items : [],
    total: typeof src.total === 'number' ? src.total : typeof nested?.total === 'number' ? nested.total : null,
    nextCursor: src.nextCursor ?? nested?.nextCursor ?? null,
    hasMore: Boolean(src.hasMore ?? nested?.hasMore ?? false),
  };
};

const moneyToNumber = (value: string): number | null => {
  if (!value || value.toLowerCase().includes('sin valor')) return null;
  const normalized = value.replace(/[^\d-]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCompactCLP = (value: number): string =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Math.round(value));

const PAGE_SIZE = 25;

interface AdminInventoryScopedAssetCardsProps {
  scope: InventoryActivoTypeScope;
}

const AdminInventoryScopedAssetCards: React.FC<AdminInventoryScopedAssetCardsProps> = ({ scope }) => {
  const copy = INVENTORY_ASSET_SCOPE_COPY[scope];
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const [ubicacionFilter, setUbicacionFilter] = useState<string>('all');

  const [rows, setRows] = useState<InventoryActivoDetailRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [selectedAsset, setSelectedAsset] = useState<ToolPresentationSource | null>(null);

  const queryParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      tipo_activo: scope,
    }),
    [scope]
  );

  const { data, isLoading, error, refetch } = useGet<unknown>(
    ['inventory-activos-paged', queryParams],
    '/inventario/activos-paged',
    queryParams,
    { placeholderData: keepPreviousData }
  );

  useEffect(() => {
    const normalized = normalizePagedResponse(data);
    setRows(normalized.items);
    setNextCursor(normalized.nextCursor);
    setHasMore(normalized.hasMore);
  }, [data]);

  const loadMore = async () => {
    if (!hasMore || !nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const moreRaw = await getInventoryActivosPaged({
        limit: PAGE_SIZE,
        cursor: nextCursor,
        tipo_activo: scope,
      });
      const normalized = normalizePagedResponse(moreRaw);
      setRows((prev) => [...prev, ...normalized.items]);
      setNextCursor(normalized.nextCursor);
      setHasMore(normalized.hasMore);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const ubicaciones = useMemo(() => {
    const values = new Set<string>();
    rows.forEach((row) => {
      const location = getToolVisibleLocation(row);
      if (location && location !== 'Sin ubicación') values.add(location);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredAssets = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      const code = getToolVisibleCode(row).toLowerCase();
      const name = getToolVisibleName(row).toLowerCase();
      const serial = String(row.nro_serie || '').toLowerCase();
      const location = getToolVisibleLocation(row);
      const visualStatus = toToolVisualStatus(getToolRawStatus(row));

      const matchesSearch = !term || code.includes(term) || name.includes(term) || serial.includes(term);
      const matchesStatus = estadoFilter === 'all' || visualStatus === estadoFilter;
      const matchesLocation = ubicacionFilter === 'all' || location === ubicacionFilter;

      return matchesSearch && matchesStatus && matchesLocation;
    });
  }, [rows, search, estadoFilter, ubicacionFilter]);

  const kpis = useMemo(() => {
    const total = filteredAssets.length;
    let available = 0;
    let assigned = 0;
    let liabilityValue = 0;

    filteredAssets.forEach((tool) => {
      const visualStatus = toToolVisualStatus(getToolRawStatus(tool));
      if (visualStatus === 'available') available += 1;
      if (visualStatus === 'assigned') {
        assigned += 1;
        const responsible = getToolVisibleResponsible(tool);
        const value = moneyToNumber(getToolVisibleMonetaryValue(tool));
        if (responsible !== 'Sin responsable' && value != null) {
          liabilityValue += value;
        }
      }
    });

    return { total, available, assigned, liabilityValue };
  }, [filteredAssets]);

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-dark-blue">{copy.managerTitle}</h2>
        <p className="text-neutral-gray mt-1 text-sm sm:text-base">{copy.managerDescription}</p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" aria-label={`KPIs de ${scope}`}>
        <KpiCard label={copy.totalLabel} value={String(kpis.total)} />
        <KpiCard label="Disponibles" value={String(kpis.available)} accent="text-green-600" />
        <KpiCard label="Asignadas" value={String(kpis.assigned)} accent="text-blue-600" />
        <KpiCard
          label="Valor bajo responsabilidad"
          value={kpis.liabilityValue > 0 ? formatCompactCLP(kpis.liabilityValue) : 'Sin valor registrado'}
          accent="text-amber-600"
        />
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-3" aria-label={`Filtros de ${scope}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Buscar</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Código, serie o artículo"
              aria-label="Buscar por código, serie o artículo"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</span>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              aria-label="Filtrar por estado"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
            >
              {ESTADO_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ubicación</span>
            <select
              value={ubicacionFilter}
              onChange={(e) => setUbicacionFilter(e.target.value)}
              aria-label="Filtrar por ubicación"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
            >
              <option value="all">Todas las ubicaciones</option>
              {ubicaciones.map((ubicacion) => (
                <option key={ubicacion} value={ubicacion}>
                  {ubicacion}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error ? (
        <section className="bg-white rounded-lg shadow-sm border border-red-100 p-4 space-y-3" role="alert">
          <p className="text-sm text-red-600">{copy.errorMessage}</p>
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
          >
            Reintentar
          </button>
        </section>
      ) : (
        <ToolGrid
          tools={filteredAssets}
          loading={isLoading}
          emptyMessage={copy.emptyMessage}
          selectedToolId={selectedAsset?.id ?? null}
          onToolSelect={setSelectedAsset}
        />
      )}

      {!isLoading && hasMore && (
        <div className="bg-white rounded-lg shadow-sm p-4 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            {isLoadingMore ? 'Cargando...' : copy.loadMoreLabel}
          </button>
        </div>
      )}

      <ToolDetailsModal
        isOpen={Boolean(selectedAsset)}
        tool={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onRefresh={() => {
          void refetch();
        }}
      />
    </div>
  );
};

const KpiCard: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent = 'text-dark-blue' }) => (
  <article className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
    <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
  </article>
);

export default AdminInventoryScopedAssetCards;
