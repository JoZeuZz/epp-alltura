import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import Modal from '../Modal';
import type { EntregaRow } from '../../services/apiService';

interface EntregaFirmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  entrega: EntregaRow | null;
  onFirmar: (entregaId: string, firmaBase64: string, textoAceptacion: string) => Promise<void>;
  isSubmitting: boolean;
}

const TEXTO_ACEPTACION =
  'Confirmo que recibo los equipos y herramientas indicados en buen estado ' +
  'y me comprometo a su uso y cuidado responsable.';

const EntregaFirmaModal: React.FC<EntregaFirmaModalProps> = ({
  isOpen,
  onClose,
  entrega,
  onFirmar,
  isSubmitting,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureCanvasId = useId();
  const signatureHelpId = useId();
  const signatureErrorId = useId();
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [hasFirma, setHasFirma] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset canvas when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setHasFirma(false);
      setError(null);
      lastPos.current = null;
      isDrawing.current = false;
    }
  }, [isOpen]);

  // Set canvas background to white when it mounts
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, [isOpen]);

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

  const handleConfirmar = async () => {
    setError(null);
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!entrega) return;
    if (!hasFirma) {
      setError('Debes firmar antes de confirmar.');
      return;
    }

    const firmaBase64 = canvas.toDataURL('image/png');
    const acceptanceText = TEXTO_ACEPTACION;

    try {
      await onFirmar(entrega.id, firmaBase64, acceptanceText);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.message ?? 'Error al registrar la firma.');
    }
  };

  if (!entrega) return null;

  const trabajadorNombre =
    entrega.nombres && entrega.apellidos
      ? `${entrega.nombres} ${entrega.apellidos}`
      : '—';

  const acceptanceText = TEXTO_ACEPTACION;
  const signerLabel = 'trabajador';
  const itemsCount = entrega.cantidad_items ?? entrega.detalles?.length ?? 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar recepción">
      {/* Resumen entrega */}
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-content-secondary">
          <span className="font-medium">Trabajador:</span> {trabajadorNombre}
          {entrega.rut ? ` · RUT ${entrega.rut}` : ''}
        </p>
        <p className="text-sm text-content-secondary mt-1">
          <span className="font-medium">Artículos:</span>{' '}
          {itemsCount} ítem(s)
        </p>
      </div>

      {/* Texto de aceptación */}
      <div className="mb-4 p-3 bg-surface-muted rounded-lg border border-edge">
        <p className="text-xs text-content-secondary leading-relaxed">{acceptanceText}</p>
      </div>

      {/* Canvas firma */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <label htmlFor={signatureCanvasId} className="text-sm font-medium text-content-secondary">
            {`Firma del ${signerLabel}`} <span className="text-danger">*</span>
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
            height={200}
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
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${signatureHelpId} ${signatureErrorId}` : signatureHelpId}
          />
          {!hasFirma && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-gray-300 text-sm select-none">Firme aquí</p>
            </div>
          )}
        </div>
        <p id={signatureHelpId} className="mt-1 text-xs text-content-muted">
          Use el dedo o el ratón para firmar en el área de arriba.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          id={signatureErrorId}
          className="mt-3 p-3 bg-danger-subtle border border-danger-border rounded-lg text-sm text-danger-text"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-3 mt-5">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 px-4 border border-edge-strong rounded-lg text-sm text-content-secondary hover:bg-surface-muted transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={isSubmitting || !hasFirma}
          onClick={handleConfirmar}
          className="flex-1 py-2 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Registrando confirmación...' : 'Confirmar recepción'}
        </button>
      </div>
    </Modal>
  );
};

export default EntregaFirmaModal;
