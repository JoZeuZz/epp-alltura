import React from 'react';
import { ResponsiveGrid } from '../layout';
import type { ToolPresentationSource } from '../../utils/toolPresentation';
import Spinner from '../Spinner';
import ToolCard from './ToolCard';

export interface ToolGridProps {
  tools: ToolPresentationSource[];
  loading?: boolean;
  emptyMessage?: string;
  selectedToolId?: string | number | null;
  onToolSelect: (tool: ToolPresentationSource) => void;
  className?: string;
}

const LoadingSkeletonCard: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
      <div className="h-3 w-16 bg-gray-200 rounded" />
    </div>
    <div className="h-5 w-24 bg-gray-200 rounded mb-2" />
    <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
    <div className="space-y-2 mb-4">
      <div className="h-4 w-full bg-gray-200 rounded" />
      <div className="h-4 w-5/6 bg-gray-200 rounded" />
      <div className="h-4 w-2/3 bg-gray-200 rounded" />
    </div>
    <div className="h-7 w-24 bg-gray-200 rounded-full" />
  </div>
);

const ToolGrid: React.FC<ToolGridProps> = ({
  tools,
  loading = false,
  emptyMessage = 'No hay herramientas para mostrar.',
  selectedToolId = null,
  onToolSelect,
  className = '',
}) => {
  if (loading && tools.length === 0) {
    return (
      <div className={className} aria-live="polite">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3" role="status">
          <Spinner size="h-5 w-5" />
          <span>Cargando herramientas...</span>
        </div>
        <ResponsiveGrid variant="cards" gap="md">
          {Array.from({ length: 6 }).map((_, idx) => (
            <LoadingSkeletonCard key={`tool-skeleton-${idx}`} />
          ))}
        </ResponsiveGrid>
      </div>
    );
  }

  if (!loading && tools.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-8 text-center ${className}`} aria-live="polite">
        <p className="text-sm text-gray-700 font-medium">{emptyMessage}</p>
        <p className="text-xs text-gray-500 mt-1">Prueba ajustando filtros o limpiando la búsqueda.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveGrid variant="cards" gap="md" className="items-stretch">
        {tools.map((tool, index) => {
          const key = String(tool.id ?? `tool-${index}`);
          const isSelected = selectedToolId != null && String(selectedToolId) === String(tool.id);

          return (
            <ToolCard
              key={key}
              tool={tool}
              selected={isSelected}
              onSelect={onToolSelect}
            />
          );
        })}
      </ResponsiveGrid>
    </div>
  );
};

export default ToolGrid;
