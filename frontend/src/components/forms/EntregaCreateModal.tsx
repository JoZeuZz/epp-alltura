import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal from '../Modal';
import {
  getArticulos,
  type Articulo,
  type EntregaCreatePayload,
  type EntregaDetallePayload,
  type CondicionSalida,
} from '../../services/apiService';
import { formatCLP } from '../../utils/currency';
import FotoEvidenciaUpload from './FotoEvidenciaUpload';

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

interface DetalleState {
  articulo_id: string;
  condicion_salida: CondicionSalida;
  notas: string;
}

interface EntregaCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: EntregaCreatePayload, foto?: File) => Promise<void>;
  isSubmitting: boolean;
  trabajadores: TrabajadorOption[];
  ubicaciones: UbicacionOption[];
  /** Pre-selecciona y bloquea un artículo físico concreto (flujo desde perfil del activo). */
  initialArticuloId?: string | number;
  lockArticuloSelection?: boolean;
  initialArticuloCode?: string;
  initialArticuloName?: string;
  initialArticuloValue?: string;
  onSuccess?: () => void;
}

const CONDICION_LABELS: Record<CondicionSalida, string> = {
  ok: 'Bueno',
  usado: 'Usado',
  danado: 'Dañado',
};

const buildEmptyDetalle = (articuloId = ''): DetalleState => ({
  articulo_id: articuloId,
  condicion_salida: 'ok',
  notas: '',
});

const buildEntregaPayload = (
  trabajadorId: string,
  ubicacionOrigenId: string,
  ubicacionDestinoId: string,
  notaDestino: string,
  detalles: DetalleState[]
): EntregaCreatePayload => ({
  trabajador_id: trabajadorId,
  ubicacion_origen_id: ubicacionOrigenId,
  ubicacion_destino_id: ubicacionDestinoId,
  nota_destino: notaDestino || null,
  detalles: detalles
    .filter((d) => Boolean(d.articulo_id))
    .map<EntregaDetallePayload>((d) => ({
      articulo_id: d.articulo_id,
      condicion_salida: d.condicion_salida,
      notas: d.notas.trim() || null,
    })),
});

