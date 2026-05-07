import React, { useEffect, useMemo, useState } from 'react';
import {
  getInventoryAvailableAssets,
  type InventoryAvailableAssetRow,
} from '../../services/apiService';

interface AssetUnitSelectorProps {
  value: string[];
  onChange: (next: string[]) => void;
  articuloId?: string;
  ubicacionId?: string;
  excludedIds?: string[];
  label?: string;
  required?: boolean;
  disabled?: boolean;
  limit?: number;
}

const AssetUnitSelector: React.FC<AssetUnitSelectorProps> = ({
  value,
  onChange,
  articuloId,
  ubicacionId,
  excludedIds = [],
  label = 'Seleccionar activo',
  required = false,
  disabled = false,
  limit = 25,
}) => {
  const [search, setSearch] = useState('');
  const [assets, setAssets] = useState<InventoryAvailableAssetRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedId = useMemo(() => (Array.isArray(value) ? value.find(Boolean) ?? null : null), [value]);
  const excludedIdsSet = useMemo(() => new Set((excludedIds || []).filter(Boolean)), [excludedIds]);
  const visibleAssets = useMemo(
    () => assets.filter((item) => item.id === selectedId || !excludedIdsSet.has(item.id)),
    [assets, excludedIdsSet, selectedId]
  );

  useEffect(() => {
    if (disabled) {
      setAssets([]);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    if (!articuloId || !ubicacionId) {
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
        const nextAssets = await getInventoryAvailableAssets({
          articulo_id: articuloId,
          ubicacion_id: ubicacionId,
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
          'No se pudo cargar activos disponibles.';
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
  }, [articuloId, ubicacionId, search, disabled, limit]);

  useEffect(() => {
    if (!selectedId) return;
    if (visibleAssets.length === 0) return;

    const stillAvailable = visibleAssets.some((item) => item.id === selectedId);
    if (!stillAvailable) {
      onChange([]);
    }
  }, [visibleAssets, selectedId, onChange]);

  useEffect(() => {
    if (!selectedId) return;
    if (!excludedIdsSet.has(selectedId)) return;
    onChange([]);
  }, [excludedIdsSet, onChange, selectedId]);

  const canSelect = !disabled && Boolean(articuloId && ubicacionId) && !isLoading && !loadError;

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-content-secondary mb-1">
        {label} {required ? <span className="text-danger">*</span> : null}
      </label>

      <input
        type="text"
        value={search}
        disabled={!articuloId || !ubicacionId || disabled}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por codigo interno"
        className="w-full border border-edge-strong rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none disabled:bg-surface-overlay disabled:text-content-disabled"
      />

      {!articuloId || !ubicacionId ? (
        <p className="text-xs text-content-muted">Selecciona articulo y ubicacion origen para cargar activos.</p>
      ) : null}

      {isLoading ? <p className="text-xs text-content-muted">Cargando activos disponibles...</p> : null}

      {loadError ? (
        <p className="text-xs text-danger-text">
          {loadError} Esta operacion requiere selector visual de activos.
        </p>
      ) : null}

      {canSelect && visibleAssets.length === 0 ? (
        <p className="text-xs text-content-muted">No hay activos disponibles para esta combinacion.</p>
      ) : null}

      {canSelect && visibleAssets.length > 0 ? (
        <div className="max-h-44 overflow-y-auto border border-edge rounded-md divide-y divide-edge bg-surface">
          {visibleAssets.map((item) => {
            const isSelected = item.id === selectedId;

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onChange(isSelected ? [] : [item.id])}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  isSelected ? 'bg-blue-50 text-primary' : 'hover:bg-surface-muted text-content-secondary'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{item.codigo}</span>
                  {isSelected ? <span className="text-xs font-semibold">Seleccionado</span> : null}
                </div>
                {item.nro_serie ? <p className="text-xs text-content-muted">Serie: {item.nro_serie}</p> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <p className="text-xs text-content-muted">
        {selectedId ? '1 unidad seleccionada.' : 'Sin unidad seleccionada.'}
      </p>
    </div>
  );
};

export default AssetUnitSelector;
