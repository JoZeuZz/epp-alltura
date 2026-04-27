import React, { useMemo } from 'react';
import Modal from '../Modal';
import { ResponsiveTable, type TableColumn } from '../layout';
import { formatQuantityInteger } from '../../utils/quantity';
import { getToolStatusBadgeClasses, getToolStatusLabel } from '../../utils/toolPresentation';
import type {
  InventoryActivoDetailRow,
  InventoryStockDetailRow,
  InventoryStockSummaryRow,
} from '../../services/apiService';

interface InventoryArticleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: InventoryStockSummaryRow | null;
  stockRows: InventoryStockDetailRow[];
  assetRows: InventoryActivoDetailRow[];
  isStockLoading: boolean;
  isAssetLoading: boolean;
  stockError?: unknown;
  assetError?: unknown;
  stockHasMore: boolean;
  assetHasMore: boolean;
  isLoadingMoreStock: boolean;
  isLoadingMoreAssets: boolean;
  onLoadMoreStock: () => void;
  onLoadMoreAssets: () => void;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('es-CL');
};

const formatCustodio = (row: InventoryActivoDetailRow) => {
  if (!row.custodio_nombres && !row.custodio_apellidos) {
    return 'Sin custodia activa';
  }
  return `${row.custodio_nombres || ''} ${row.custodio_apellidos || ''}`.trim();
};

const formatUltimoMovimientoActivo = (row: InventoryActivoDetailRow) => {
  if (!row.ultimo_movimiento_tipo) {
    return '—';
  }

  const base = `${row.ultimo_movimiento_tipo} · ${formatDateTime(row.ultimo_movimiento_fecha)}`;
  const ubicaciones = [row.ultimo_movimiento_origen_nombre, row.ultimo_movimiento_destino_nombre]
    .filter(Boolean)
    .join(' → ');

  return ubicaciones ? `${base} (${ubicaciones})` : base;
};

const formatDesdeCuando = (row: InventoryActivoDetailRow) => {
  const sourceDate = row.custodia_desde_en || row.entrega_confirmada_en;
  if (!sourceDate) {
    return '—';
  }

  const formatted = formatDateTime(sourceDate);
  if (row.dias_en_custodia === null || row.dias_en_custodia === undefined) {
    return formatted;
  }

  const diasLabel = row.dias_en_custodia === 1 ? '1 día' : `${row.dias_en_custodia} días`;
  return `${formatted} (${diasLabel})`;
};

const InventoryArticleDetailModal: React.FC<InventoryArticleDetailModalProps> = ({
  isOpen,
  onClose,
  article,
  stockRows,
  assetRows,
  isStockLoading,
  isAssetLoading,
  stockError,
  assetError,
  stockHasMore,
  assetHasMore,
  isLoadingMoreStock,
  isLoadingMoreAssets,
  onLoadMoreStock,
  onLoadMoreAssets,
}) => {
  const isSerial = assetRows.length > 0;

  const stockColumns = useMemo<TableColumn<InventoryStockDetailRow>[]>(
    () => [
      { key: 'ubicacion_nombre', header: 'Ubicación' },
      {
        key: 'cantidad_disponible',
        header: 'Disponible',
        align: 'right',
        render: (value) => formatQuantityInteger(value),
      },
      {
        key: 'cantidad_reservada',
        header: 'Reservada',
        align: 'right',
        render: (value) => formatQuantityInteger(value),
      },
      {
        key: 'ultimo_movimiento_tipo',
        header: 'Último movimiento',
        hideOnTablet: true,
        render: (_value, row) => {
          if (!row.ultimo_movimiento_tipo) {
            return '—';
          }
          return `${row.ultimo_movimiento_tipo} · ${formatDateTime(row.ultimo_movimiento_fecha)}`;
        },
      },
    ],
    []
  );

  const activosColumns = useMemo<TableColumn<InventoryActivoDetailRow>[]>(
    () => [
      { key: 'codigo', header: 'Código activo' },
      {
        key: 'nro_serie',
        header: 'Nro serie',
        render: (value) => String(value || '—'),
      },
      {
        key: 'ubicacion_nombre',
        header: 'Dónde está',
        render: (value, row) => String(value || row.custodia_ubicacion_nombre || '—'),
      },
      {
        key: 'custodio_nombres',
        header: 'Quién lo tiene',
        hideOnMobile: true,
        render: (_value, row) => formatCustodio(row),
      },
      {
        key: 'custodia_desde_en',
        header: 'Desde cuándo',
        hideOnTablet: true,
        render: (_value, row) => formatDesdeCuando(row),
      },
      {
        key: 'estado',
        header: 'Estado',
        render: (value) => {
          const estado = String(value || '');
          return (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getToolStatusBadgeClasses(estado)}`}>
              Estado: {getToolStatusLabel(estado)}
            </span>
          );
        },
      },
      {
        key: 'ultimo_movimiento_tipo',
        header: 'Último movimiento',
        hideOnTablet: true,
        render: (_value, row) => formatUltimoMovimientoActivo(row),
      },
    ],
    []
  );

  if (!article) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Detalle de ${article.articulo_nombre}`}>
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-dark-blue">{article.articulo_nombre}</h3>
          <p className="text-sm text-gray-600 mt-1">
            Modo: <span className="font-medium">{isSerial ? 'Por unidad serial' : 'Por cantidad'}</span>
          </p>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <p className="text-gray-600">
              Disponible total: <span className="font-medium">{formatQuantityInteger(article.disponible_total)}</span>
            </p>
            <p className="text-gray-600">
              Reservada total: <span className="font-medium">{formatQuantityInteger(article.reservada_total)}</span>
            </p>
            <p className="text-gray-600">
              Ubicaciones: <span className="font-medium">{formatQuantityInteger(article.ubicaciones_count)}</span>
            </p>
          </div>
        </div>

        {isSerial ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Detalle por activo serializado con ubicación, custodio, fecha de custodia y estado actual.
            </p>
            <ResponsiveTable
              caption="Activos serializados"
              columns={activosColumns}
              data={assetRows}
              loading={isAssetLoading && assetRows.length === 0}
              emptyMessage="Sin activos serializados para este artículo y filtros aplicados."
            />
            {assetHasMore && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onLoadMoreAssets}
                  disabled={isLoadingMoreAssets}
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {isLoadingMoreAssets ? 'Cargando...' : 'Cargar más activos'}
                </button>
              </div>
            )}
            {Boolean(assetError) && (
              <p className="text-sm text-red-600">No se pudo cargar el detalle de activos. Reintenta en unos segundos.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Detalle por ubicación para artículos no serializados.
            </p>
            <ResponsiveTable
              caption="Detalle de stock"
              columns={stockColumns}
              data={stockRows}
              loading={isStockLoading && stockRows.length === 0}
              emptyMessage="Sin filas de stock para este artículo y filtros aplicados."
            />
            {stockHasMore && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onLoadMoreStock}
                  disabled={isLoadingMoreStock}
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {isLoadingMoreStock ? 'Cargando...' : 'Cargar más stock'}
                </button>
              </div>
            )}
            {Boolean(stockError) && (
              <p className="text-sm text-red-600">No se pudo cargar el detalle de stock. Reintenta en unos segundos.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default InventoryArticleDetailModal;