const EntregaCreateModal: React.FC<EntregaCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  trabajadores,
  ubicaciones,
  initialArticuloId,
  lockArticuloSelection = false,
  initialArticuloCode,
  initialArticuloName,
  initialArticuloValue,
  onSuccess,
}) => {
  const normalizedInitialArticuloId =
    initialArticuloId != null && initialArticuloId !== '' ? String(initialArticuloId) : '';
  const shouldPrefillSingleAsset = Boolean(normalizedInitialArticuloId);

  const buildInitialDetalles = (): DetalleState[] => [
    buildEmptyDetalle(shouldPrefillSingleAsset ? normalizedInitialArticuloId : ''),
  ];

  const [step, setStep] = useState<1 | 2>(1);
  const [trabajadorId, setTrabajadorId] = useState('');
  const [ubicacionOrigenId, setUbicacionOrigenId] = useState('');
  const [ubicacionDestinoId, setUbicacionDestinoId] = useState('');
  const [notaDestino, setNotaDestino] = useState('');
  const [detalles, setDetalles] = useState<DetalleState[]>(buildInitialDetalles);
  const [error, setError] = useState<string | null>(null);
  const [evidenciaFile, setEvidenciaFile] = useState<File | null>(null);
  const [evidenciaFotoError, setEvidenciaFotoError] = useState<string | null>(null);

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
      setEvidenciaFotoError(null);
    }
  }, [isOpen, initialArticuloId]);

  // Artículos físicos disponibles en la bodega de origen seleccionada.
  const { data: articulosData, isLoading: isLoadingArticulos, error: articulosError } = useQuery({
    queryKey: ['articulos', { estado: 'en_stock', bodega_id: ubicacionOrigenId }],
    queryFn: () => getArticulos({ estado: 'en_stock', bodega_id: ubicacionOrigenId }),
    enabled: isOpen && Boolean(ubicacionOrigenId),
  });
  const articulosDisponibles = useMemo<Articulo[]>(
    () => articulosData?.items ?? [],
    [articulosData]
  );
  const articuloOf = (id: string) => articulosDisponibles.find((a) => a.id === id);

  // Cuando cambia la bodega de origen, los artículos elegibles cambian: limpia
  // selecciones que ya no aplican (excepto la fila bloqueada de prefill).
  useEffect(() => {
    setDetalles((prev) =>
      prev.map((d, idx) => {
        if (lockArticuloSelection && shouldPrefillSingleAsset && idx === 0) {
          return d;
        }
        return d.articulo_id ? buildEmptyDetalle() : d;
      })
    );
  }, [ubicacionOrigenId, lockArticuloSelection, shouldPrefillSingleAsset]);

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
    ubicacionOrigenId !== ubicacionDestinoId &&
    evidenciaFile !== null;

  // Step 2 helpers
  const addDetalle = () => setDetalles((prev) => [...prev, buildEmptyDetalle()]);

  const removeDetalle = (idx: number) =>
    setDetalles((prev) => prev.filter((_, i) => i !== idx));

  const updateDetalle = <K extends keyof DetalleState>(idx: number, field: K, value: DetalleState[K]) =>
    setDetalles((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d))
    );

  const isLockedPrefilledRow = (idx: number) =>
    lockArticuloSelection && shouldPrefillSingleAsset && idx === 0;

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    setError(null);
    if (ubicacionOrigenId === ubicacionDestinoId) {
      setError('La ubicación de origen y destino no puede ser la misma.');
      return;
    }

    const selectedArticuloIds = new Set<string>();

    for (const d of detalles) {
      if (!d.articulo_id) {
        setError('Todos los ítems deben tener un artículo seleccionado.');
        return;
      }
      if (selectedArticuloIds.has(d.articulo_id)) {
        setError('No puedes repetir el mismo artículo en más de un ítem.');
        return;
      }
      selectedArticuloIds.add(d.articulo_id);
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
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva entrega" mobileFullscreen>
      {shouldPrefillSingleAsset && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Resumen de herramienta</p>
          <p className="text-sm text-blue-900">
            <span className="font-medium">Código:</span> {initialArticuloCode || normalizedInitialArticuloId}
          </p>
          {initialArticuloName && (
            <p className="text-sm text-blue-900">
              <span className="font-medium">Herramienta:</span> {initialArticuloName}
            </p>
          )}
          <p className="text-sm text-blue-900">
            <span className="font-medium">Valor bajo responsabilidad:</span> {initialArticuloValue || 'Sin valor registrado'}
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
            <FotoEvidenciaUpload
              value={evidenciaFile}
              onChange={(f) => {
                setEvidenciaFile(f);
                if (f) setEvidenciaFotoError(null);
              }}
              error={evidenciaFotoError}
            />
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          {isLoadingArticulos && (
            <p className="text-sm text-content-muted">Cargando artículos disponibles en la bodega de origen...</p>
          )}
          {articulosError && (
            <p className="text-sm text-danger-text">No se pudieron cargar los artículos disponibles.</p>
          )}
          {!isLoadingArticulos && !articulosError && articulosDisponibles.length === 0 && (
            <p className="text-sm text-content-muted">
              No hay artículos en stock en la bodega de origen seleccionada.
            </p>
          )}

          {detalles.map((detalle, idx) => {
            const art = articuloOf(detalle.articulo_id);
            const locked = isLockedPrefilledRow(idx);
            const yaSeleccionados = detalles
              .filter((_, i) => i !== idx)
              .map((d) => d.articulo_id)
              .filter(Boolean);

            return (
              <div key={idx} className="border border-edge rounded-lg p-4 space-y-3 bg-surface-muted">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-content-secondary">Ítem {idx + 1}</span>
                  {detalles.length > 1 && !locked && (
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

                {/* Artículo físico */}
                <div>
                  <label htmlFor={`entrega-detalle-articulo-${idx}`} className="block text-xs font-medium text-content-secondary mb-1">
                    Artículo <span className="text-danger">*</span>
                  </label>
                  <select
                    id={`entrega-detalle-articulo-${idx}`}
                    value={detalle.articulo_id}
                    onChange={(e) => updateDetalle(idx, 'articulo_id', e.target.value)}
                    disabled={locked}
                    className="w-full border border-edge-strong rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none disabled:bg-surface-overlay disabled:text-content-disabled"
                  >
                    <option value="">— Seleccionar artículo —</option>
                    {locked && art == null && detalle.articulo_id && (
                      <option value={detalle.articulo_id}>
                        {initialArticuloName || initialArticuloCode || detalle.articulo_id}
                      </option>
                    )}
                    {articulosDisponibles
                      .filter(
                        (a) => a.id === detalle.articulo_id || !yaSeleccionados.includes(a.id)
                      )
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre} · {a.codigo}
                          {a.nro_serie ? ` · S/N ${a.nro_serie}` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Resumen del artículo seleccionado */}
                {art && (
                  <div className="rounded-md border border-edge bg-surface px-3 py-2 text-xs text-content-secondary space-y-0.5">
                    <p><span className="font-medium">Nombre:</span> {art.nombre}</p>
                    <p><span className="font-medium">Código:</span> {art.codigo}</p>
                    {art.nro_serie && <p><span className="font-medium">N° serie:</span> {art.nro_serie}</p>}
                    <p><span className="font-medium">Valor:</span> {formatCLP(art.valor)}</p>
                  </div>
                )}

                {/* Condición de salida */}
                <div>
                  <label htmlFor={`entrega-detalle-condicion-${idx}`} className="block text-xs font-medium text-content-secondary mb-1">
                    Condición de salida
                  </label>
                  <select
                    id={`entrega-detalle-condicion-${idx}`}
                    value={detalle.condicion_salida}
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

                {/* Notas */}
                <div>
                  <label htmlFor={`entrega-detalle-notas-${idx}`} className="block text-xs font-medium text-content-secondary mb-1">
                    Notas del ítem
                  </label>
                  <input
                    id={`entrega-detalle-notas-${idx}`}
                    type="text"
                    value={detalle.notas}
                    onChange={(e) => updateDetalle(idx, 'notas', e.target.value)}
                    placeholder="Observaciones opcionales..."
                    className="w-full border border-edge-strong rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>
            );
          })}

          {!lockArticuloSelection && (
            <button
              type="button"
              onClick={addDetalle}
              className="w-full py-2 border-2 border-dashed border-edge-strong rounded-lg text-sm text-content-muted hover:border-primary hover:text-primary transition-colors"
              aria-label="Agregar un nuevo ítem de artículo"
            >
              + Agregar artículo
            </button>
          )}
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
