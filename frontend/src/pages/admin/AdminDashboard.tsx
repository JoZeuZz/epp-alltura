import React from 'react';
import { Link, useLoaderData } from 'react-router-dom';
import { Scaffold } from '../../types/api';
import { formatDisplayName } from '../../utils/name';
import { ResponsiveGrid } from '../../components/layout';

interface DashboardSummary {
  // Proyectos y clientes
  activeProjects: number;
  activeClients: number;
  
  // Metros cúbicos
  totalCubicMeters: number;
  assembledCubicMeters: number;
  disassembledCubicMeters: number;
  inProgressCubicMeters: number;
  
  // Andamios
  totalScaffolds: number;
  assembledScaffolds: number;
  disassembledScaffolds: number;
  inProgressScaffolds: number;
  greenCards: number;
  redCards: number;
  
  // Recientes
  recentScaffoldsCount: number;
  recentScaffolds: Scaffold[];
}

interface LoaderData {
  user: {
    id: number;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
  };
  summary: DashboardSummary;
}

// ===== Reusable Components =====

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  to?: string;
  subtitle?: string;
  colorClass?: string;
}> = ({ title, value, icon, to = null, subtitle, colorClass = 'text-primary-blue' }) => {
  const content = (
    <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md flex items-center gap-2 sm:gap-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className={`${colorClass} flex-shrink-0`}>
        <div className="w-8 h-8 sm:w-9 sm:h-9">{icon}</div>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-xs sm:text-sm text-gray-600 mb-0.5">{title}</h3>
        <p className="text-2xl sm:text-3xl font-bold text-dark-blue leading-tight">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }
  return content;
};

