import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  getReturnEligibleAssets,
  type ReturnEligibleAssetRow,
} from '../../services/apiService';
import BarcodeScannerModal from './BarcodeScannerModal';
import { findAssetByScannedCode, parseScannedCode } from '../../utils/barcode';

export interface ReturnAssetSelection {
  activo_id: string;
  custodia_activo_id: string;
  codigo: string;
  nro_serie?: string | null;
  articulo_id: string;
  articulo_nombre?: string;
}

interface ReturnAssetSelectorProps {
  value: string[];
  onChange: (next: string[]) => void;
  onChangeSelection?: (next: ReturnAssetSelection[]) => void;
  trabajadorId?: string;
  articuloId?: string;
  excludedIds?: string[];
  label?: string;
  required?: boolean;
  disabled?: boolean;
  limit?: number;
}

const ReturnAssetSelector: React.FC<ReturnAssetSelectorProps> = ({
  value,
  onChange,
  onChangeSelection,
  trabajadorId,
  articuloId,
  excludedIds = [],
  label = 'Seleccionar activo',
  required = false,
  disabled = false,
  limit = 25,
}) => {
  const searchInputId = useId();
  const selectionStatusId = useId();
  const [search, setSearch] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [assets, setAssets] = useState<ReturnEligibleAssetRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const previousTrabajadorIdRef = useRef<string | undefined>(trabajadorId);

  const selectedId = useMemo(() => (Array.isArray(value) ? value.find(Boolean) ?? null : null), [value]);
  const excludedIdsSet = useMemo(() => new Set((excludedIds || []).filter(Boolean)), [excludedIds]);
  const visibleAssets = useMemo(
    () => assets.filter((item) => item.activo_id === selectedId || !excludedIdsSet.has(item.activo_id)),
    [assets, excludedIdsSet, selectedId]
  );

  const clearSelection = () => {
    onChange([]);
    onChangeSelection?.([]);
  };

  const toSelection = (item: ReturnEligibleAssetRow): ReturnAssetSelection => ({
    activo_id: item.activo_id,
    custodia_activo_id: item.custodia_activo_id,
    codigo: item.codigo,
    nro_serie: item.nro_serie ?? null,
    articulo_id: item.articulo_id,
    articulo_nombre: item.articulo_nombre,
  });

  const applyScannedCode = (rawCode: string) => {
    const parsedCode = parseScannedCode(rawCode);
    if (!parsedCode) return;

    setSearch(parsedCode);

    const matchedAsset = findAssetByScannedCode(visibleAssets, parsedCode);
    if (!matchedAsset) {
      return;
    }

    onChange([matchedAsset.activo_id]);
    onChangeSelection?.([toSelection(matchedAsset)]);
  };

  useEffect(() => {
    if (disabled || !trabajadorId) {
      setAssets([]);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const nextAssets = await getReturnEligibleAssets({
          trabajador_id: trabajadorId,
          articulo_id: articuloId || undefined,
          search: search.trim() || undefined,
          limit,
        });

        if (!cancelled) {
          setAssets(nextAssets);
        }
      } catch (error: unknown) {
        if (cancelled) return;

        const message =
          (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data
            ?.message ||
          (error as { message?: string })?.message ||
          'No se pudieron cargar custodias activas elegibles para devolución.';

        setLoadError(message);
        setAssets([]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [trabajadorId, articuloId, search, disabled, limit]);

  useEffect(() => {
    const previousTrabajadorId = previousTrabajadorIdRef.current;
    const changedWorker = previousTrabajadorId !== undefined && previousTrabajadorId !== trabajadorId;
    if (changedWorker && selectedId) {
      onChange([]);
      onChangeSelection?.([]);
    }
    previousTrabajadorIdRef.current = trabajadorId;
  }, [trabajadorId, selectedId, onChange, onChangeSelection]);

  useEffect(() => {
    if (!selectedId) return;
    if (visibleAssets.length === 0) return;

    const stillAvailable = visibleAssets.some((item) => item.activo_id === selectedId);
    if (!stillAvailable) {
      onChange([]);
      onChangeSelection?.([]);
    }
  }, [visibleAssets, selectedId, onChange, onChangeSelection]);

  useEffect(() => {
    if (!selectedId) return;
    if (!excludedIdsSet.has(selectedId)) return;
    onChange([]);
    onChangeSelection?.([]);
  }, [excludedIdsSet, onChange, onChangeSelection, selectedId]);

  const canSelect = !disabled && Boolean(trabajadorId) && !isLoading && !loadError;

  return (
    <div className="space-y-2">
      <label htmlFor={searchInputId} className="block text-xs font-medium text-content-secondary mb-1">
        {label} {required ? <span className="text-danger">*</span> : null}
      </label>

      <div className="flex gap-2">
        <input
          id={searchInputId}
          type="text"
          value={search}
          disabled={!trabajadorId || disabled}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por código interno o serie"
          className="flex-1 border border-edge-strong rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none disabled:bg-surface-overlay disabled:text-content-disabled"
          aria-describedby={selectionStatusId}
        />
        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          disabled={!trabajadorId || disabled}
          className="px-3 py-1.5 text-sm rounded-md border border-edge-strong hover:bg-surface-muted disabled:bg-surface-overlay disabled:text-content-disabled"
          aria-label="Escanear código"
        >
          Escanear
        </button>
      </div>

      {!trabajadorId ? (
          <p className="text-xs text-content-muted">Selecciona trabajador para cargar custodias activas.</p>
      ) : null}

      {isLoading ? <p className="text-xs text-content-muted">Cargando activos elegibles...</p> : null}

      {loadError ? (
        <p className="text-xs text-danger-text">
            {loadError} Reintenta para cargar las custodias activas elegibles.
        </p>
      ) : null}

      {canSelect && visibleAssets.length === 0 ? (
          <p className="text-xs text-content-muted">No hay custodias activas elegibles para devolución.</p>
      ) : null}

      {canSelect && visibleAssets.length > 0 ? (
        <div className="max-h-44 overflow-y-auto border border-edge rounded-md divide-y divide-edge bg-surface">
          {visibleAssets.map((item) => {
            const isSelected = item.activo_id === selectedId;

            return (
              <button
                type="button"
                key={item.activo_id}
                  onClick={() => {
                      if (excludedIdsSet.has(item.activo_id) && !isSelected) {
                        return;
                      }

                    if (isSelected) {
                      clearSelection();
                      return;
                    }

                    onChange([item.activo_id]);
                    onChangeSelection?.([toSelection(item)]);
                  }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  isSelected ? 'bg-blue-50 text-primary' : 'hover:bg-surface-muted text-content-secondary'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{item.codigo}</span>
                  {isSelected ? <span className="text-xs font-semibold">Seleccionado</span> : null}
                </div>
                <p className="text-xs text-content-muted">
                    {item.articulo_nombre || 'Sin artículo'}
                  {item.nro_serie ? ` · Serie: ${item.nro_serie}` : ''}
                </p>
                  <p className="text-[11px] text-content-disabled">Custodia: {item.custodia_activo_id.slice(0, 8)}</p>
              </button>
            );
          })}
        </div>
      ) : null}

      <p id={selectionStatusId} className="text-xs text-content-muted">
        {selectedId ? '1 unidad seleccionada.' : 'Sin unidad seleccionada.'}
      </p>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDetected={applyScannedCode}
      />
    </div>
  );
};

export default ReturnAssetSelector;
