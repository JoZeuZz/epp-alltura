import React from 'react';
import {
  getToolRawStatus,
  getToolStatusBadgeClasses,
  getToolStatusLabel,
  getToolVisibleCode,
  getToolVisibleLocation,
  getToolVisibleMonetaryValue,
  getToolVisibleName,
  getToolVisibleResponsible,
  getToolVisibleSerial,
  type ToolPresentationSource,
} from '../../utils/toolPresentation';

export interface ToolCardProps {
  tool: ToolPresentationSource;
  selected?: boolean;
  onSelect: (tool: ToolPresentationSource) => void;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, selected = false, onSelect }) => {
  const code = getToolVisibleCode(tool);
  const name = getToolVisibleName(tool);
  const statusRaw = getToolRawStatus(tool);
  const statusLabel = getToolStatusLabel(statusRaw);
  const serial = getToolVisibleSerial(tool);
  const location = getToolVisibleLocation(tool);
  const responsible = getToolVisibleResponsible(tool);
  const value = getToolVisibleMonetaryValue(tool);

  return (
    <button
      type="button"
      aria-label={`Ver detalles de ${code}`}
      aria-pressed={selected}
      onClick={() => onSelect(tool)}
      className={`flex h-full w-full flex-col rounded-lg border bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 ${
        selected ? 'border-primary-blue ring-1 ring-primary-blue' : 'border-gray-200 hover:border-primary-blue/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{code}</p>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold text-dark-blue">{name}</h3>
          {serial && <p className="mt-1 text-xs text-gray-500">Serie: {serial}</p>}
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${getToolStatusBadgeClasses(statusRaw)}`}
        >
          {statusLabel}
        </span>
      </div>

      <dl className="mt-4 flex-1 space-y-2 text-sm">
        <div>
          <dt className="inline font-medium text-gray-600">Ubicación: </dt>
          <dd className="inline text-gray-800">{location}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-gray-600">Responsable: </dt>
          <dd className="inline text-gray-800">{responsible}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-gray-600">Valor: </dt>
          <dd className="inline text-gray-800">{value}</dd>
        </div>
      </dl>
    </button>
  );
};

export default ToolCard;