const StatsCard: React.FC<{
  title: string;
  items: Array<{ label: string; value: string | number; color?: string }>;
  icon: React.ReactNode;
}> = ({ title, items, icon }) => (
  <div className="bg-white p-3 sm:p-4 md:p-5 rounded-lg shadow-md">
    <div className="flex items-center gap-2 mb-3">
      <div className="text-primary-blue w-5 h-5 sm:w-6 sm:h-6">{icon}</div>
      <h2 className="text-base sm:text-lg font-semibold text-dark-blue">{title}</h2>
    </div>
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex justify-between items-center">
          <span className="body-base text-neutral-gray">{item.label}</span>
          <span className={`text-lg font-semibold ${item.color || 'text-dark-blue'}`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const RecentReportsTable: React.FC<{ reports: Scaffold[] }> = ({ reports }) => (
  <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
    <h2 className="heading-2 text-dark-blue mb-3 md:mb-4">Últimos Andamios Creados</h2>
    {reports.length === 0 ? (
      <p className="text-center text-neutral-gray py-4">No hay andamios recientes</p>
    ) : (
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-neutral-gray uppercase tracking-wider"
                  >
                    Proyecto
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-neutral-gray uppercase tracking-wider"
                  >
                    Creado por
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-neutral-gray uppercase tracking-wider"
                  >
                    Estado
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-neutral-gray uppercase tracking-wider"
                  >
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark-blue">
                      {report.project_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-gray">
                      {formatDisplayName(report.created_by_name) || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          report.assembly_status === 'assembled'
                            ? 'bg-green-100 text-green-800'
                            : report.assembly_status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {report.assembly_status === 'assembled'
                          ? 'Armado'
                          : report.assembly_status === 'in_progress'
                          ? 'En Proceso'
                          : 'Desarmado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-gray">
                      {report.created_at ? new Date(report.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
      </div>
    )}
  </div>
);

// ===== Main Dashboard Component =====

const AdminDashboard: React.FC = () => {
  const { summary } = useLoaderData() as LoaderData;

  const formatNumber = (num: number) => num.toLocaleString('de-DE');
  const formatM3 = (num: number) => `${formatNumber(num)} m³`;

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Dashboard</h1>

      {/* Sección: Resumen General */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-dark-blue mb-2 sm:mb-3">Resumen General</h2>
        <ResponsiveGrid variant="stats" gap="md">
          <MetricCard
            title="Proyectos Activos"
            value={summary?.activeProjects || 0}
            icon={<FolderIcon className="h-10 w-10" />}
            to="/admin/projects"
            colorClass="text-blue-600"
          />
          <MetricCard
            title="Clientes Activos"
            value={summary?.activeClients || 0}
            icon={<UsersIcon className="h-10 w-10" />}
            to="/admin/clients"
            colorClass="text-purple-600"
          />
          <MetricCard
            title="Total Andamios"
            value={summary?.totalScaffolds || 0}
            icon={<CubeIcon className="h-10 w-10" />}
            to="/admin/scaffolds"
            colorClass="text-indigo-600"
          />
          <MetricCard
            title="Nuevos (24h)"
            value={summary?.recentScaffoldsCount || 0}
            icon={<ClockIcon className="h-10 w-10" />}
            subtitle="Andamios creados hoy"
            colorClass="text-orange-600"
          />
        </ResponsiveGrid>
      </div>

      {/* Sección: Desglose de Metros Cúbicos */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-dark-blue mb-2 sm:mb-3">Desglose de Metros Cúbicos (m³)</h2>
        <ResponsiveGrid variant="stats" gap="md">
          <MetricCard
            title="Total m³"
            value={formatM3(summary?.totalCubicMeters || 0)}
            icon={<ChartBarIcon className="h-10 w-10" />}
            colorClass="text-gray-700"
          />
          <MetricCard
            title="m³ Armados"
            value={formatM3(summary?.assembledCubicMeters || 0)}
            icon={<CheckCircleIcon className="h-10 w-10" />}
            colorClass="text-green-600"
            subtitle={`${summary?.assembledScaffolds || 0} andamios`}
          />
          <MetricCard
            title="m³ En Proceso"
            value={formatM3(summary?.inProgressCubicMeters || 0)}
            icon={<RefreshIcon className="h-10 w-10" />}
            colorClass="text-yellow-600"
            subtitle={`${summary?.inProgressScaffolds || 0} andamios`}
          />
          <MetricCard
            title="m³ Desarmados"
            value={formatM3(summary?.disassembledCubicMeters || 0)}
            icon={<XCircleIcon className="h-10 w-10" />}
            colorClass="text-red-600"
            subtitle={`${summary?.disassembledScaffolds || 0} andamios`}
          />
        </ResponsiveGrid>
      </div>

      {/* Sección: Estadísticas Detalladas */}
      <ResponsiveGrid variant="wide" gap="lg">
        {/* Andamios por Estado */}
        <StatsCard
          title="Andamios por Estado"
          icon={<CubeIcon className="h-6 w-6" />}
          items={[
            {
              label: 'Armados',
              value: `${summary?.assembledScaffolds || 0} (${
                summary?.totalScaffolds
                  ? Math.round(((summary.assembledScaffolds || 0) / summary.totalScaffolds) * 100)
                  : 0
              }%)`,
              color: 'text-green-600',
            },
            {
              label: 'En Proceso',
              value: `${summary?.inProgressScaffolds || 0} (${
                summary?.totalScaffolds
                  ? Math.round(((summary.inProgressScaffolds || 0) / summary.totalScaffolds) * 100)
                  : 0
              }%)`,
              color: 'text-yellow-600',
            },
            {
              label: 'Desarmados',
              value: `${summary?.disassembledScaffolds || 0} (${
                summary?.totalScaffolds
                  ? Math.round(((summary.disassembledScaffolds || 0) / summary.totalScaffolds) * 100)
                  : 0
              }%)`,
              color: 'text-red-600',
            },
            {
              label: 'Total',
              value: summary?.totalScaffolds || 0,
              color: 'text-dark-blue',
            },
          ]}
        />

        {/* Tarjetas de Seguridad */}
        <StatsCard
          title="Tarjetas de Seguridad"
          icon={<ShieldIcon className="h-6 w-6" />}
          items={[
            {
              label: 'Tarjetas Verdes',
              value: `${summary?.greenCards || 0} (${
                summary?.totalScaffolds
                  ? Math.round(((summary.greenCards || 0) / summary.totalScaffolds) * 100)
                  : 0
              }%)`,
              color: 'text-green-600',
            },
            {
              label: 'Tarjetas Rojas',
              value: `${summary?.redCards || 0} (${
                summary?.totalScaffolds
                  ? Math.round(((summary.redCards || 0) / summary.totalScaffolds) * 100)
                  : 0
              }%)`,
              color: 'text-red-600',
            },
            {
              label: 'Total',
              value: summary?.totalScaffolds || 0,
              color: 'text-dark-blue',
            },
          ]}
        />
      </ResponsiveGrid>

      {/* Tabla de Últimos Andamios */}
      {summary?.recentScaffolds && summary.recentScaffolds.length > 0 && (
        <RecentReportsTable reports={summary.recentScaffolds} />
      )}
    </div>
  );
};

// ===== SVG Icons =====
const CubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    />
  </svg>
);

const FolderIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    />
  </svg>
);

const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const ClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ChartBarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const RefreshIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const XCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ShieldIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

export default AdminDashboard;
