import React from 'react';
import { useLoaderData, useLocation } from 'react-router-dom';

interface SupervisorData {
  summary?: any;
  movimientosActivo?: any[];
}

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="bg-white rounded-lg shadow-md p-4">
    <p className="text-sm text-neutral-gray">{label}</p>
    <p className="text-2xl font-bold text-dark-blue mt-1">{value}</p>
  </div>
);

const SupervisorDashboard: React.FC = () => {
  const data = useLoaderData() as SupervisorData;
  const location = useLocation();
  const section = location.pathname.split('/').pop() || 'dashboard';

  const summary = data.summary || {};
  const activos = summary.activos || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Panel Supervisor de Equipos y Herramientas</h1>
        <p className="text-neutral-gray mt-1">
          {section === 'dashboard' && 'Estado actual del inventario y asignaciones.'}
          {section === 'trazabilidad' && 'Revisa movimientos recientes de activos en terreno.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat label="Activos en Stock" value={activos.en_stock || 0} />
        <Stat label="Activos Asignados" value={activos.asignado || 0} />
        <Stat label="En Mantención" value={activos.mantencion || 0} />
        <Stat label="Dados de Baja" value={activos.dado_de_baja || 0} />
      </div>

      {section === 'trazabilidad' && (
        <section className="bg-white rounded-lg shadow-md p-5">
          <h2 className="text-lg font-semibold text-dark-blue mb-3">Movimientos Recientes de Activos</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2">Fecha</th>
                  <th className="text-left py-2 px-2">Activo</th>
                  <th className="text-left py-2 px-2">Tipo</th>
                  <th className="text-left py-2 px-2">Destino</th>
                </tr>
              </thead>
              <tbody>
                {(data.movimientosActivo || []).slice(0, 12).map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0 border-gray-100">
                    <td className="py-2 px-2">{new Date(item.fecha_movimiento).toLocaleString()}</td>
                    <td className="py-2 px-2">{item.activo_codigo || '-'}</td>
                    <td className="py-2 px-2">{item.tipo}</td>
                    <td className="py-2 px-2">{item.ubicacion_destino_nombre || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default SupervisorDashboard;
