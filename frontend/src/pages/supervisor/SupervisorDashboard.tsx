import React from 'react';
import { useLoaderData, useLocation } from 'react-router-dom';
import { ResponsiveTable } from '@jozeuzz/alltura-ui';
import type { TableColumn } from '@jozeuzz/alltura-ui';

interface SupervisorData {
  summary?: any;
  movimientosActivo?: any[];
}

const movimientoColumns: TableColumn[] = [
  {
    key: 'fecha_movimiento',
    header: 'Fecha',
    hideOnMobile: true,
    render: (value: string) => new Date(value).toLocaleString(),
  },
  { key: 'activo_codigo', header: 'Activo', render: (v: string) => v || '-' },
  { key: 'tipo', header: 'Tipo' },
  {
    key: 'ubicacion_destino_nombre',
    header: 'Destino',
    hideOnMobile: true,
    render: (v: string) => v || '-',
  },
];

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
    <div className="space-y-6" data-tour="supervisor-dashboard-root">
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
        <section data-tour="supervisor-dashboard-movements">
          <h2 className="text-lg font-semibold text-dark-blue mb-3">Movimientos Recientes de Activos</h2>
          <ResponsiveTable
            columns={movimientoColumns}
            data={(data.movimientosActivo || []).slice(0, 12)}
            getRowKey={(row) => row.id}
            emptyMessage="Sin movimientos recientes"
          />
        </section>
      )}
    </div>
  );
};

export default SupervisorDashboard;
