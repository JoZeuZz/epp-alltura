import React from 'react';

interface BulkSelectionToolbarProps {
  count: number;
  totalVisible: number;
  isSelectMode: boolean;
  onClear: () => void;
  onSelectAll: () => void;
  onDeliver?: () => void;
  onAssignToUser?: () => void;
  onReturnToBodega?: () => void;
  isSubmitting?: boolean;
}

const BulkSelectionToolbar: React.FC<BulkSelectionToolbarProps> = ({
  count,
  totalVisible,
  isSelectMode,
  onClear,
  onSelectAll,
  onDeliver,
  onAssignToUser,
  onReturnToBodega,
  isSubmitting = false,
}) => {
  if (!isSelectMode) return null;

  return (
    <div
      role="toolbar"
      aria-label="Acciones sobre artículos seleccionados"
      className="fixed bottom-0 left-0 right-0 z-40 bg-dark-blue text-white px-4 py-3 shadow-lg flex flex-wrap items-center gap-2 sm:gap-3"
    >
      <span
        aria-live="polite"
        aria-atomic="true"
        className="text-sm font-semibold min-w-[5rem]"
      >
        {count} seleccionado{count !== 1 ? 's' : ''}
      </span>

      <div className="flex gap-2 flex-1">
        {count < totalVisible && (
          <button
            type="button"
            onClick={onSelectAll}
            disabled={isSubmitting}
            className="text-xs text-white/80 hover:text-white underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Seleccionar todos ({totalVisible})
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-white/80 hover:text-white underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
          aria-label="Limpiar selección"
        >
          Limpiar
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {onReturnToBodega && (
          <button
            type="button"
            onClick={onReturnToBodega}
            disabled={count === 0 || isSubmitting}
            className="text-xs px-3 py-1.5 rounded bg-white/15 hover:bg-white/25 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={`Devolver ${count} artículo${count !== 1 ? 's' : ''} a bodega`}
          >
            Devolver a bodega
          </button>
        )}
        {onAssignToUser && (
          <button
            type="button"
            onClick={onAssignToUser}
            disabled={count === 0 || isSubmitting}
            className="text-xs px-3 py-1.5 rounded bg-white/15 hover:bg-white/25 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={`Asignar ${count} artículo${count !== 1 ? 's' : ''} a usuario`}
          >
            Asignar a usuario
          </button>
        )}
        {onDeliver && (
          <button
            type="button"
            onClick={onDeliver}
            disabled={count === 0 || isSubmitting}
            className="text-xs px-3 py-1.5 rounded bg-primary-blue hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={`Entregar ${count} artículo${count !== 1 ? 's' : ''}`}
          >
            Entregar / asignar
          </button>
        )}
      </div>
    </div>
  );
};

export default BulkSelectionToolbar;
