import React, { useMemo, useState } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { ResponsiveTable, type TableColumn } from '../../../components/layout';
import { useGet } from '../../../hooks';

interface MovementRow {
  id: string;
  fecha_movimiento?: string;
  tipo?: string;
  articulo_nombre?: string;
  cantidad?: number;
  codigo_lote?: string | null;
  ubicacion_origen_nombre?: string | null;
  ubicacion_destino_nombre?: string | null;
  responsable_email?: string;
}

// TODO: Activos serializados — descomentar cuando se requiera gestión serial
// interface AssetMovementRow {
//   id: string;
//   fecha_movimiento?: string;
//   tipo?: string;
//   articulo_nombre?: string;
//   activo_codigo?: string;
//   activo_nro_serie?: string | null;
//   ubicacion_origen_nombre?: string | null;
//   ubicacion_destino_nombre?: string | null;
//   responsable_email?: string;
// }

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

const AdminInventoryMovementsPage: React.FC = () => {
  const [filters, setFilters] = useState({
    tipo: '',
    desde: '',
    hasta: '',
    limit: 25,
  });

  const queryParams = useMemo(
    () => ({
      tipo: filters.tipo || undefined,
      desde: filters.desde || undefined,
      hasta: filters.hasta || undefined,
      limit: filters.limit,
    }),
    [filters]
  );

  const {
    data: movements = [],
    isLoading,
    error,
  } = useGet<MovementRow[]>(
    ['admin-inventory', 'movements', queryParams],
    '/inventario/movimientos-stock',
    queryParams,
    { placeholderData: keepPreviousData }
  );

  // TODO: Activos serializados — descomentar para habilitar tab de movimientos de activos
  // const { data: assetMovements = [], isLoading: activoLoading, error: activoError } =
  //   useGet<AssetMovementRow[]>(['admin-inventory', 'asset-movements', activoQueryParams], '/inventario/movimientos-activo', activoQueryParams, { placeholderData: keepPreviousData });

  const columns = useMemo<TableColumn<MovementRow>[]>(
    () => [
      {
        key: 'fecha_movimiento',
        header: 'Fecha',
        render: (value) => formatDateTime(String(value || '')),
      },
      { key: 'tipo', header: 'Tipo' },
      { key: 'articulo_nombre', header: 'Artículo' },
      {
        key: 'cantidad',
        header: 'Cantidad',
        align: 'right',
        render: (value) => toNumber(value),
      },
      {
        key: 'destino',
        header: 'Destino',
        render: (_value, row) => row.ubicacion_destino_nombre || row.ubicacion_origen_nombre || '-',
      },
      {
        key: 'responsable_email',
        header: 'Responsable',
        hideOnMobile: true,
      },
    ],
    []
  );

  const tipos = ['entrada', 'salida', 'reserva', 'liberacion', 'ajuste', 'devolucion', 'entrega'];

  return (
    <section className="bg-white rounded-lg shadow-md p-5 space-y-4" data-tour="admin-inventory-movements-table">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-dark-blue">Movimientos de Stock</h2>
        <p className="text-sm text-gray-500">Entradas y salidas registradas en la operación.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <select
          className="border rounded-md p-2"
          value={filters.tipo}
          onChange={(e) => setFilters((p) => ({ ...p, tipo: e.target.value }))}
        >
          <option value="">Todos los tipos</option>
          {tipos.map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <input
          className="border rounded-md p-2"
          type="date"
          value={filters.desde}
          onChange={(e) => setFilters((p) => ({ ...p, desde: e.target.value }))}
        />
        <input
          className="border rounded-md p-2"
          type="date"
          value={filters.hasta}
          onChange={(e) => setFilters((p) => ({ ...p, hasta: e.target.value }))}
        />
        <select
          className="border rounded-md p-2"
          value={filters.limit}
          onChange={(e) => setFilters((p) => ({ ...p, limit: Number(e.target.value) }))}
        >
          <option value={25}>25 registros</option>
          <option value={50}>50 registros</option>
          <option value={100}>100 registros</option>
        </select>
      </div>

      <ResponsiveTable
        caption="Movimientos recientes de stock"
        columns={columns}
        data={movements}
        loading={isLoading}
        emptyMessage="Sin movimientos para los filtros seleccionados."
      />

      {error && (
        <p className="text-sm text-red-600">
          No se pudieron cargar los movimientos. Reintenta en unos segundos.
        </p>
      )}
    </section>
  );
};

export default AdminInventoryMovementsPage;
