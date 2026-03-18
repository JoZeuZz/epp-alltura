import React, { useEffect, useMemo, useState } from 'react';
import {
  getReturnEligibleAssets,
  type ReturnEligibleAssetRow,
} from '../../services/apiService';

interface ReturnAssetSelectorProps {
  value: string[];
  onChange: (next: string[]) => void;
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
  trabajadorId,
  articuloId,
  excludedIds = [],
  label = 'Seleccionar activo',
  required = false,
  disabled = false,
  limit = 25,
}) => {
  const [search, setSearch] = useState('');
  const [assets, setAssets] = useState<ReturnEligibleAssetRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedId = useMemo(() => (Array.isArray(value) ? value.find(Boolean) ?? null : null), [value]);
  const excludedIdsSet = useMemo(() => new Set((excludedIds || []).filter(Boolean)), [excludedIds]);
  const visibleAssets = useMemo(
    () => assets.filter((item) => item.activo_id === selectedId || !excludedIdsSet.has(item.activo_id)),
    [assets, excludedIdsSet, selectedId]
  );

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
          'No se pudo cargar activos elegibles para devolución.';

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
    if (!selectedId) return;
    if (visibleAssets.length === 0) return;

    const stillAvailable = visibleAssets.some((item) => item.activo_id === selectedId);
    if (!stillAvailable) {
      onChange([]);
    }
  }, [visibleAssets, selectedId, onChange]);

  useEffect(() => {
    if (!selectedId) return;
    if (!excludedIdsSet.has(selectedId)) return;
    onChange([]);
  }, [excludedIdsSet, onChange, selectedId]);

  const canSelect = !disabled && Boolean(trabajadorId) && !isLoading && !loadError;

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>

      <input
        type="text"
        value={search}
        disabled={!trabajadorId || disabled}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por codigo interno"
        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
      />

      {!trabajadorId ? (
        <p className="text-xs text-gray-500">Selecciona trabajador para cargar activos elegibles.</p>
      ) : null}

      {isLoading ? <p className="text-xs text-gray-500">Cargando activos elegibles...</p> : null}

      {loadError ? (
        <p className="text-xs text-red-600">
          {loadError} Esta operacion requiere selector visual de activos.
        </p>
      ) : null}

      {canSelect && visibleAssets.length === 0 ? (
        <p className="text-xs text-gray-500">No hay activos elegibles para devolución.</p>
      ) : null}

      {canSelect && visibleAssets.length > 0 ? (
        <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100 bg-white">
          {visibleAssets.map((item) => {
            const isSelected = item.activo_id === selectedId;

            return (
              <button
                type="button"
                key={item.activo_id}
                onClick={() => onChange(isSelected ? [] : [item.activo_id])}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  isSelected ? 'bg-blue-50 text-primary-blue' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{item.codigo}</span>
                  {isSelected ? <span className="text-xs font-semibold">Seleccionado</span> : null}
                </div>
                <p className="text-xs text-gray-500">
                  {item.articulo_nombre || 'Sin articulo'}
                  {item.nro_serie ? ` · Serie: ${item.nro_serie}` : ''}
                </p>
              </button>
            );
          })}
        </div>
      ) : null}

      <p className="text-xs text-gray-500">{selectedId ? '1 unidad seleccionada.' : 'Sin unidad seleccionada.'}</p>
    </div>
  );
};

export default ReturnAssetSelector;
