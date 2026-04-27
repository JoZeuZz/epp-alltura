import React, { useEffect, useState } from 'react';
import Modal from '../Modal';
import type {
  EntregaCreatePayload,
  EntregaDetallePayload,
  EntregaTemplate,
  CondicionSalida,
  EntregaTemplateDetailOverridePayload,
} from '../../services/apiService';
import { previewEntregaTemplate } from '../../services/apiService';
import AssetUnitSelector from './AssetUnitSelector';
import { parseQuantityInteger } from '../../utils/quantity';
import {
  buildDraftDetailsFromTemplateItems,
  buildTemplateDetailOverrides,
} from './entregaTemplate.utils';

interface TrabajadorOption {
  id: string;
  persona_id: string;
  nombres: string;
  apellidos: string;
  rut: string;
  cargo?: string | null;
}

interface UbicacionOption {
  id: string;
  nombre: string;
  tipo?: 'bodega' | 'planta' | 'proyecto' | 'taller_mantencion';
}

interface ArticuloOption {
  id: string;
  nombre: string;
  tracking_mode: 'serial' | 'lote';
}

interface EntregaCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: EntregaCreatePayload) => Promise<void>;
  isSubmitting: boolean;
  trabajadores: TrabajadorOption[];
  ubicaciones: UbicacionOption[];
  articulos: ArticuloOption[];
  templates?: EntregaTemplate[];
  initialActivoId?: string | number;
  initialArticuloId?: string | number;
  lockActivoSelection?: boolean;
  initialActivoCode?: string;
  initialActivoName?: string;
  initialActivoValue?: string;
  onSuccess?: () => void;
}

const CONDICION_LABELS: Record<CondicionSalida, string> = {
  ok: 'Bueno',
  usado: 'Usado',
  danado: 'Dañado',
};

const EMPTY_DETALLE: EntregaDetallePayload = {
  articulo_id: '',
  cantidad: 1,
  condicion_salida: 'ok',
  activo_ids: [],
  notas: null,
};

