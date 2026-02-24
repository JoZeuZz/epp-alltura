import React, { useMemo, useState } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ResponsiveTable, type TableColumn } from '../../../components/layout';
import { useGet } from '../../../hooks';

interface ArticuloOption {
  id: string;
  nombre: string;
}

interface UbicacionOption {
  id: string;
  nombre: string;
}

interface StockRow {
  id: string;
  articulo_nombre?: string;
  ubicacion_nombre?: string;
  codigo_lote?: string | null;
  cantidad_disponible?: number;
  cantidad_reservada?: number;
}

// TODO: Activos serializados — descomentar cuando se requiera gestión serial
// interface ActivoRow {
//   id: string;
//   codigo?: string;
//   nro_serie?: string | null;
//   articulo_nombre?: string;
//   articulo_tipo?: string;
//   ubicacion_nombre?: string | null;
//   estado?: string;
//   fecha_vencimiento?: string | null;
//   fecha_compra?: string | null;
// }
// const estadoBadge = (estado?: string) => { ... };
// const estadoLabel = (estado?: string) => { ... };

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
};

const AdminInventoryStockPage: React.FC = () => {
  const [filters, setFilters] = useState({
    search: '',
    articulo_id: '',
    ubicacion_id: '',
    limit: 25,
    offset: 0,
  });

  const queryParams = useMemo(
    () => ({
      search: filters.search || undefined,
      articulo_id: filters.articulo_id || undefined,
      ubicacion_id: filters.ubicacion_id || undefined,
      limit: filters.limit,
      offset: filters.offset,
    }),
    [filters]
  );

  const { data: articulos = [] } = useGet<ArticuloOption[]>(['admin-inventory', 'articulos'], '/articulos');
  const { data: ubicaciones = [] } = useGet<UbicacionOption[]>(
    ['admin-inventory', 'ubicaciones'],
    '/ubicaciones'
  );

  const {
    data: stock = [],
    isLoading,
    error,
  } = useGet<StockRow[]>(
    ['admin-inventory', 'stock', queryParams],
    '/inventario/stock',
    queryParams,
    { placeholderData: keepPreviousData }
  );

  // TODO: Activos serializados — descomentar para habilitar tab de activos
  // const { data: activos = [], isLoading: activosLoading, error: activosError } =
  //   useGet<ActivoRow[]>(['admin-inventory', 'activos', activoQueryParams], '/inventario/activos', activoQueryParams, { placeholderData: keepPreviousData });

  const columns = useMemo<TableColumn<StockRow>[]>(
    () => [
      { key: 'articulo_nombre', header: 'Artículo' },
      { key: 'ubicacion_nombre', header: 'Ubicación' },
      {
        key: 'cantidad_disponible',
        header: 'Disponible',
        align: 'right',
        render: (value) => toNumber(value),
      },
      {
        key: 'cantidad_reservada',
        header: 'Reservada',
        align: 'right',
        render: (value) => toNumber(value),
      },
      {
        key: 'codigo_lote',
        header: 'Lote',
        render: (value) => String(value || '-'),
      },
    ],
    []
  );

  return (
    <section className="bg-white rounded-lg shadow-md p-5 space-y-4" data-tour="admin-inventory-stock-table">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-dark-blue">Stock Actual</h2>
          <p className="text-sm text-gray-500">Consulta disponibilidad por artículo y ubicación.</p>
        </div>
        <Link
          to="/admin/inventario/articulos"
          className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
        >
          Gestionar Artículos
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          className="border rounded-md p-2"
          placeholder="Buscar artículo o lote"
          value={filters.search}
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value, offset: 0 }))}
        />
        <select
          className="border rounded-md p-2"
          value={filters.articulo_id}
          onChange={(e) => setFilters((p) => ({ ...p, articulo_id: e.target.value, offset: 0 }))}
        >
          <option value="">Todos los artículos</option>
          {articulos.map((item) => (
            <option key={item.id} value={item.id}>{item.nombre}</option>
          ))}
        </select>
        <select
          className="border rounded-md p-2"
          value={filters.ubicacion_id}
          onChange={(e) => setFilters((p) => ({ ...p, ubicacion_id: e.target.value, offset: 0 }))}
        >
          <option value="">Todas las ubicaciones</option>
          {ubicaciones.map((item) => (
            <option key={item.id} value={item.id}>{item.nombre}</option>
          ))}
        </select>
        <select
          className="border rounded-md p-2"
          value={filters.limit}
          onChange={(e) => setFilters((p) => ({ ...p, limit: Number(e.target.value), offset: 0 }))}
        >
          <option value={25}>25 registros</option>
          <option value={50}>50 registros</option>
          <option value={100}>100 registros</option>
        </select>
      </div>

      <ResponsiveTable
        caption="Stock actual por artículo y ubicación"
        columns={columns}
        data={stock}
        loading={isLoading}
        emptyMessage="Sin registros de stock para los filtros seleccionados."
      />

      {error && (
        <p className="text-sm text-red-600">No se pudo cargar el stock. Reintenta en unos segundos.</p>
      )}
    </section>
  );
};

export default AdminInventoryStockPage;
