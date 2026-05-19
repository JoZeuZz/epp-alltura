import React, { useMemo, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import ActivoProfileModal from '../../../components/forms/ActivoProfileModal';
import { useTour } from '../../../hooks';
import TourDemoActivoModal from '../../../components/forms/TourDemoActivoModal';
import type { Articulo, ArticuloEstado } from '../../../services/apiService';
import type { AssetScopeKey, InventoryAssetScopeCopy } from './inventoryAssetScope.constants';
import { formatCLP } from '../../../utils/currency';
import AdminInventoryScopedAssetListView from './AdminInventoryScopedAssetListView';

// ── Helpers ────────────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<ArticuloEstado, { label: string; classes: string }> = {
  en_stock: { label: 'En stock', classes: 'bg-green-100 text-green-800' },
  asignado: { label: 'Asignado', classes: 'bg-blue-100 text-blue-800' },
  mantencion: { label: 'Mantención', classes: 'bg-yellow-100 text-yellow-800' },
  dado_de_baja: { label: 'Dado de baja', classes: 'bg-gray-100 text-gray-600' },
  perdido: { label: 'Perdido', classes: 'bg-red-100 text-red-800' },
};

const ESTADO_FILTERS = [
  { label: 'Todos', value: 'all' },
  { label: 'En stock', value: 'en_stock' },
  { label: 'Asignado', value: 'asignado' },
  { label: 'Mantención', value: 'mantencion' },
  { label: 'Dado de baja', value: 'dado_de_baja' },
  { label: 'Perdido', value: 'perdido' },
] as const;

const ESP_LABELS: Record<string, string> = {
  oocc: 'OOCC',
  ooee: 'OOEE',
  equipos: 'Equipos',
  trabajos_verticales_lineas_de_vida: 'Verticales',
};

// ── Article card ───────────────────────────────────────────────────────────────

