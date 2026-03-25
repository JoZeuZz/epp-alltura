import React, { useEffect, useState } from 'react';
import Modal from '../Modal';
import type {
  EntregaCreatePayload,
  EntregaDetallePayload,
  CondicionSalida,
} from '../../services/apiService';
import AssetUnitSelector from './AssetUnitSelector';
import { parseQuantityInteger } from '../../utils/quantity';

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
  retorno_mode: 'retornable' | 'consumible';
}

interface LoteOption {
  id: string;
  articulo_id: string;
  codigo_lote?: string | null;
}

interface EntregaCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: EntregaCreatePayload) => Promise<void>;
  isSubmitting: boolean;
  trabajadores: TrabajadorOption[];
  ubicaciones: UbicacionOption[];
  articulos: ArticuloOption[];
  lotes?: LoteOption[];
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
  lote_id: null,
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
  lotes = [],
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [trabajadorId, setTrabajadorId] = useState('');
  const [transportistaTrabajadorId, setTransportistaTrabajadorId] = useState('');
  const [receptorTrabajadorId, setReceptorTrabajadorId] = useState('');
  const [esTraslado, setEsTraslado] = useState(false);
  const [ubicacionOrigenId, setUbicacionOrigenId] = useState('');
  const [ubicacionDestinoId, setUbicacionDestinoId] = useState('');
  const [notaDestino, setNotaDestino] = useState('');
  const [fechaDevolucion, setFechaDevolucion] = useState('');
  const [detalles, setDetalles] = useState<EntregaDetallePayload[]>([{ ...EMPTY_DETALLE }]);
  const [error, setError] = useState<string | null>(null);

  // Filtro de búsqueda de trabajador
  const [trabajadorSearch, setTrabajadorSearch] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setTrabajadorId('');
      setTransportistaTrabajadorId('');
      setReceptorTrabajadorId('');
      setEsTraslado(false);
      setUbicacionOrigenId('');
      setUbicacionDestinoId('');
      setNotaDestino('');
      setFechaDevolucion('');
      setDetalles([{ ...EMPTY_DETALLE }]);
      setError(null);
      setTrabajadorSearch('');
    }
  }, [isOpen]);

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

  const isTraslado = esTraslado;

  const ubicacionesOrigen = ubicaciones.filter((u) => {
    if (!u.tipo) return true;
    return u.tipo === 'bodega';
  });

  const ubicacionesDestino = ubicaciones.filter((u) => {
    if (!u.tipo) return true;
    if (isTraslado) return u.tipo === 'bodega';
    return u.tipo === 'planta';
  });

  // Step 1 validation
  const canGoToStep2 =
    (isTraslado ? transportistaTrabajadorId !== '' : trabajadorId !== '') &&
    ubicacionOrigenId !== '' &&
    ubicacionDestinoId !== '' &&
    ubicacionOrigenId !== ubicacionDestinoId &&
    (!isTraslado || receptorTrabajadorId !== '');

  // Step 2 helpers
  const addDetalle = () =>
    setDetalles((prev) => [...prev, { ...EMPTY_DETALLE }]);

  const removeDetalle = (idx: number) =>
    setDetalles((prev) => prev.filter((_, i) => i !== idx));

  const updateDetalle = (idx: number, field: keyof EntregaDetallePayload, value: unknown) =>
    setDetalles((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d))
    );

  const lotesForArticulo = (articuloId: string) =>
    lotes.filter((l) => l.articulo_id === articuloId);

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
          lote_id: art?.tracking_mode === 'lote' ? d.lote_id ?? null : null,
          cantidad: art?.tracking_mode === 'serial' ? 1 : d.cantidad,
        };
      })
    );
  };

  const handleSubmit = async () => {
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
      if (!d.cantidad || Number(d.cantidad) <= 0) {
        setError('La cantidad de cada ítem debe ser mayor a 0.');
        return;
      }

      const art = articuloOf(d.articulo_id);
      if (!art) {
        setError('Hay artículos inválidos en los ítems.');
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

      if (art.retorno_mode === 'consumible' && (d.activo_ids?.length || 0) > 0) {
        setError(`El artículo "${art.nombre}" es consumible y no admite activos serializados.`);
        return;
      }
    }

    const resolvedTrabajadorId = isTraslado ? transportistaTrabajadorId : trabajadorId;

    const payload: EntregaCreatePayload = {
      trabajador_id: resolvedTrabajadorId,
      transportista_trabajador_id: isTraslado ? transportistaTrabajadorId : null,
      receptor_trabajador_id: isTraslado ? receptorTrabajadorId || null : null,
      ubicacion_origen_id: ubicacionOrigenId,
      ubicacion_destino_id: ubicacionDestinoId,
      es_traslado: isTraslado,
      nota_destino: notaDestino || null,
      fecha_devolucion_esperada: fechaDevolucion || null,
      detalles: detalles.map((d) => ({
        articulo_id: d.articulo_id,
        activo_ids: d.activo_ids?.length ? d.activo_ids : undefined,
        lote_id: d.lote_id || null,
        cantidad: d.activo_ids?.length ? undefined : Number(d.cantidad),
        condicion_salida: d.condicion_salida || 'ok',
        notas: d.notas || null,
      })),
    };

    try {
      await onSubmit(payload);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.message ?? 'No se pudo crear la entrega.');
    }
  };

  const selectedTrabajador = trabajadores.find((t) => t.id === trabajadorId);
  const selectedTransportista = trabajadores.find((t) => t.id === transportistaTrabajadorId);
  const selectedReceptor = trabajadores.find((t) => t.id === receptorTrabajadorId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva entrega">
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
              {s === 1 ? 'Encabezado' : 'Artículos'}
            </span>
            {s < 2 && <div className="flex-1 h-px bg-gray-200 mx-4" />}
          </React.Fragment>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Trabajador */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isTraslado ? 'Transportista' : 'Trabajador'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Buscar por nombre o RUT..."
              value={trabajadorSearch}
              onChange={(e) => setTrabajadorSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none mb-2"
            />
            <select
              value={isTraslado ? transportistaTrabajadorId : trabajadorId}
              onChange={(e) => {
                if (isTraslado) {
                  setTransportistaTrabajadorId(e.target.value);
                } else {
                  setTrabajadorId(e.target.value);
                }
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
            >
              <option value="">— Seleccionar trabajador —</option>
              {filteredTrabajadores.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombres} {t.apellidos} · {t.rut}
                  {t.cargo ? ` · ${t.cargo}` : ''}
                </option>
              ))}
            </select>
            {((isTraslado ? selectedTransportista : selectedTrabajador)) && (
              <p className="mt-1 text-xs text-green-600 font-medium">
                ✓ {(isTraslado ? selectedTransportista : selectedTrabajador)?.nombres}{' '}
                {(isTraslado ? selectedTransportista : selectedTrabajador)?.apellidos}
              </p>
            )}
          </div>

          {isTraslado && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Receptor en bodega destino <span className="text-red-500">*</span>
              </label>
              <select
                value={receptorTrabajadorId}
                onChange={(e) => setReceptorTrabajadorId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
              >
                <option value="">— Seleccionar receptor —</option>
                {filteredTrabajadores.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombres} {t.apellidos} · {t.rut}
                    {t.cargo ? ` · ${t.cargo}` : ''}
                  </option>
                ))}
              </select>
              {selectedReceptor && (
                <p className="mt-1 text-xs text-green-600 font-medium">
                  ✓ {selectedReceptor.nombres} {selectedReceptor.apellidos}
                </p>
              )}
            </div>
          )}

          {/* Modo de movimiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Movimiento
            </label>
            <div className="flex items-center gap-3 rounded-lg border border-gray-300 px-3 py-2">
              <input
                id="entrega-es-traslado"
                type="checkbox"
                checked={isTraslado}
                onChange={(e) => {
                  setEsTraslado(e.target.checked);
                  setUbicacionOrigenId('');
                  setUbicacionDestinoId('');
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary-blue focus:ring-primary-blue"
              />
              <label htmlFor="entrega-es-traslado" className="text-sm text-gray-700 select-none">
                Es traslado entre bodegas
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Si no está marcado, se registra como entrega estándar.
            </p>
          </div>

          {/* Ubicación origen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ubicación origen (bodega) <span className="text-red-500">*</span>
            </label>
            <select
              value={ubicacionOrigenId}
              onChange={(e) => setUbicacionOrigenId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
            >
              <option value="">— Seleccionar ubicación origen —</option>
              {ubicacionesOrigen.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Ubicación destino */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ubicación destino <span className="text-red-500">*</span>
            </label>
            <select
              value={ubicacionDestinoId}
              onChange={(e) => setUbicacionDestinoId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
            >
              <option value="">— Seleccionar ubicación destino —</option>
              {ubicacionesDestino.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Nota */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nota / observaciones
            </label>
            <textarea
              rows={2}
              value={notaDestino}
              onChange={(e) => setNotaDestino(e.target.value)}
              placeholder="Información adicional..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
            />
          </div>

          {/* Fecha devolución esperada */}
          {!isTraslado && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha devolución esperada
              </label>
              <input
                type="date"
                value={fechaDevolucion}
                onChange={(e) => setFechaDevolucion(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Opcional. Se usará para el semáforo de devolución de activos retornables.
              </p>
            </div>
          )}
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          {detalles.map((detalle, idx) => {
            const art = articuloOf(detalle.articulo_id);
            const artLotes = art ? lotesForArticulo(art.id) : [];
            const needsLote = art?.tracking_mode === 'lote';
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
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                {/* Artículo */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Artículo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={detalle.articulo_id}
                    onChange={(e) =>
                      updateArticuloDetalle(idx, e.target.value)
                    }
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Cantidad <span className="text-red-500">*</span>
                    </label>
                    <input
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Condición de salida
                    </label>
                    <select
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
                  />
                )}

                {/* Lote (solo si tracking_mode === 'lote') */}
                {needsLote && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Lote
                    </label>
                    <select
                      value={detalle.lote_id ?? ''}
                      onChange={(e) =>
                        updateDetalle(idx, 'lote_id', e.target.value || null)
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-blue focus:outline-none"
                    >
                      <option value="">— Sin lote específico —</option>
                      {artLotes.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.codigo_lote ?? l.id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Notas */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Notas del ítem
                  </label>
                  <input
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
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary-blue hover:text-primary-blue transition-colors"
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
              {isSubmitting ? 'Creando...' : 'Crear entrega'}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};

export default EntregaCreateModal;
