import React, { useEffect, useState } from 'react';
import Modal from '../Modal';
import type {
  EntregaCreatePayload,
  EntregaDetallePayload,
  CondicionSalida,
} from '../../services/apiService';
import AssetUnitSelector from './AssetUnitSelector';
import { parseQuantityInteger } from '../../utils/quantity';
import { ALLOWED_IMAGE_ACCEPT, ALLOWED_IMAGE_TYPES, IMAGE_MAX_BYTES, IMAGE_MAX_LABEL } from '../../config/imageLimits';

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
  onSubmit: (payload: EntregaCreatePayload, foto?: File) => Promise<void>;
  isSubmitting: boolean;
  trabajadores: TrabajadorOption[];
  ubicaciones: UbicacionOption[];
  articulos: ArticuloOption[];
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

const buildEntregaPayload = (
  trabajadorId: string,
  ubicacionOrigenId: string,
  ubicacionDestinoId: string,
  notaDestino: string,
  detalles: EntregaDetallePayload[]
): EntregaCreatePayload => ({
  trabajador_id: trabajadorId,
  ubicacion_origen_id: ubicacionOrigenId,
  ubicacion_destino_id: ubicacionDestinoId,
  nota_destino: notaDestino || null,
  detalles: detalles
    .filter((d) => Boolean(d.articulo_id))
    .map((d) => ({
      articulo_id: d.articulo_id,
      activo_ids: d.activo_ids?.length ? d.activo_ids : undefined,
      cantidad: d.activo_ids?.length ? undefined : Number(d.cantidad),
      condicion_salida: d.condicion_salida || 'ok',
      notas: d.notas || null,
    })),
});

