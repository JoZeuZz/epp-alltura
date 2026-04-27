import React from 'react';
import MetricCard from './MetricCard';
import StatsCard from './StatsCard';
import { CustomGrid } from '../layout/ResponsiveGrid';

export interface ProjectDashboardSummary {
  // Cubic meters
  totalCubicMeters: number;
  assembledCubicMeters: number;
  disassembledCubicMeters: number;
  inProgressCubicMeters: number;
  historicalAssembledCubicMeters?: number;
  contractedCubicMeters?: number;
  completionPercentage?: number;
  assemblyProgressPercentage?: number;
  disassemblyProgressPercentage?: number;

  // Assets
  totalAssets: number;
  assembledAssets: number;
  disassembledAssets: number;
  inProgressAssets: number;
  greenCards: number;
  redCards: number;
  disassembledWithoutCardAssets?: number;
  activeCardsTotal?: number;

  // Extra indicators
  recentAssetsCount: number;
  avgProgress: number;
}

interface ProjectDashboardProps {
  summary: ProjectDashboardSummary;
  projectName?: string;
  className?: string;
}

const toSafeNumber = (value: number | undefined) =>
  Number.isFinite(value) ? Number(value) : 0;

const clampPercentage = (value: number) => Math.max(0, Math.min(100, value));

const formatM3 = (value: number) => toSafeNumber(value).toFixed(2);

