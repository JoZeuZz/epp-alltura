import React from 'react';
import { Link } from 'react-router-dom';
import { useGet } from '../../hooks/useGet';
import { Scaffold } from '../../types/api';
import Spinner from '../../components/Spinner';

interface DashboardSummary {
  totalCubicMeters: number;
  activeProjects: number;
  recentReportsCount: number;
  recentReports: Scaffold[];
}

// ===== Reusable Components =====

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  to?: string;
}> = ({ title, value, icon, to = null }) => {
  const content = (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className="mr-4 text-primary-blue">{icon}</div>
      <div>
        <h3 className="text-sm font-medium text-neutral-gray">{title}</h3>
        <p className="text-3xl font-bold text-dark-blue">{value}</p>
      </div>
    </div>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }
  return content;
};

const RecentReportsTable: React.FC<{ reports: Scaffold[] }> = ({ reports }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h2 className="text-2xl font-bold text-dark-blue mb-4">Últimos Reportes</h2>
    <div className="overflow-x-auto">
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
              Técnico
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-neutral-gray uppercase tracking-wider"
            >
              Fecha
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Ver</span>
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
                {report.user_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-gray">
                {new Date(report.assembly_created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link
                  to={`/admin/reports?projectId=${report.project_id}&reportId=${report.id}`}
                  className="text-primary-blue hover:text-opacity-80"
                >
                  Ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ===== Main Dashboard Component =====

const AdminDashboard: React.FC = () => {
  const {
    data: summary,
    isLoading,
    error,
  } = useGet<DashboardSummary>('dashboard-summary', '/dashboard/summary');

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner size="h-12 w-12" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500">{error.message}</div>;
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-dark-blue mb-8">Dashboard</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Total m³ Armados"
          value={`${summary?.totalCubicMeters.toLocaleString('de-DE') || 0} m³`}
          icon={<CubeIcon className="h-10 w-10" />}
        />
        <MetricCard
          title="Proyectos Activos"
          value={summary?.activeProjects || 0}
          icon={<FolderIcon className="h-10 w-10" />}
          to="/admin/projects"
        />
        <MetricCard
          title="Reportes Recientes (24h)"
          value={summary?.recentReportsCount || 0}
          icon={<DocumentIcon className="h-10 w-10" />}
          to="/admin/reports"
        />
      </div>

      {/* Recent Reports Table */}
      {summary?.recentReports && summary.recentReports.length > 0 && (
        <RecentReportsTable reports={summary.recentReports} />
      )}
    </div>
  );
};

// ===== SVG Icons (already in the file, kept for completeness) =====
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

const DocumentIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

export default AdminDashboard;