const EntregaCreateModal: React.FC<EntregaCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  trabajadores,
  ubicaciones,
  articulos,
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
  const [evidenciaFile, setEvidenciaFile] = useState<File | null>(null);
  const [evidenciaPreviewUrl, setEvidenciaPreviewUrl] = useState<string | null>(null);
  const [evidenciaFileError, setEvidenciaFileError] = useState<string | null>(null);

  // Filtro de búsqueda de trabajador
  const [trabajadorSearch, setTrabajadorSearch] = useState('');
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
      setEvidenciaFile(null);
      setEvidenciaFileError(null);
    }
  }, [isOpen, initialActivoId, initialArticuloId]);

  useEffect(() => {
    if (!evidenciaFile) {
      setEvidenciaPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(evidenciaFile);
    setEvidenciaPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [evidenciaFile]);

  const handleEvidenciaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setEvidenciaFile(null);
      setEvidenciaFileError(null);
      return;
    }
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setEvidenciaFileError('Solo se permiten imágenes JPG, PNG, WEBP o AVIF.');
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setEvidenciaFileError(`La imagen supera el tamaño máximo permitido (${IMAGE_MAX_LABEL}).`);
      return;
    }
    setEvidenciaFileError(null);
    setEvidenciaFile(file);
  };

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

  const isLockedPrefilledRow = (idx: number) =>
    lockActivoSelection && shouldPrefillSingleAsset && idx === 0;

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

    const payload = buildEntregaPayload(
      trabajadorId,
      ubicacionOrigenId,
      ubicacionDestinoId,
      notaDestino,
      detalles
    );

    try {
      await onSubmit(payload, evidenciaFile ?? undefined);
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
                  ? 'bg-primary text-white'
                  : step > s
                  ? 'bg-green-500 text-white'
                  : 'bg-edge text-content-muted'
              }`}
            >
              {step > s ? '✓' : s}
            </div>
            <span className={`ml-2 text-sm ${step === s ? 'text-content-primary font-medium' : 'text-content-disabled'}`}>
              {s === 1 ? 'Datos básicos' : 'Ítems'}
            </span>
            {s < 2 && <div className="flex-1 h-px bg-edge mx-4" />}
          </React.Fragment>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Trabajador */}
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">
              Trabajador <span className="text-danger">*</span>
            </label>
            <input
              id="entrega-trabajador-busqueda"
              type="text"
              placeholder="Buscar trabajador por nombre o RUT..."
              value={trabajadorSearch}
              onChange={(e) => setTrabajadorSearch(e.target.value)}
              className="w-full border border-edge-strong rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none mb-2"
              aria-label="Buscar trabajador por nombre o RUT"
            />
            <select
              id="entrega-trabajador-select"
              value={trabajadorId}
              onChange={(e) => setTrabajadorId(e.target.value)}
              className="w-full border border-edge-strong rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
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
              <p className="mt-1 text-xs text-success-text font-medium">
                ✓ {selectedTrabajador.nombres} {selectedTrabajador.apellidos}
              </p>
            )}
          </div>

          {/* Ubicación origen */}
          <div>
            <label htmlFor="entrega-ubicacion-origen" className="block text-sm font-medium text-content-secondary mb-1">
              Desde (bodega) <span className="text-danger">*</span>
            </label>
            <select
              id="entrega-ubicacion-origen"
              value={ubicacionOrigenId}
              onChange={(e) => setUbicacionOrigenId(e.target.value)}
              className="w-full border border-edge-strong rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
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
            <label htmlFor="entrega-ubicacion-destino" className="block text-sm font-medium text-content-secondary mb-1">
              Hacia (planta) <span className="text-danger">*</span>
            </label>
            <select
              id="entrega-ubicacion-destino"
              value={ubicacionDestinoId}
              onChange={(e) => setUbicacionDestinoId(e.target.value)}
              className="w-full border border-edge-strong rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
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
            <label htmlFor="entrega-nota-destino" className="block text-sm font-medium text-content-secondary mb-1">
              Observación (opcional)
            </label>
            <textarea
              id="entrega-nota-destino"
              rows={2}
              value={notaDestino}
              onChange={(e) => setNotaDestino(e.target.value)}
              placeholder="Ej: turno, encargado, contexto de entrega"
              className="w-full border border-edge-strong rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Evidencia fotográfica */}
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">
              Evidencia fotográfica <span className="text-xs font-normal text-content-muted">(opcional)</span>
            </label>
            {evidenciaPreviewUrl ? (
              <div className="flex items-start gap-3">
                <div className="relative inline-block">
                  <img
                    src={evidenciaPreviewUrl}
                    alt="Vista previa de evidencia"
                    className="w-28 h-28 object-cover rounded-lg border border-edge"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setEvidenciaFile(null);
                      setEvidenciaFileError(null);
                    }}
                    className="absolute -top-2 -right-2 bg-white border border-edge-strong rounded-full w-5 h-5 flex items-center justify-center text-xs text-danger hover:bg-danger-subtle leading-none"
                    aria-label="Eliminar imagen seleccionada"
                  >
                    ×
                  </button>
                </div>
                <p className="text-xs text-content-muted mt-1">{evidenciaFile?.name}</p>
              </div>
            ) : (
              <input
                type="file"
                accept={ALLOWED_IMAGE_ACCEPT}
                onChange={handleEvidenciaChange}
                className="block text-sm text-content-secondary file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-surface-muted file:text-content-secondary hover:file:bg-edge cursor-pointer"
              />
            )}
            {evidenciaFileError && <p className="text-xs text-danger-text mt-1" role="alert">{evidenciaFileError}</p>}
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
              <div key={idx} className="border border-edge rounded-lg p-4 space-y-3 bg-surface-muted">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-content-secondary">Ítem {idx + 1}</span>
                  {detalles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDetalle(idx)}
                      className="text-danger hover:text-danger-text text-sm"
                      aria-label={`Eliminar ítem ${idx + 1}`}
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                {/* Artículo */}
                <div>
                  <label htmlFor={`entrega-detalle-articulo-${idx}`} className="block text-xs font-medium text-content-secondary mb-1">
                    Artículo <span className="text-danger">*</span>
                  </label>
                  <select
                    id={`entrega-detalle-articulo-${idx}`}
                    value={detalle.articulo_id}
                    onChange={(e) =>
                      updateArticuloDetalle(idx, e.target.value)
                    }
                    disabled={isLockedPrefilledRow(idx)}
                    className="w-full border border-edge-strong rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
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
                    <label htmlFor={`entrega-detalle-cantidad-${idx}`} className="block text-xs font-medium text-content-secondary mb-1">
                      Cantidad <span className="text-danger">*</span>
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
                      className="w-full border border-edge-strong rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  {/* Condición */}
                  <div>
                    <label htmlFor={`entrega-detalle-condicion-${idx}`} className="block text-xs font-medium text-content-secondary mb-1">
                      Condición inicial
                    </label>
                    <select
                      id={`entrega-detalle-condicion-${idx}`}
                      value={detalle.condicion_salida ?? 'ok'}
                      onChange={(e) =>
                        updateDetalle(idx, 'condicion_salida', e.target.value as CondicionSalida)
                      }
                      className="w-full border border-edge-strong rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
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
                      disabled={isLockedPrefilledRow(idx)}
                    />
                    <p className="text-xs text-content-muted">Selecciona al menos un activo para este ítem.</p>
                  </>
                )}

                {/* Notas */}
                <div>
                  <label htmlFor={`entrega-detalle-notas-${idx}`} className="block text-xs font-medium text-content-secondary mb-1">
                    Notas del ítem
                  </label>
                  <input
                    id={`entrega-detalle-notas-${idx}`}
                    type="text"
                    value={detalle.notas ?? ''}
                    onChange={(e) => updateDetalle(idx, 'notas', e.target.value || null)}
                    placeholder="Observaciones opcionales..."
                    className="w-full border border-edge-strong rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addDetalle}
            className="w-full py-2 border-2 border-dashed border-edge-strong rounded-lg text-sm text-content-muted hover:border-primary hover:text-primary transition-colors"
            aria-label="Agregar un nuevo ítem de artículo"
          >
            + Agregar artículo
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-danger-subtle border border-danger-border rounded-lg text-sm text-danger-text">
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
              className="flex-1 py-2 px-4 border border-edge-strong rounded-lg text-sm text-content-secondary hover:bg-surface-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!canGoToStep2}
              onClick={() => setStep(2)}
              className="flex-1 py-2 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente →
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="py-2 px-4 border border-edge-strong rounded-lg text-sm text-content-secondary hover:bg-surface-muted transition-colors"
            >
              ← Volver
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-edge-strong rounded-lg text-sm text-content-secondary hover:bg-surface-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="flex-1 py-2 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Creando...' : 'Continuar a firma'}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};

export default EntregaCreateModal;