const EntregaCreateModal: React.FC<EntregaCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  trabajadores,
  ubicaciones,
  articulos,
  templates = [],
  initialActivoId,
  initialArticuloId,
  lockActivoSelection = false,
  initialActivoCode,
  initialActivoName,
  initialActivoValue,
  onSuccess,
}) => {
  const normalizedInitialActivoId =
    initialActivoId != null && initialActivoId !== '' ? String(initialActivoId) : '';
  const normalizedInitialArticuloId =
    initialArticuloId != null && initialArticuloId !== '' ? String(initialArticuloId) : '';
  const shouldPrefillSingleAsset = Boolean(normalizedInitialActivoId && normalizedInitialArticuloId);

  const buildInitialDetalles = (): EntregaDetallePayload[] => {
    if (!shouldPrefillSingleAsset) {
      return [{ ...EMPTY_DETALLE }];
    }

    return [{
      ...EMPTY_DETALLE,
      articulo_id: normalizedInitialArticuloId,
      activo_ids: [normalizedInitialActivoId],
      cantidad: 1,
    }];
  };

  const [step, setStep] = useState<1 | 2>(1);
  const [trabajadorId, setTrabajadorId] = useState('');
  const [ubicacionOrigenId, setUbicacionOrigenId] = useState('');
  const [ubicacionDestinoId, setUbicacionDestinoId] = useState('');
  const [notaDestino, setNotaDestino] = useState('');
  const [detalles, setDetalles] = useState<EntregaDetallePayload[]>(buildInitialDetalles);
  const [error, setError] = useState<string | null>(null);

  // Filtro de búsqueda de trabajador
  const [trabajadorSearch, setTrabajadorSearch] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isLoadingTemplatePreview, setIsLoadingTemplatePreview] = useState(false);
  const [templatePreviewError, setTemplatePreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setTrabajadorId('');
      setUbicacionOrigenId('');
      setUbicacionDestinoId('');
      setNotaDestino('');
      setDetalles(buildInitialDetalles());
      setError(null);
      setTrabajadorSearch('');
      setSelectedTemplateId('');
      setIsLoadingTemplatePreview(false);
      setTemplatePreviewError(null);
    }
  }, [isOpen, initialActivoId, initialArticuloId]);

  useEffect(() => {
    if (!selectedTemplateId) {
      setTemplatePreviewError(null);
      return;
    }

    let cancelled = false;
    const loadTemplatePreview = async () => {
      setIsLoadingTemplatePreview(true);
      setTemplatePreviewError(null);
      try {
        const preview = await previewEntregaTemplate(selectedTemplateId, {
          ubicacion_origen_id: ubicacionOrigenId || undefined,
        });

        if (cancelled) return;

        const nextDetalles = buildDraftDetailsFromTemplateItems(preview.items || []);
        setDetalles(nextDetalles.length > 0 ? nextDetalles : [{ ...EMPTY_DETALLE }]);
      } catch (templateError: unknown) {
        if (cancelled) return;

        const e = templateError as { response?: { data?: { message?: string } }; message?: string };
        setTemplatePreviewError(
          e?.response?.data?.message ??
            e?.message ??
            'No se pudo previsualizar la plantilla seleccionada.'
        );
      } finally {
        if (!cancelled) {
          setIsLoadingTemplatePreview(false);
        }
      }
    };

    void loadTemplatePreview();

    return () => {
      cancelled = true;
    };
  }, [selectedTemplateId, ubicacionOrigenId]);

  useEffect(() => {
    setDetalles((prev) =>
      prev.map((detalle) => {
        const art = articuloOf(detalle.articulo_id);
        if (art?.tracking_mode !== 'serial') {
          return detalle;
        }

        return {
          ...detalle,
          activo_ids: [],
        };
      })
    );
  }, [ubicacionOrigenId]);

  const filteredTrabajadores = trabajadores.filter((t) => {
    const q = trabajadorSearch.toLowerCase();
    return (
      t.nombres.toLowerCase().includes(q) ||
      t.apellidos.toLowerCase().includes(q) ||
      t.rut.toLowerCase().includes(q)
    );
  });

  const ubicacionesOrigen = ubicaciones.filter((u) => {
    if (!u.tipo) return true;
    return u.tipo === 'bodega';
  });

  const ubicacionesDestino = ubicaciones.filter((u) => {
    if (!u.tipo) return true;
    return u.tipo === 'planta';
  });

  // Step 1 validation
  const hasWorkerSelection = trabajadorId !== '';

  const canGoToStep2 =
    hasWorkerSelection &&
    ubicacionOrigenId !== '' &&
    ubicacionDestinoId !== '' &&
    ubicacionOrigenId !== ubicacionDestinoId;

  // Step 2 helpers
  const addDetalle = () =>
    setDetalles((prev) => [...prev, { ...EMPTY_DETALLE }]);

  const removeDetalle = (idx: number) =>
    setDetalles((prev) => prev.filter((_, i) => i !== idx));

  const updateDetalle = (idx: number, field: keyof EntregaDetallePayload, value: unknown) =>
    setDetalles((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d))
    );

  const articuloOf = (id: string) => articulos.find((a) => a.id === id);

  const updateArticuloDetalle = (idx: number, articuloId: string) => {
    const art = articuloOf(articuloId);
    setDetalles((prev) =>
      prev.map((d, i) => {
        if (i !== idx) return d;

        return {
          ...d,
          articulo_id: articuloId,
          activo_ids: art?.tracking_mode === 'serial' ? [] : [],
          cantidad: art?.tracking_mode === 'serial' ? 1 : d.cantidad,
        };
      })
    );
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    setError(null);
    // Validate detalles
    if (ubicacionOrigenId === ubicacionDestinoId) {
      setError('La ubicación de origen y destino no puede ser la misma.');
      return;
    }

    const selectedAssetIds = new Set<string>();

    for (const d of detalles) {
      if (!d.articulo_id) {
        setError('Todos los ítems deben tener un artículo seleccionado.');
        return;
      }

      const art = articuloOf(d.articulo_id);
      if (!art) {
        setError('Hay artículos inválidos en los ítems.');
        return;
      }

      if (art.tracking_mode !== 'serial' && (!d.cantidad || Number(d.cantidad) <= 0)) {
        setError('La cantidad de cada ítem debe ser mayor a 0.');
        return;
      }

      if (art.tracking_mode === 'serial') {
        const serialIds = Array.isArray(d.activo_ids) ? d.activo_ids.filter(Boolean) : [];
        if (serialIds.length === 0) {
          setError(`El artículo "${art.nombre}" requiere al menos un activo por ser serial.`);
          return;
        }

        if (new Set(serialIds).size !== serialIds.length) {
          setError(`El artículo "${art.nombre}" tiene activos duplicados.`);
          return;
        }

        for (const serialId of serialIds) {
          if (selectedAssetIds.has(serialId)) {
            setError(`No puedes repetir el mismo activo (${serialId}) en más de un ítem.`);
            return;
          }
          selectedAssetIds.add(serialId);
        }
      }

    }

    const templateOverrides: EntregaTemplateDetailOverridePayload[] = buildTemplateDetailOverrides(
      detalles.map((d) => ({
        articulo_id: d.articulo_id,
        activo_ids: d.activo_ids?.length ? d.activo_ids : undefined,
        cantidad: d.activo_ids?.length ? undefined : Number(d.cantidad),
        condicion_salida: d.condicion_salida || 'ok',
        notas: d.notas || null,
      }))
    );

    const payload: EntregaCreatePayload = {
      trabajador_id: trabajadorId,
      ubicacion_origen_id: ubicacionOrigenId,
      ubicacion_destino_id: ubicacionDestinoId,
      tipo: 'entrega',
      nota_destino: notaDestino || null,
      detalles: templateOverrides.map((item) => ({
        articulo_id: item.articulo_id,
        activo_ids: item.activo_ids,
        cantidad: item.activo_ids?.length ? undefined : item.cantidad,
        condicion_salida: item.condicion_salida || 'ok',
        notas: item.notas || null,
      })),
    };

    try {
      await onSubmit(payload);
      onSuccess?.();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.message ?? 'No se pudo crear la entrega.');
    }
  };

  const selectedTrabajador = trabajadores.find((t) => t.id === trabajadorId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva entrega">
      {shouldPrefillSingleAsset && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Resumen de herramienta</p>
          <p className="text-sm text-blue-900">
            <span className="font-medium">Código:</span> {initialActivoCode || normalizedInitialActivoId}
          </p>
          {initialActivoName && (
            <p className="text-sm text-blue-900">
              <span className="font-medium">Herramienta:</span> {initialActivoName}
            </p>
          )}
          <p className="text-sm text-blue-900">
            <span className="font-medium">Valor bajo responsabilidad:</span> {initialActivoValue || 'Sin valor registrado'}
          </p>
          <p className="text-xs text-blue-800 mt-1">
            Al entregar esta herramienta, el trabajador queda asociado a su devolución.
          </p>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center mb-6">
        {[1, 2].map((s) => (
          <React.Fragment key={s}>
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                step === s
                  ? 'bg-primary-blue text-white'
                  : step > s
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step > s ? '✓' : s}
            </div>
            <span className={`ml-2 text-sm ${step === s ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
              {s === 1 ? 'Datos básicos' : 'Ítems'}
            </span>
            {s < 2 && <div className="flex-1 h-px bg-gray-200 mx-4" />}
          </React.Fragment>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Plantilla opcional */}
          <div>
            <label htmlFor="entrega-template-id" className="block text-sm font-medium text-gray-700 mb-1">
              Usar plantilla
            </label>
            <select
              id="entrega-template-id"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              disabled={lockActivoSelection && shouldPrefillSingleAsset}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
            >
              <option value="">— Sin plantilla —</option>
              {templates
                .filter((template) => template.estado === 'activo')
                .map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.nombre}
                  </option>
                ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Si seleccionas una plantilla, los ítems se prellenan automáticamente.
            </p>
            {isLoadingTemplatePreview && (
              <p className="mt-1 text-xs text-gray-500">Cargando plantilla seleccionada...</p>
            )}
            {templatePreviewError && (
              <p className="mt-1 text-xs text-red-600">{templatePreviewError}</p>
            )}
          </div>

          {/* Trabajador */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trabajador <span className="text-red-500">*</span>
            </label>
            <input
              id="entrega-trabajador-busqueda"
              type="text"
              placeholder="Buscar trabajador por nombre o RUT..."
              value={trabajadorSearch}
              onChange={(e) => setTrabajadorSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none mb-2"
              aria-label="Buscar trabajador por nombre o RUT"
            />
            <select
              id="entrega-trabajador-select"
              value={trabajadorId}
              onChange={(e) => setTrabajadorId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
              aria-label="Seleccionar trabajador"
            >
              <option value="">— Seleccionar trabajador —</option>
              {filteredTrabajadores.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombres} {t.apellidos} · {t.rut}
                  {t.cargo ? ` · ${t.cargo}` : ''}
                </option>
              ))}
            </select>
            {selectedTrabajador && (
              <p className="mt-1 text-xs text-green-600 font-medium">
                ✓ {selectedTrabajador.nombres} {selectedTrabajador.apellidos}
              </p>
            )}
          </div>

          {/* Ubicación origen */}
          <div>
            <label htmlFor="entrega-ubicacion-origen" className="block text-sm font-medium text-gray-700 mb-1">
              Desde (bodega) <span className="text-red-500">*</span>
            </label>
            <select
              id="entrega-ubicacion-origen"
              value={ubicacionOrigenId}
              onChange={(e) => setUbicacionOrigenId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
            >
              <option value="">— Seleccionar origen —</option>
              {ubicacionesOrigen.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Ubicación destino */}
          <div>
            <label htmlFor="entrega-ubicacion-destino" className="block text-sm font-medium text-gray-700 mb-1">
              Hacia (planta) <span className="text-red-500">*</span>
            </label>
            <select
              id="entrega-ubicacion-destino"
              value={ubicacionDestinoId}
              onChange={(e) => setUbicacionDestinoId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
            >
              <option value="">— Seleccionar destino —</option>
              {ubicacionesDestino.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Nota */}
          <div>
            <label htmlFor="entrega-nota-destino" className="block text-sm font-medium text-gray-700 mb-1">
              Observación (opcional)
            </label>
            <textarea
              id="entrega-nota-destino"
              rows={2}
              value={notaDestino}
              onChange={(e) => setNotaDestino(e.target.value)}
              placeholder="Ej: turno, encargado, contexto de entrega"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          {detalles.map((detalle, idx) => {
            const art = articuloOf(detalle.articulo_id);
            const needsSerial = art?.tracking_mode === 'serial';

            return (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Ítem {idx + 1}</span>
                  {detalles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDetalle(idx)}
                      className="text-red-500 hover:text-red-700 text-sm"
                      aria-label={`Eliminar ítem ${idx + 1}`}
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                {/* Artículo */}
                <div>
                  <label htmlFor={`entrega-detalle-articulo-${idx}`} className="block text-xs font-medium text-gray-600 mb-1">
                    Artículo <span className="text-red-500">*</span>
                  </label>
                  <select
                    id={`entrega-detalle-articulo-${idx}`}
                    value={detalle.articulo_id}
                    onChange={(e) =>
                      updateArticuloDetalle(idx, e.target.value)
                    }
                    disabled={lockActivoSelection && shouldPrefillSingleAsset}
                    className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
                  >
                    <option value="">— Seleccionar artículo —</option>
                    {articulos.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Cantidad */}
                  <div>
                    <label htmlFor={`entrega-detalle-cantidad-${idx}`} className="block text-xs font-medium text-gray-600 mb-1">
                      Cantidad <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={`entrega-detalle-cantidad-${idx}`}
                      type="number"
                      min={1}
                      step={1}
                      value={detalle.cantidad}
                      disabled={needsSerial}
                      onChange={(e) =>
                        updateDetalle(idx, 'cantidad', parseQuantityInteger(e.target.value, 1))
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
                    />
                  </div>

                  {/* Condición */}
                  <div>
                    <label htmlFor={`entrega-detalle-condicion-${idx}`} className="block text-xs font-medium text-gray-600 mb-1">
                      Condición inicial
                    </label>
                    <select
                      id={`entrega-detalle-condicion-${idx}`}
                      value={detalle.condicion_salida ?? 'ok'}
                      onChange={(e) =>
                        updateDetalle(idx, 'condicion_salida', e.target.value as CondicionSalida)
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
                    >
                      {(Object.keys(CONDICION_LABELS) as CondicionSalida[]).map((c) => (
                        <option key={c} value={c}>
                          {CONDICION_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {needsSerial && (
                  <>
                    <AssetUnitSelector
                      value={detalle.activo_ids ?? []}
                      onChange={(next) => updateDetalle(idx, 'activo_ids', next)}
                      articuloId={detalle.articulo_id || undefined}
                      ubicacionId={ubicacionOrigenId || undefined}
                      excludedIds={detalles.flatMap((row, rowIdx) =>
                        rowIdx === idx ? [] : (row.activo_ids ?? []).filter(Boolean)
                      )}
                      label="Seleccionar activo"
                      required
                      disabled={lockActivoSelection && shouldPrefillSingleAsset}
                    />
                    <p className="text-xs text-gray-500">Selecciona al menos un activo para este ítem.</p>
                  </>
                )}

                {/* Notas */}
                <div>
                  <label htmlFor={`entrega-detalle-notas-${idx}`} className="block text-xs font-medium text-gray-600 mb-1">
                    Notas del ítem
                  </label>
                  <input
                    id={`entrega-detalle-notas-${idx}`}
                    type="text"
                    value={detalle.notas ?? ''}
                    onChange={(e) => updateDetalle(idx, 'notas', e.target.value || null)}
                    placeholder="Observaciones opcionales..."
                    className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
                  />
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addDetalle}
            disabled={lockActivoSelection && shouldPrefillSingleAsset}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary-blue hover:text-primary-blue transition-colors"
            aria-label="Agregar un nuevo ítem de artículo"
          >
            + Agregar artículo
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between gap-3 mt-6">
        {step === 1 ? (
          <>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!canGoToStep2}
              onClick={() => setStep(2)}
              className="flex-1 py-2 px-4 bg-primary-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente →
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="py-2 px-4 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Volver
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="flex-1 py-2 px-4 bg-primary-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Creando...' : 'Crear borrador'}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};

export default EntregaCreateModal;
