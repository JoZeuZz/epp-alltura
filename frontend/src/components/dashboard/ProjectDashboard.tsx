import React from 'react';
import MetricCard from './MetricCard';
import StatsCard from './StatsCard';
import { CustomGrid } from '../layout';

interface ProjectDashboardSummary {
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

  // Adicionales
  recentScaffoldsCount: number;
  avgProgress: number;
}

interface ProjectDashboardProps {
  summary: ProjectDashboardSummary;
  projectName?: string;
}

/**
 * ProjectDashboard - Dashboard visual para métricas de proyecto
 * Muestra estadísticas y métricas visuales de un proyecto específico
 * Reutilizable en vistas de admin, supervisor y cliente
 */
const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ summary, projectName }) => {
  const formatM3 = (value: number): string => {
    return value.toFixed(2);
  };

  const formatPercentage = (value: number, total: number): string => {
    if (total === 0) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  };

  // Iconos reutilizables
  const CubeIcon = (
    <svg fill="currentColor" viewBox="0 0 20 20">
      <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
    </svg>
  );

  const CheckCircleIcon = (
    <svg fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );

  const RefreshIcon = (
    <svg fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
        clipRule="evenodd"
      />
    </svg>
  );

  const ChartBarIcon = (
    <svg fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  );

  const ClockIcon = (
    <svg fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
        clipRule="evenodd"
      />
    </svg>
  );

  const ShieldIcon = (
    <svg fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );

  return (
    <div className="space-y-6">
      {/* Título opcional */}
      {projectName && (
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-dark-blue">Dashboard del Proyecto</h2>
          <p className="text-gray-600">{projectName}</p>
        </div>
      )}

      {/* Métricas Principales - Grid responsive */}
      <CustomGrid cols={1} mdCols={2} lgCols={4} gap="md">
        <MetricCard
          title="Total Andamios"
          value={summary.totalScaffolds}
          icon={CubeIcon}
          colorClass="text-primary-blue"
        />
        <MetricCard
          title="Metros Cúbicos Total"
          value={`${formatM3(summary.totalCubicMeters)} m³`}
          icon={ChartBarIcon}
          colorClass="text-indigo-600"
          subtitle={`Promedio: ${summary.totalScaffolds > 0 ? formatM3(summary.totalCubicMeters / summary.totalScaffolds) : '0.00'} m³`}
        />
        <MetricCard
          title="Progreso Promedio"
          value={`${summary.avgProgress}%`}
          icon={ClockIcon}
          colorClass="text-blue-600"
          subtitle="Del proyecto completo"
        />
        <MetricCard
          title="Creados Hoy"
          value={summary.recentScaffoldsCount}
          icon={RefreshIcon}
          colorClass="text-green-600"
          subtitle="Últimas 24 horas"
        />
      </CustomGrid>

      {/* Estadísticas Detalladas - Grid 2 columnas */}
      <CustomGrid cols={1} lgCols={2} gap="md">
        {/* Estados de Andamios */}
        <StatsCard
          title="Estados de Andamios"
          icon={CubeIcon}
          items={[
            {
              label: 'Armados',
              value: `${summary.assembledScaffolds} (${formatPercentage(
                summary.assembledScaffolds,
                summary.totalScaffolds
              )})`,
              color: 'text-green-600',
            },
            {
              label: 'En Proceso',
              value: `${summary.inProgressScaffolds} (${formatPercentage(
                summary.inProgressScaffolds,
                summary.totalScaffolds
              )})`,
              color: 'text-blue-600',
            },
            {
              label: 'Desarmados',
              value: `${summary.disassembledScaffolds} (${formatPercentage(
                summary.disassembledScaffolds,
                summary.totalScaffolds
              )})`,
              color: 'text-yellow-600',
            },
          ]}
        />

        {/* Metros Cúbicos por Estado */}
        <StatsCard
          title="Metros Cúbicos por Estado"
          icon={ChartBarIcon}
          items={[
            {
              label: 'Armados',
              value: `${formatM3(summary.assembledCubicMeters)} m³`,
              color: 'text-green-600',
            },
            {
              label: 'En Proceso',
              value: `${formatM3(summary.inProgressCubicMeters)} m³`,
              color: 'text-blue-600',
            },
            {
              label: 'Desarmados',
              value: `${formatM3(summary.disassembledCubicMeters)} m³`,
              color: 'text-yellow-600',
            },
          ]}
        />

        {/* Tarjetas de Estado */}
        <StatsCard
          title="Tarjetas de Estado"
          icon={ShieldIcon}
          items={[
            {
              label: 'Tarjetas Verdes',
              value: `${summary.greenCards} (${formatPercentage(
                summary.greenCards,
                summary.totalScaffolds
              )})`,
              color: 'text-green-600',
            },
            {
              label: 'Tarjetas Rojas',
              value: `${summary.redCards} (${formatPercentage(
                summary.redCards,
                summary.totalScaffolds
              )})`,
              color: 'text-red-600',
            },
          ]}
        />

        {/* Estado General */}
        <div className="bg-gradient-to-br from-primary-blue to-indigo-700 p-5 rounded-lg shadow-md text-white">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6">{CheckCircleIcon}</div>
            <h2 className="text-lg font-semibold">Estado General</h2>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm opacity-90">Completado</span>
                <span className="text-sm font-semibold">
                  {formatPercentage(summary.assembledScaffolds, summary.totalScaffolds)}
                </span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-500"
                  style={{
                    width: formatPercentage(summary.assembledScaffolds, summary.totalScaffolds),
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <p className="text-xs opacity-75">Andamios Activos</p>
                <p className="text-2xl font-bold">
                  {summary.assembledScaffolds + summary.inProgressScaffolds}
                </p>
              </div>
              <div>
                <p className="text-xs opacity-75">M³ Activos</p>
                <p className="text-2xl font-bold">
                  {formatM3(summary.assembledCubicMeters + summary.inProgressCubicMeters)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CustomGrid>
    </div>
  );
};

export default ProjectDashboard;