const formatPercentage = (value: number, total: number) => {
  if (total <= 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};

const CubeIcon = (
  <svg fill="currentColor" viewBox="0 0 20 20" className="w-full h-full" aria-hidden="true">
    <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
  </svg>
);

const ChartBarIcon = (
  <svg fill="currentColor" viewBox="0 0 20 20" className="w-full h-full" aria-hidden="true">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
  </svg>
);

const CheckCircleIcon = (
  <svg fill="currentColor" viewBox="0 0 20 20" className="w-full h-full" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
);

const WarningIcon = (
  <svg fill="currentColor" viewBox="0 0 20 20" className="w-full h-full" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l6.516 11.59c.75 1.334-.213 2.997-1.742 2.997H3.483c-1.53 0-2.492-1.663-1.742-2.997l6.516-11.59zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
      clipRule="evenodd"
    />
  </svg>
);

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ summary, projectName, className }) => {
  const totalCubicMeters = toSafeNumber(summary.totalCubicMeters);
  const assembledCubicMeters = toSafeNumber(summary.assembledCubicMeters);
  const disassembledCubicMeters = toSafeNumber(summary.disassembledCubicMeters);
  const inProgressCubicMeters = toSafeNumber(summary.inProgressCubicMeters);
  const contractedCubicMeters = toSafeNumber(summary.contractedCubicMeters);
  const historicalAssembledCubicMeters =
    toSafeNumber(summary.historicalAssembledCubicMeters) || assembledCubicMeters;

  const totalAssets = toSafeNumber(summary.totalAssets);
  const assembledAssets = toSafeNumber(summary.assembledAssets);
  const inProgressAssets = toSafeNumber(summary.inProgressAssets);
  const disassembledAssets = toSafeNumber(summary.disassembledAssets);

  const greenCards = toSafeNumber(summary.greenCards);
  const redCards = toSafeNumber(summary.redCards);
  const activeCardsTotal =
    toSafeNumber(summary.activeCardsTotal) || greenCards + redCards;

  const avgProgress = clampPercentage(toSafeNumber(summary.avgProgress));
  const recentAssetsCount = toSafeNumber(summary.recentAssetsCount);

  const completionPercentage = clampPercentage(
    summary.completionPercentage ??
      (contractedCubicMeters > 0 ? (totalCubicMeters / contractedCubicMeters) * 100 : 0)
  );

  const assemblyProgressPercentage = clampPercentage(
    summary.assemblyProgressPercentage ??
      (contractedCubicMeters > 0
        ? (assembledCubicMeters / contractedCubicMeters) * 100
        : totalCubicMeters > 0
          ? (assembledCubicMeters / totalCubicMeters) * 100
          : 0)
  );

  const disassemblyProgressPercentage = clampPercentage(
    summary.disassemblyProgressPercentage ??
      (historicalAssembledCubicMeters > 0
        ? (disassembledCubicMeters / historicalAssembledCubicMeters) * 100
        : 0)
  );

  const disassembledWithoutCardAssets = toSafeNumber(
    summary.disassembledWithoutCardAssets
  );

  return (
    <div className={`space-y-4 sm:space-y-6 ${className || ''}`}>
      {projectName && (
        <div>
          <h2 className="heading-2 text-dark-blue">Project Dashboard</h2>
          <p className="body-base text-neutral-gray">{projectName}</p>
        </div>
      )}

      {redCards > 0 && (
        <div className="rounded-lg border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-700">
          There are {redCards} asset{redCards === 1 ? '' : 's'} with red card status.
        </div>
      )}

      <CustomGrid cols={2} mdCols={2} lgCols={4} gap="md">
        <MetricCard
          title="Total Assets"
          value={totalAssets}
          icon={CubeIcon}
          colorClass="text-primary-blue"
        />
        <MetricCard
          title="Total m3"
          value={`${formatM3(totalCubicMeters)} m3`}
          icon={ChartBarIcon}
          colorClass="text-blue-600"
        />
        <MetricCard
          title="Average Progress"
          value={`${Math.round(avgProgress)}%`}
          icon={CheckCircleIcon}
          subtitle={`${recentAssetsCount} asset(s) created recently`}
          colorClass="text-green-600"
        />
        <MetricCard
          title="Active Cards"
          value={activeCardsTotal}
          icon={WarningIcon}
          subtitle={redCards > 0 ? `${redCards} red card(s)` : 'No red cards'}
          colorClass={redCards > 0 ? 'text-red-600' : 'text-yellow-600'}
        />
      </CustomGrid>

      <CustomGrid cols={1} lgCols={2} gap="md">
        <StatsCard
          title="Asset Status"
          icon={CubeIcon}
          items={[
            {
              label: 'Assembled',
              value: `${assembledAssets} (${formatPercentage(assembledAssets, totalAssets)})`,
              color: 'text-green-600',
            },
            {
              label: 'In Progress',
              value: `${inProgressAssets} (${formatPercentage(inProgressAssets, totalAssets)})`,
              color: 'text-blue-600',
            },
            {
              label: 'Disassembled',
              value: `${disassembledAssets} (${formatPercentage(disassembledAssets, totalAssets)})`,
              color: 'text-yellow-600',
            },
          ]}
        />

        <StatsCard
          title="Card Status"
          icon={WarningIcon}
          items={[
            {
              label: 'Green Cards',
              value: greenCards,
              color: 'text-green-600',
            },
            {
              label: 'Red Cards',
              value: redCards,
              color: 'text-red-600',
            },
            {
              label: 'Disassembled Without Card',
              value: disassembledWithoutCardAssets,
              color: 'text-neutral-gray',
            },
          ]}
        />
      </CustomGrid>

      <div className="rounded-lg bg-gradient-to-r from-primary-blue to-dark-blue p-4 text-white shadow-md sm:p-5">
        <h3 className="label-large mb-4">Cubic Meters Progress</h3>

        <div className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>Assembly</span>
              <span>{Math.round(assemblyProgressPercentage)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/20">
              <div
                className="h-2 rounded-full bg-green-300 transition-all duration-500"
                style={{ width: `${assemblyProgressPercentage}%` }}
              />
            </div>
            <p className="mt-1 text-xs opacity-80">
              {formatM3(assembledCubicMeters)} m3 assembled
            </p>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>Disassembly</span>
              <span>{Math.round(disassemblyProgressPercentage)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/20">
              <div
                className="h-2 rounded-full bg-yellow-200 transition-all duration-500"
                style={{ width: `${disassemblyProgressPercentage}%` }}
              />
            </div>
            <p className="mt-1 text-xs opacity-80">
              {formatM3(disassembledCubicMeters)} m3 disassembled
            </p>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>Contract Completion</span>
              <span>{Math.round(completionPercentage)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/20">
              <div
                className="h-2 rounded-full bg-blue-200 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className="mt-1 text-xs opacity-80">
              {contractedCubicMeters > 0
                ? `${formatM3(totalCubicMeters)} m3 of ${formatM3(contractedCubicMeters)} m3 contracted`
                : `${formatM3(totalCubicMeters)} m3 total`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <p className="text-xs opacity-80">Active Assets</p>
              <p className="text-xl font-semibold">{assembledAssets + inProgressAssets}</p>
            </div>
            <div>
              <p className="text-xs opacity-80">Active m3</p>
              <p className="text-xl font-semibold">
                {formatM3(assembledCubicMeters + inProgressCubicMeters)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDashboard;