const ArticuloCard: React.FC<{ articulo: Articulo; onClick: () => void }> = ({
  articulo,
  onClick,
}) => {
  const badge = ESTADO_BADGE[articulo.estado] ?? { label: articulo.estado, classes: 'bg-gray-100 text-gray-600' };
  const ubicacion = articulo.bodega_nombre ?? articulo.proyecto_nombre ?? null;

  return (
    <article
      className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col gap-3 cursor-pointer hover:border-primary-blue hover:shadow-md transition-all"
      onClick={onClick}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      aria-label={`Ver perfil de ${articulo.nombre}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {articulo.foto_url ? (
          <img
            src={articulo.foto_url}
            alt={articulo.nombre}
            className="h-12 w-12 rounded object-cover flex-shrink-0 border border-gray-200"
          />
        ) : (
          <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400 select-none">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-dark-blue truncate">{articulo.nombre}</p>
          {(articulo.marca || articulo.modelo) && (
            <p className="text-xs text-gray-500 truncate">
              {[articulo.marca, articulo.modelo].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${badge.classes}`}>
          {badge.label}
        </span>
      </div>

      {/* Details */}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <div>
          <dt className="text-gray-400 uppercase tracking-wide">Código</dt>
          <dd className="font-mono font-medium text-gray-700">{articulo.codigo}</dd>
        </div>
        <div>
          <dt className="text-gray-400 uppercase tracking-wide">N° Serie</dt>
          <dd className="font-mono font-medium text-gray-700 truncate">{articulo.nro_serie}</dd>
        </div>
        <div>
          <dt className="text-gray-400 uppercase tracking-wide">Valor</dt>
          <dd className="font-medium text-gray-700">{articulo.valor > 0 ? formatCLP(articulo.valor) : '—'}</dd>
        </div>
        {ubicacion && (
          <div>
            <dt className="text-gray-400 uppercase tracking-wide">Ubicación</dt>
            <dd className="font-medium text-gray-700 truncate">{ubicacion}</dd>
          </div>
        )}
      </dl>

      {/* Especialidades */}
      {articulo.especialidades.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {articulo.especialidades.map((esp) => (
            <span
              key={esp}
              className="text-xs px-2 py-0.5 rounded-full bg-primary-blue/10 text-primary-blue"
            >
              {ESP_LABELS[esp] ?? esp}
            </span>
          ))}
        </div>
      )}
    </article>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

interface AdminInventoryScopedAssetCardsProps {
  scope: AssetScopeKey;
  items: Articulo[];
  isLoading: boolean;
  isError: boolean;
  onRefetch: () => void;
  copy: InventoryAssetScopeCopy;
  ciudadFilter?: string | null;   // undefined = sin filtro, null = sin ubicación
  onClearCiudad?: () => void;
}

const AdminInventoryScopedAssetCards: React.FC<AdminInventoryScopedAssetCardsProps> = ({
  scope,
  items,
  isLoading,
  isError,
  onRefetch,
  copy,
  ciudadFilter,
  onClearCiudad,
}) => {
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  const { isActive, currentDemoAction } = useTour();
  const isDemoStep = isActive && currentDemoAction === 'open-activo-demo' && scope === 'epp';

  React.useEffect(() => {
    if (isDemoStep) {
      if (items.length > 0) {
        setSelectedId(items[0].id);
      } else {
        setShowDemoModal(true);
      }
    } else {
      setShowDemoModal(false);
    }
  }, [isDemoStep, items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((a) => {
      const matchesSearch =
        !term ||
        a.nombre.toLowerCase().includes(term) ||
        a.codigo.toLowerCase().includes(term) ||
        a.nro_serie.toLowerCase().includes(term);
      const matchesEstado = estadoFilter === 'all' || a.estado === estadoFilter;
      const matchesCiudad =
        ciudadFilter === undefined ||
        (ciudadFilter === null
          ? a.bodega_ciudad == null && a.proyecto_ciudad == null
          : a.bodega_ciudad === ciudadFilter || a.proyecto_ciudad === ciudadFilter);
      return matchesSearch && matchesEstado && matchesCiudad;
    });
  }, [items, search, estadoFilter, ciudadFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <section
        className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-3"
        aria-label={`Filtros de ${scope}`}
        data-tour="admin-inventory-filters"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Filtros</span>
          <div className="flex items-center gap-2">
            {ciudadFilter !== undefined && (
              <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-100 rounded-md px-3 py-1.5">
                <span className="text-blue-700 font-medium">
                  Ciudad: {ciudadFilter ?? 'Sin ubicación'}
                </span>
                <button
                  type="button"
                  onClick={onClearCiudad}
                  className="text-blue-400 hover:text-blue-600 font-bold leading-none"
                  aria-label="Quitar filtro de ciudad"
                >
                  ×
                </button>
              </div>
            )}
            <div className="flex rounded-md border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 transition-colors ${viewMode === 'cards' ? 'bg-primary-blue text-white' : 'bg-white text-gray-400 hover:text-gray-600'}`}
              aria-label="Vista cards"
              title="Vista cards"
              aria-pressed={viewMode === 'cards'}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary-blue text-white' : 'bg-white text-gray-400 hover:text-gray-600'}`}
              aria-label="Vista lista"
              title="Vista lista"
              aria-pressed={viewMode === 'list'}
            >
              <List size={15} />
            </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Buscar</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, código o serie"
              aria-label="Buscar por nombre, código o serie"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</span>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              aria-label="Filtrar por estado"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
            >
              {ESTADO_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Content */}
      {isError ? (
        <section
          className="bg-white rounded-lg shadow-sm border border-red-100 p-4 space-y-3"
          role="alert"
        >
          <p className="text-sm text-red-600">{copy.errorMessage}</p>
          <button
            type="button"
            onClick={onRefetch}
            className="inline-flex items-center px-3 py-2 text-sm rounded-md border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
          >
            Reintentar
          </button>
        </section>
      ) : viewMode === 'list' ? (
        <AdminInventoryScopedAssetListView
          items={filtered}
          onSelect={setSelectedId}
          isLoading={isLoading}
          emptyMessage={copy.emptyMessage}
        />
      ) : isLoading ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
          aria-live="polite"
          data-tour="admin-inventory-grid"
        >
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={`skeleton-${idx}`}
              className="bg-white rounded-lg border border-gray-100 p-4 animate-pulse space-y-3"
            >
              <div className="flex gap-3">
                <div className="h-12 w-12 rounded bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="bg-white rounded-lg border border-gray-100 p-8 text-center"
          aria-live="polite"
          data-tour="admin-inventory-grid"
        >
          <p className="text-sm text-gray-500">{copy.emptyMessage}</p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
          data-tour="admin-inventory-grid"
        >
          {filtered.map((articulo) => (
            <ArticuloCard
              key={articulo.id}
              articulo={articulo}
              onClick={() => setSelectedId(articulo.id)}
            />
          ))}
        </div>
      )}

      {/* Profile modal */}
      {selectedId && (
        <ActivoProfileModal
          activoId={selectedId}
          onClose={() => setSelectedId(null)}
          onRefresh={onRefetch}
        />
      )}

      {showDemoModal && (
        <TourDemoActivoModal onClose={() => setShowDemoModal(false)} />
      )}
    </div>
  );
};

export default AdminInventoryScopedAssetCards;
