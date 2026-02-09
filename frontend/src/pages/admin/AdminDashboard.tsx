import React from 'react';
import { useLoaderData } from 'react-router-dom';

interface DashboardSummary {
  activeProjects?: number;
  activeClients?: number;
  totalScaffolds?: number;
  recentScaffoldsCount?: number;
}

interface LoaderData {
  summary?: DashboardSummary;
}

const Card: React.FC<{ title: string; value: number | string }> = ({ title, value }) => (
  <div className="bg-white rounded-lg shadow-md p-5">
    <p className="text-sm text-neutral-gray">{title}</p>
    <p className="text-3xl font-bold text-dark-blue mt-2">{value}</p>
  </div>
);

const AdminDashboard: React.FC = () => {
  const data = useLoaderData() as LoaderData;
  const summary = data?.summary || {};

  return (
    <div className="space-y-6" data-tour="admin-dashboard-root">
      <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Dashboard Admin</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card title="Proyectos Activos" value={summary.activeProjects || 0} />
        <Card title="Clientes Activos" value={summary.activeClients || 0} />
        <Card title="Total Registros" value={summary.totalScaffolds || 0} />
        <Card title="Nuevos (24h)" value={summary.recentScaffoldsCount || 0} />
      </div>
      <div className="bg-white rounded-lg shadow-md p-6 text-neutral-gray">
        Cascaron base listo. Esta pantalla queda preparada para metricas del modulo EPP/Herramientas.
      </div>
    </div>
  );
};

export default AdminDashboard;
