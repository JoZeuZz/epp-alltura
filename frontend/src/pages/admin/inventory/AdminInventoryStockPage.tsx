import React, { useEffect, useMemo, useState } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ResponsiveTable, type TableColumn } from '../../../components/layout';
import InventoryArticleDetailModal from '../../../components/forms/InventoryArticleDetailModal';
import { useGet } from '../../../hooks';
import { formatQuantityInteger } from '../../../utils/quantity';
import {
  getInventoryActivosPaged,
  getInventoryStockPaged,
  getInventoryStockSummary,
  type CursorPaginatedResponse,
  type InventoryActivoDetailRow,
  type InventoryStockDetailRow,
  type InventoryStockSummaryRow,
} from '../../../services/apiService';

interface ArticuloOption {
  id: string;
  nombre: string;
}

interface UbicacionOption {
  id: string;
  nombre: string;
}

const AdminInventoryStockPage: React.FC = () => {
  const [assetScope, setAssetScope] = useState<'disponibles' | 'entregados' | 'todos'>('disponibles');
  const [filters, setFilters] = useState({
    search: '',
    articulo_id: '',
    ubicacion_id: '',
    limit: 25,
  });

  const [summaryNextCursor, setSummaryNextCursor] = useState<string | null>(null);
  const [summaryRows, setSummaryRows] = useState<InventoryStockSummaryRow[]>([]);
  const [summaryHasMore, setSummaryHasMore] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<InventoryStockSummaryRow | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [stockDetailNextCursor, setStockDetailNextCursor] = useState<string | null>(null);
  const [stockDetailRows, setStockDetailRows] = useState<InventoryStockDetailRow[]>([]);
  const [stockDetailHasMore, setStockDetailHasMore] = useState(false);

  const [assetDetailNextCursor, setAssetDetailNextCursor] = useState<string | null>(null);
  const [assetDetailRows, setAssetDetailRows] = useState<InventoryActivoDetailRow[]>([]);
  const [assetDetailHasMore, setAssetDetailHasMore] = useState(false);

  const [isLoadingMoreSummary, setIsLoadingMoreSummary] = useState(false);
  const [isLoadingMoreStockDetail, setIsLoadingMoreStockDetail] = useState(false);
  const [isLoadingMoreAssetDetail, setIsLoadingMoreAssetDetail] = useState(false);
  const [lastFilterSignature, setLastFilterSignature] = useState<string | null>(null);

  const resetDetailState = () => {
    setStockDetailNextCursor(null);
    setStockDetailRows([]);
    setStockDetailHasMore(false);
    setAssetDetailNextCursor(null);
    setAssetDetailRows([]);
    setAssetDetailHasMore(false);
    setIsLoadingMoreStockDetail(false);
    setIsLoadingMoreAssetDetail(false);
  };

  const openDetailModal = (row: InventoryStockSummaryRow) => {
    resetDetailState();
    setSelectedSummary(row);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    resetDetailState();
  };

  const queryParams = useMemo(
    () => ({
      search: filters.search || undefined,
      articulo_id: filters.articulo_id || undefined,
      ubicacion_id: filters.ubicacion_id || undefined,
      limit: filters.limit,
    }),
    [filters]
  );

  const filterSignature = useMemo(
    () => JSON.stringify({
      search: filters.search,
      articulo_id: filters.articulo_id,
      ubicacion_id: filters.ubicacion_id,
      limit: filters.limit,
    }),
    [filters]
  );

  const { data: articulos = [] } = useGet<ArticuloOption[]>(['admin-inventory', 'articulos'], '/articulos');
  const { data: ubicaciones = [] } = useGet<UbicacionOption[]>(
    ['admin-inventory', 'ubicaciones'],
    '/ubicaciones'
  );

  const {
    data: summaryResponse,
    isLoading: isSummaryLoading,
    error: summaryError,
  } = useGet<CursorPaginatedResponse<InventoryStockSummaryRow>>(
    ['admin-inventory', 'stock-summary', queryParams],
    '/inventario/stock-summary',
    queryParams,
    {
      placeholderData: keepPreviousData,
      refetchOnMount: 'always',
    }
  );

  useEffect(() => {
    if (!summaryResponse) {
      return;
    }

    setSummaryRows(summaryResponse.items);

    setSummaryHasMore(Boolean(summaryResponse.hasMore && summaryResponse.nextCursor));
    setSummaryNextCursor(summaryResponse.nextCursor || null);
    setIsLoadingMoreSummary(false);
  }, [summaryResponse]);

  useEffect(() => {
    if (lastFilterSignature === null) {
      setLastFilterSignature(filterSignature);
      return;
    }

    if (lastFilterSignature === filterSignature) {
      return;
    }

    setLastFilterSignature(filterSignature);
    setSummaryNextCursor(null);
    setSummaryRows([]);
    setSummaryHasMore(false);
    setSelectedSummary(null);
    closeDetailModal();
  }, [filterSignature, lastFilterSignature]);

  const detailQueryKey = useMemo(
    () => `${selectedSummary?.articulo_id || ''}|${filters.search || ''}|${filters.ubicacion_id || ''}|${assetScope}`,
    [assetScope, filters.search, filters.ubicacion_id, selectedSummary?.articulo_id]
  );

  const detailBaseParams = useMemo(
    () => ({
      search: filters.search || undefined,
      articulo_id: selectedSummary?.articulo_id || undefined,
      ubicacion_id: filters.ubicacion_id || undefined,
      limit: 25,
    }),
    [filters.search, filters.ubicacion_id, selectedSummary?.articulo_id]
  );

  const stockDetailParams = useMemo(
    () => ({
      ...detailBaseParams,
    }),
    [detailBaseParams]
  );

  const {
    data: stockDetailResponse,
    isLoading: isStockDetailLoading,
    error: stockDetailError,
  } = useGet<CursorPaginatedResponse<InventoryStockDetailRow>>(
    ['admin-inventory', 'stock-detail', detailQueryKey],
    '/inventario/stock-paged',
    stockDetailParams,
    {
      enabled: Boolean(selectedSummary?.articulo_id && isDetailModalOpen),
      placeholderData: keepPreviousData,
    }
  );

  useEffect(() => {
    if (!stockDetailResponse) {
      return;
    }

    setStockDetailRows(stockDetailResponse.items);

    setStockDetailHasMore(Boolean(stockDetailResponse.hasMore && stockDetailResponse.nextCursor));
    setStockDetailNextCursor(stockDetailResponse.nextCursor || null);
    setIsLoadingMoreStockDetail(false);
  }, [selectedSummary?.articulo_id, stockDetailResponse]);

  const assetDetailParams = useMemo(
    () => ({
      ...detailBaseParams,
      estado: assetScope === 'disponibles' ? 'en_stock' : undefined,
      solo_entregados: assetScope === 'entregados' ? true : undefined,
      cursor: undefined,
    }),
    [assetScope, detailBaseParams]
  );

  const {
    data: assetDetailResponse,
    isLoading: isAssetDetailLoading,
    error: assetDetailError,
  } = useGet<CursorPaginatedResponse<InventoryActivoDetailRow>>(
    ['admin-inventory', 'activos-detail', detailQueryKey],
    '/inventario/activos-paged',
    assetDetailParams,
    {
      enabled: Boolean(selectedSummary?.articulo_id && isDetailModalOpen),
      placeholderData: keepPreviousData,
    }
  );

  useEffect(() => {
    if (!assetDetailResponse) {
      return;
    }

    setAssetDetailRows(assetDetailResponse.items);

    setAssetDetailHasMore(Boolean(assetDetailResponse.hasMore && assetDetailResponse.nextCursor));
    setAssetDetailNextCursor(assetDetailResponse.nextCursor || null);
    setIsLoadingMoreAssetDetail(false);
  }, [assetDetailResponse, selectedSummary?.articulo_id]);

  const summaryColumns = useMemo<TableColumn<InventoryStockSummaryRow>[]>(
    () => [
      { key: 'articulo_nombre', header: 'Artículo' },
      {
        key: 'tracking_mode',
        header: 'Seguimiento',
        hideOnMobile: true,
        render: (value) => (value === 'serial' ? 'Por Unidad' : 'Por Lote'),
      },
      {
        key: 'ubicaciones_count',
        header: 'Ubicaciones',
        align: 'right',
        render: (value) => formatQuantityInteger(value),
      },
      {
        key: 'disponible_total',
        header: 'Disponible total',
        align: 'right',
        render: (value) => formatQuantityInteger(value),
      },
      {
        key: 'reservada_total',
        header: 'Reservada total',
        align: 'right',
        render: (value) => formatQuantityInteger(value),
      },
      {
        key: 'acciones',
        header: 'Acciones',
        align: 'right',
        render: (_value, row) => (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openDetailModal(row);
            }}
            className="px-2 py-1 text-xs rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Ver detalle
          </button>
        ),
      },
    ],
    []
  );

  const loadMoreSummary = async () => {
    if (!summaryNextCursor || !summaryHasMore) {
      return;
    }

    setIsLoadingMoreSummary(true);
    try {
      const response = await getInventoryStockSummary({
        search: filters.search || undefined,
        articulo_id: filters.articulo_id || undefined,
        ubicacion_id: filters.ubicacion_id || undefined,
        limit: filters.limit,
        cursor: summaryNextCursor,
      });

      setSummaryRows((prev) => {
        const merged = [...prev, ...response.items];
        const uniqueByArticle = new Map<string, InventoryStockSummaryRow>();
        for (const row of merged) {
          uniqueByArticle.set(row.articulo_id, row);
        }
        return Array.from(uniqueByArticle.values());
      });
      setSummaryHasMore(Boolean(response.hasMore && response.nextCursor));
      setSummaryNextCursor(response.nextCursor || null);
    } finally {
      setIsLoadingMoreSummary(false);
    }
  };

  const loadMoreStockDetail = async () => {
    if (!selectedSummary?.articulo_id || !stockDetailNextCursor || !stockDetailHasMore) {
      return;
    }

    setIsLoadingMoreStockDetail(true);
    try {
      const response = await getInventoryStockPaged({
        search: filters.search || undefined,
        articulo_id: selectedSummary.articulo_id,
        ubicacion_id: filters.ubicacion_id || undefined,
        limit: 25,
        cursor: stockDetailNextCursor,
      });

      setStockDetailRows((prev) => {
        const merged = [...prev, ...response.items];
        const uniqueById = new Map<string, InventoryStockDetailRow>();
        for (const row of merged) {
          uniqueById.set(row.id, row);
        }
        return Array.from(uniqueById.values());
      });
      setStockDetailHasMore(Boolean(response.hasMore && response.nextCursor));
      setStockDetailNextCursor(response.nextCursor || null);
    } finally {
      setIsLoadingMoreStockDetail(false);
    }
  };

  const loadMoreAssetDetail = async () => {
    if (!selectedSummary?.articulo_id || !assetDetailNextCursor || !assetDetailHasMore) {
      return;
    }

    setIsLoadingMoreAssetDetail(true);
    try {
      const response = await getInventoryActivosPaged({
        search: filters.search || undefined,
        articulo_id: selectedSummary.articulo_id,
        ubicacion_id: filters.ubicacion_id || undefined,
        estado: assetScope === 'disponibles' ? 'en_stock' : undefined,
        solo_entregados: assetScope === 'entregados' ? true : undefined,
        limit: 25,
        cursor: assetDetailNextCursor,
      });

      setAssetDetailRows((prev) => {
        const merged = [...prev, ...response.items];
        const uniqueById = new Map<string, InventoryActivoDetailRow>();
        for (const row of merged) {
          uniqueById.set(row.id, row);
        }
        return Array.from(uniqueById.values());
      });
      setAssetDetailHasMore(Boolean(response.hasMore && response.nextCursor));
      setAssetDetailNextCursor(response.nextCursor || null);
    } finally {
      setIsLoadingMoreAssetDetail(false);
    }
  };

  const assetScopeLabel =
    assetScope === 'disponibles'
      ? 'Disponibles'
      : assetScope === 'entregados'
        ? 'Solo entregados'
        : 'Todos';

  return (
    <section className="bg-white rounded-lg shadow-md p-5 space-y-4" data-tour="admin-inventory-stock-table">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-dark-blue">Stock</h2>
          <p className="text-sm text-gray-500">Explora artículos y abre detalle de lotes/activos sólo cuando lo necesites.</p>
        </div>
        <Link
          to="/admin/inventario/articulos"
          className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
        >
          Gestionar Artículos
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          className="border rounded-md p-2"
          placeholder="Buscar artículo"
          value={filters.search}
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
        />
        <select
          className="border rounded-md p-2"
          value={filters.articulo_id}
          onChange={(e) => setFilters((p) => ({ ...p, articulo_id: e.target.value }))}
        >
          <option value="">Todos los artículos</option>
          {articulos.map((item) => (
            <option key={item.id} value={item.id}>{item.nombre}</option>
          ))}
        </select>
        <select
          className="border rounded-md p-2"
          value={filters.ubicacion_id}
          onChange={(e) => setFilters((p) => ({ ...p, ubicacion_id: e.target.value }))}
        >
          <option value="">Todas las ubicaciones</option>
          {ubicaciones.map((item) => (
            <option key={item.id} value={item.id}>{item.nombre}</option>
          ))}
        </select>
        <select
          className="border rounded-md p-2"
          value={filters.limit}
          onChange={(e) => setFilters((p) => ({ ...p, limit: Number(e.target.value) }))}
        >
          <option value={25}>25 registros</option>
          <option value={50}>50 registros</option>
          <option value={100}>100 registros</option>
        </select>
        <select
          className="border rounded-md p-2"
          value={assetScope}
          onChange={(e) => setAssetScope(e.target.value as 'disponibles' | 'entregados' | 'todos')}
        >
          <option value="disponibles">Activos: disponibles</option>
          <option value="entregados">Activos: solo entregados</option>
          <option value="todos">Activos: todos</option>
        </select>
      </div>

      <p className="text-xs text-gray-500">Alcance activo para detalle serializado: {assetScopeLabel}.</p>

      <ResponsiveTable
        caption="Resumen de stock por artículo"
        columns={summaryColumns}
        data={summaryRows}
        loading={isSummaryLoading && summaryRows.length === 0}
        emptyMessage="Sin registros de stock para los filtros seleccionados."
        onRowClick={(row) => {
          openDetailModal(row);
        }}
      />

      {summaryHasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMoreSummary}
            disabled={isLoadingMoreSummary}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {isLoadingMoreSummary ? 'Cargando...' : 'Cargar más artículos'}
          </button>
        </div>
      )}

      {summaryError && (
        <p className="text-sm text-red-600">No se pudo cargar el resumen de stock. Reintenta en unos segundos.</p>
      )}

      <InventoryArticleDetailModal
        isOpen={isDetailModalOpen && Boolean(selectedSummary)}
        onClose={closeDetailModal}
        article={selectedSummary}
        stockRows={stockDetailRows}
        assetRows={assetDetailRows}
        isStockLoading={isStockDetailLoading}
        isAssetLoading={isAssetDetailLoading}
        stockError={stockDetailError}
        assetError={assetDetailError}
        stockHasMore={stockDetailHasMore}
        assetHasMore={assetDetailHasMore}
        isLoadingMoreStock={isLoadingMoreStockDetail}
        isLoadingMoreAssets={isLoadingMoreAssetDetail}
        onLoadMoreStock={loadMoreStockDetail}
        onLoadMoreAssets={loadMoreAssetDetail}
      />
    </section>
  );
};

export default AdminInventoryStockPage;
