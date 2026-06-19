import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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
  const [leftOffset, setLeftOffset] = useState(0);
  const [entered, setEntered] = useState(false);

  // Portal escape: position: fixed breaks when any ancestor has transform (useElasticScroll
  // applies translateY to main's first child). ResizeObserver tracks sidebar width so the
  // bar never overlaps the sidebar on desktop.
  useLayoutEffect(() => {
    if (!isSelectMode) {
      setEntered(false);
      return;
    }

    const update = () => {
      if (window.innerWidth < 1024) {
        // Mobile: sidebar overlays as fixed panel, bar spans full width
        setLeftOffset(0);
      } else {
        const sidebar = document.getElementById('sidebar-nav');
        setLeftOffset(sidebar ? Math.max(0, sidebar.getBoundingClientRect().right) : 0);
      }
    };

    update();
    // Trigger enter transition after first paint
    requestAnimationFrame(() => setEntered(true));

    const sidebar = document.getElementById('sidebar-nav');
    const ro = new ResizeObserver(update);
    if (sidebar) ro.observe(sidebar);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [isSelectMode]);

  if (!isSelectMode) return null;

  const actionBtn =
    'text-xs px-3 py-2.5 rounded-lg font-medium transition-colors duration-150 ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-white ' +
    'disabled:opacity-40 disabled:cursor-not-allowed';

  return createPortal(
    <div
      role="toolbar"
      aria-label="Acciones sobre artículos seleccionados"
      style={{
        left: leftOffset,
        // Smooth follow when sidebar collapses/expands on desktop
        transition: entered
          ? 'transform 0.28s cubic-bezier(0.34, 1.2, 0.64, 1), left 0.3s ease-in-out'
          : 'none',
        transform: entered ? 'translateY(0)' : 'translateY(110%)',
        // Safe area for iOS home bar
        paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
      }}
      className="fixed bottom-0 right-0 z-40
        bg-[#1E2A4A] text-white
        border-t border-white/15
        shadow-[0_-4px_24px_rgba(0,0,0,0.28),0_-1px_0_rgba(255,255,255,0.05)]
        px-4 pt-3 sm:px-6"
    >
      {/* Mobile-first: stack on xs, row on sm+ */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">

        {/* Count + secondary links */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            aria-live="polite"
            aria-atomic="true"
            className="flex items-baseline gap-1.5 shrink-0"
          >
            <span className="text-base font-bold tabular-nums leading-none">{count}</span>
            <span className="text-xs text-white/55 font-normal">
              seleccionado{count !== 1 ? 's' : ''}
            </span>
          </span>

          <span className="h-3.5 w-px bg-white/20 shrink-0" aria-hidden="true" />

          <div className="flex items-center gap-3 flex-wrap">
            {count < totalVisible && (
              <button
                type="button"
                onClick={onSelectAll}
                disabled={isSubmitting}
                className="text-xs text-white/55 hover:text-white transition-colors underline underline-offset-2
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded
                  disabled:opacity-40"
              >
                Todos ({totalVisible})
              </button>
            )}
            <button
              type="button"
              onClick={onClear}
              aria-label="Limpiar selección"
              className="text-xs text-white/55 hover:text-white transition-colors underline underline-offset-2
                focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Primary action buttons */}
        <div className="flex gap-2 flex-wrap sm:shrink-0">
          {onReturnToBodega && (
            <button
              type="button"
              onClick={onReturnToBodega}
              disabled={count === 0 || isSubmitting}
              className={`${actionBtn} bg-white/10 hover:bg-white/20 active:bg-white/30`}
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
              className={`${actionBtn} bg-white/10 hover:bg-white/20 active:bg-white/30`}
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
              className={`${actionBtn} bg-[#2A64A4] hover:bg-[#1E52A0] active:bg-[#163D80] font-semibold`}
              aria-label={`Entregar o asignar ${count} artículo${count !== 1 ? 's' : ''}`}
            >
              Entregar / asignar
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default BulkSelectionToolbar;
