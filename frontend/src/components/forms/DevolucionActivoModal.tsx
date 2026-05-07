import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../Modal';
import { useGet } from '../../hooks';
import { devolverActivo } from '../../services/apiService';

interface BodegaOption {
  id: string;
  nombre: string;
}

interface Props {
  activoId: string;
  trabajadorId: string;
  trabajadorNombre: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CONDICION_LABELS = {
  ok: 'Bueno',
  usado: 'Usado',
  danado: 'Dañado',
  perdido: 'Perdido',
} as const;

const DISPOSICION_LABELS = {
  devuelto: 'Devuelto al stock',
  perdido: 'Perdido',
  baja: 'Dar de baja',
  mantencion: 'Enviar a mantención',
} as const;

const DevolucionActivoModal: React.FC<Props> = ({
  activoId,
  trabajadorId,
  trabajadorNombre,
  onClose,
  onSuccess,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureCanvasId = useId();
  const signatureHelpId = useId();
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const [ubicacionId, setUbicacionId] = useState('');
  const [condicion, setCondicion] = useState<'ok' | 'usado' | 'danado' | 'perdido'>('ok');
  const [disposicion, setDisposicion] = useState<'devuelto' | 'perdido' | 'baja' | 'mantencion'>('devuelto');
  const [notas, setNotas] = useState('');
  const [hasFirma, setHasFirma] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: bodegas = [] } = useGet<BodegaOption[]>(
    ['bodegas'],
    '/bodegas',
  );

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, []);

  const getPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    const me = e as React.MouseEvent<HTMLCanvasElement>;
    return {
      x: (me.clientX - rect.left) * scaleX,
      y: (me.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      isDrawing.current = true;
      lastPos.current = getPos(e, canvas);
    },
    []
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const pos = getPos(e, canvas);
      if (lastPos.current) {
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        setHasFirma(true);
      }
      lastPos.current = pos;
    },
    []
  );

  const endDraw = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasFirma(false);
  };

  const mutation = useMutation({
    mutationFn: (firmaBase64: string) =>
      devolverActivo(activoId, {
        trabajador_id: trabajadorId,
        bodega_recepcion_id: ubicacionId,
        condicion_entrada: condicion,
        disposicion,
        notas: notas.trim() || null,
        firma_imagen_url: firmaBase64,
      }),
    onSuccess: () => {
      toast.success('Devolución registrada correctamente.');
      onSuccess();
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: { message?: string } }; message?: string };
      const msg = e?.response?.data?.message ?? e?.message ?? 'No se pudo registrar la devolución.';
      toast.error(msg);
    },
  });

  const handleConfirmar = () => {
    setFormError(null);
    if (!ubicacionId) {
      setFormError('Selecciona una ubicación de recepción.');
      return;
    }
    if (!hasFirma) {
      setFormError('Debes firmar antes de confirmar.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const firmaBase64 = canvas.toDataURL('image/png');
    mutation.mutate(firmaBase64);
  };

  return (
    <Modal isOpen onClose={onClose} title="Registrar devolución">
      <div className="space-y-4">
        {/* Trabajador locked */}
        <div>
          <p className="text-xs uppercase tracking-wide text-content-muted mb-1">Trabajador</p>
          <p className="text-sm font-medium text-content-primary bg-surface-muted border border-edge rounded-md px-3 py-2">
            {trabajadorNombre}
          </p>
        </div>

        {/* Ubicación recepción */}
        <div>
          <label className="block text-xs uppercase tracking-wide text-content-muted mb-1">
            Ubicación de recepción <span className="text-danger">*</span>
          </label>
          <select
            value={ubicacionId}
            onChange={(e) => setUbicacionId(e.target.value)}
            className="w-full border border-edge-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Seleccionar ubicación...</option>
            {bodegas.map((b) => (
              <option key={b.id} value={b.id}>{b.nombre}</option>
            ))}
          </select>
        </div>

        {/* Condición de entrada */}
        <div>
          <label className="block text-xs uppercase tracking-wide text-content-muted mb-1">
            Condición de entrada <span className="text-danger">*</span>
          </label>
          <select
            value={condicion}
            onChange={(e) => setCondicion(e.target.value as typeof condicion)}
            className="w-full border border-edge-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {Object.entries(CONDICION_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Disposición */}
        <div>
          <label className="block text-xs uppercase tracking-wide text-content-muted mb-1">
            Disposición <span className="text-danger">*</span>
          </label>
          <select
            value={disposicion}
            onChange={(e) => setDisposicion(e.target.value as typeof disposicion)}
            className="w-full border border-edge-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {Object.entries(DISPOSICION_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-xs uppercase tracking-wide text-content-muted mb-1">Notas</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Observaciones opcionales..."
            className="w-full border border-edge-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Pad de firma */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor={signatureCanvasId} className="text-xs uppercase tracking-wide text-content-muted">
              Firma del trabajador <span className="text-danger">*</span>
            </label>
            <button
              type="button"
              onClick={clearCanvas}
              className="text-xs text-content-muted hover:text-danger underline transition-colors"
            >
              Limpiar
            </button>
          </div>
          <div className="border-2 border-dashed border-edge-strong rounded-lg overflow-hidden bg-surface relative">
            <canvas
              id={signatureCanvasId}
              ref={canvasRef}
              width={600}
              height={180}
              className="w-full touch-none cursor-crosshair"
              style={{ touchAction: 'none' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
              aria-required="true"
              aria-describedby={signatureHelpId}
            />
            {!hasFirma && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-gray-300 text-sm select-none">Firme aquí</p>
              </div>
            )}
          </div>
          <p id={signatureHelpId} className="mt-1 text-xs text-content-muted">
            Use el dedo o el ratón para firmar.
          </p>
        </div>

        {/* Error */}
        {formError && (
          <div className="p-3 bg-danger-subtle border border-danger-border rounded-lg text-sm text-danger-text" role="alert">
            {formError}
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="flex-1 py-2 px-4 border border-edge-strong rounded-lg text-sm text-content-secondary hover:bg-surface-muted disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={mutation.isPending}
            className="flex-1 py-2 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending ? 'Registrando...' : 'Confirmar devolución'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DevolucionActivoModal;
