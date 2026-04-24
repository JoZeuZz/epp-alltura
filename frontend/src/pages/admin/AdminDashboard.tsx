import React from 'react';
import { useLoaderData, useLocation } from 'react-router-dom';

interface DashboardData {
  summary?: any;
  stock?: any[];
  movimientosStock?: any[];
  movimientosActivo?: any[];
}

const Card: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
  <div className="bg-white rounded-lg shadow-md p-5">
    <p className="text-sm text-neutral-gray">{title}</p>
    <p className="text-3xl font-bold text-dark-blue mt-2">{value}</p>
  </div>
);

const DataTable: React.FC<{ title: string; columns: string[]; rows: Array<Array<string | number>> }> = ({
  title,
  columns,
  rows,
}) => (
  <section className="bg-white rounded-lg shadow-md p-5">
    <h2 className="text-lg font-semibold text-dark-blue mb-4">{title}</h2>
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((column) => (
              <th key={column} className="text-left py-2 px-2 font-semibold text-gray-600 whitespace-nowrap">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-4 px-2 text-neutral-gray">
                Sin registros.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={`row-${index}`} className="border-b last:border-b-0 border-gray-100">
                {row.map((value, idx) => (
                  <td key={`cell-${index}-${idx}`} className="py-2 px-2 whitespace-nowrap">
                    {value}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </section>
);

const AdminDashboard: React.FC = () => {
  const data = useLoaderData() as DashboardData;
  const location = useLocation();
  const section = location.pathname.split('/').pop() || 'dashboard';

  const summary = data.summary || {};
  const activos = summary.activos || {};
  const entregas = summary.entregas || {};
  const devoluciones = summary.devoluciones || {};
  const firmas = summary.firmas || {};
  const stock = summary.stock || {};

  return (
    <div className="space-y-6" data-tour="admin-dashboard-root">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Panel de Equipos y Herramientas</h1>
        <p className="text-neutral-gray mt-1">
          {section === 'dashboard' && 'Vista operativa de inventario, entregas, devoluciones y firmas.'}
          {section === 'trazabilidad' && 'Revisa los movimientos recientes de stock y activos.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card title="Activos Totales" value={activos.total || 0} />
        <Card title="Activos Asignados" value={activos.asignado || 0} />
        <Card title="Entregas Pend. Firma" value={entregas.pendiente_firma || 0} />
        <Card title="Devoluciones Borrador" value={devoluciones.borrador || 0} />
        <Card title="Firmas 30 días" value={firmas.firmadas_30d || 0} />
        <Card title="Stock Disponible" value={stock.total_disponible || 0} />
        <Card title="Stock Reservado" value={stock.total_reservado || 0} />
        <Card title="Registros Agotados" value={stock.registros_agotados || 0} />
      </div>

      {(section === 'dashboard' || section === 'trazabilidad') && (
        <DataTable
          title="Movimientos de Stock Recientes"
          columns={['Fecha', 'Tipo', 'Artículo', 'Cantidad', 'Destino']}
          rows={(data.movimientosStock || []).slice(0, 12).map((item) => [
            new Date(item.fecha_movimiento).toLocaleString(),
            item.tipo,
            item.articulo_nombre || '-',
            Number(item.cantidad || 0),
            item.ubicacion_destino_nombre || '-',
          ])}
        />
      )}

      {(section === 'dashboard' || section === 'trazabilidad') && (
        <DataTable
          title="Movimientos de Activo Recientes"
          columns={['Fecha', 'Tipo', 'Activo', 'Artículo', 'Destino']}
          rows={(data.movimientosActivo || []).slice(0, 12).map((item) => [
            new Date(item.fecha_movimiento).toLocaleString(),
            item.tipo,
            item.activo_codigo || '-',
            item.articulo_nombre || '-',
            item.ubicacion_destino_nombre || '-',
          ])}
        />
      )}

      {section === 'dashboard' && (
        <DataTable
          title="Stock Actual (Muestra)"
          columns={['Artículo', 'Ubicación', 'Disponible', 'Reservada']}
          rows={(data.stock || []).slice(0, 12).map((item) => [
            item.articulo_nombre || '-',
            item.ubicacion_nombre || '-',
            Number(item.cantidad_disponible || 0),
            Number(item.cantidad_reservada || 0),
          ])}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
