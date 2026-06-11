import React, { useState, useMemo } from 'react';
import { buildImageUrl } from '../../utils/image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMisAsignacionesUsuario,
  returnAssignedArticulosToBodega,
  type ArticuloAsignado,
  type ArticuloTipo,
} from '../../services/apiService';
import { useMultiSelect, useGet } from '../../hooks';
import BulkSelectionToolbar from '../BulkSelectionToolbar';
import toast from 'react-hot-toast';

interface BodegaOption { id: string; nombre: string; }

interface Props {
  onDeliverSelected: (ids: string[]) => void;
}

const TIPO_LABEL: Record<ArticuloTipo, string> = {
  epp: 'EPP',
  herramienta: 'Herramienta',
  equipo: 'Equipo',
};

const MisArticulosAsignadosPanel: React.FC<Props> = ({ onDeliverSelected }) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<ArticuloTipo | ''>('');
  const [showDevolucion, setShowDevolucion] = useState(false);
  const [bodegaDestino, setBodegaDestino] = useState('');
  const [isReturning, setIsReturning] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['mis-asignaciones', tipoFilter, search],
    queryFn: () => getMisAsignacionesUsuario({
      tipo: tipoFilter || undefined,
      search: search || undefined,
    }),
  });

  const { data: bodegas = [] } = useGet<BodegaOption[]>(['bodegas'], '/bodegas');

  const items: ArticuloAsignado[] = data?.items ?? [];
  const multiSelect = useMultiSelect<ArticuloAsignado>((a) => a.id);

  const filtered = useMemo(() => {
    if (!search && !tipoFilter) return items;
    return items.filter((a) => {
      const matchTipo = tipoFilter ? a.tipo === tipoFilter : true;
      const q = search.toLowerCase();
      const matchSearch = !search ||
        a.nombre.toLowerCase().includes(q) ||
        (a.codigo?.toLowerCase() ?? '').includes(q) ||
        (a.nro_serie?.toLowerCase() ?? '').includes(q);
      return matchTipo && matchSearch;
    });
  }, [items, search, tipoFilter]);

  const handleReturnToBodega = async () => {
    if (!bodegaDestino) { toast.error('Selecciona una bodega de destino'); return; }
    const ids = [...multiSelect.selectedIds];
    setIsReturning(true);
    try {
      await returnAssignedArticulosToBodega({
        articulo_ids: ids,
        bodega_destino_id: bodegaDestino,
      });
      toast.success(`${ids.length} artículo${ids.length !== 1 ? 's' : ''} devuelto${ids.length !== 1 ? 's' : ''} a bodega`);
      multiSelect.clearAll();
      void queryClient.invalidateQueries({ queryKey: ['mis-asignaciones'] });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Error al devolver');
    } finally {
      setIsReturning(false);
      setShowDevolucion(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-content-muted">
        Cargando artículos asignados…
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="py-8 text-center text-sm text-content-muted">
        No tienes artículos asignados actualmente.
      </div>
    );
  }

  const selectedList = filtered.filter((a) => multiSelect.isSelected(a.id));

  return (
    <div className="space-y-4 pb-20">
      {/* Toolbar filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="search"
          placeholder="Buscar por nombre, código…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[160px] px-3 py-2 text-sm rounded-md border border-edge bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Buscar artículos asignados"
        />
        <select
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value as ArticuloTipo | '')}
          className="px-3 py-2 text-sm rounded-md border border-edge bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Filtrar por tipo"
        >
          <option value="">Todos los tipos</option>
          <option value="epp">EPP</option>
          <option value="herramienta">Herramienta</option>
          <option value="equipo">Equipo</option>
        </select>
        <button
          type="button"
          onClick={multiSelect.toggleSelectMode}
          aria-pressed={multiSelect.isSelectMode}
          className={`px-3 py-2 text-sm rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            multiSelect.isSelectMode
              ? 'bg-primary text-white border-primary'
              : 'bg-surface text-content-secondary border-edge hover:bg-surface-overlay'
          }`}
        >
          {multiSelect.isSelectMode ? '✓ Seleccionando' : 'Seleccionar'}
        </button>
      </div>

      {/* Card grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${multiSelect.isSelectMode ? 'pb-20' : ''}`}>
        {filtered.map((art) => {
          const selected = multiSelect.isSelected(art.id);
          return (
            <article
              key={art.id}
              onClick={() => { if (multiSelect.isSelectMode) multiSelect.toggle(art.id); }}
              onKeyDown={(e) => {
                if (multiSelect.isSelectMode && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  multiSelect.toggle(art.id);
                }
              }}
              tabIndex={multiSelect.isSelectMode ? 0 : undefined}
              role={multiSelect.isSelectMode ? 'checkbox' : undefined}
              aria-checked={multiSelect.isSelectMode ? selected : undefined}
              aria-label={multiSelect.isSelectMode ? art.nombre : undefined}
              className={`relative bg-surface rounded-lg border p-4 flex flex-col gap-2 transition-all ${
                multiSelect.isSelectMode
                  ? `cursor-pointer ${selected ? 'border-primary ring-2 ring-primary/40 bg-primary/5' : 'border-edge hover:border-primary/50'}`
                  : 'border-edge'
              }`}
            >
              {multiSelect.isSelectMode && (
                <div
                  className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    selected ? 'bg-primary border-primary text-white' : 'border-edge bg-surface'
                  }`}
                  aria-hidden="true"
                >
                  {selected && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              )}

              <div className={`flex items-start gap-3 ${multiSelect.isSelectMode ? 'pl-6' : ''}`}>
                {art.foto_url ? (
                  <img
                    src={buildImageUrl(art.foto_url, 'thumb')}
                    alt={art.nombre}
                    width={40}
                    height={40}
                    loading="lazy"
                    decoding="async"
                    className="h-10 w-10 rounded object-cover flex-shrink-0 border border-edge"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-surface-overlay flex items-center justify-center flex-shrink-0 text-content-muted" aria-hidden="true">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-content-primary truncate text-sm">{art.nombre}</p>
                  <p className="text-xs text-content-muted font-mono">{art.codigo}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex-shrink-0">
                  {TIPO_LABEL[art.tipo]}
                </span>
              </div>

              <div className="text-xs text-content-muted">
                Asignado {new Date(art.asignado_en).toLocaleDateString('es-CL')}
                {art.asignado_por_nombre ? ` por ${art.asignado_por_nombre}` : ''}
              </div>
            </article>
          );
        })}
      </div>

      {/* Bulk toolbar */}
      <BulkSelectionToolbar
        isSelectMode={multiSelect.isSelectMode}
        count={multiSelect.count}
        totalVisible={filtered.length}
        onClear={multiSelect.clearAll}
        onSelectAll={() => multiSelect.selectAll(filtered)}
        onDeliver={() => onDeliverSelected([...multiSelect.selectedIds])}
        onReturnToBodega={() => setShowDevolucion(true)}
        isSubmitting={isReturning}
      />

      {/* Devolver a bodega modal */}
      {showDevolucion && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-surface rounded-lg border border-edge p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="heading-4 text-content-primary">Devolver a bodega</h3>
            <p className="text-sm text-content-muted">
              {selectedList.length} artículo{selectedList.length !== 1 ? 's' : ''} seleccionado{selectedList.length !== 1 ? 's' : ''}
            </p>
            <div>
              <label htmlFor="bodega-devolucion" className="label-sm text-content-secondary block mb-1">
                Bodega de destino
              </label>
              <select
                id="bodega-devolucion"
                value={bodegaDestino}
                onChange={(e) => setBodegaDestino(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-edge bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="">Seleccionar bodega…</option>
                {bodegas.map((b) => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowDevolucion(false)}
                className="px-4 py-2 text-sm rounded-md border border-edge hover:bg-surface-overlay">
                Cancelar
              </button>
              <button type="button" onClick={() => { void handleReturnToBodega(); }}
                disabled={isReturning || !bodegaDestino}
                className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50">
                {isReturning ? 'Devolviendo…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MisArticulosAsignadosPanel;
