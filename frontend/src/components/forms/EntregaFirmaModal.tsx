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
  'Declaro haber recibido los artículos indicados en esta entrega, ' +
  'comprometiéndome a su correcto uso y cuidado según las políticas de la empresa.';

const TEXTO_ACEPTACION_TRASLADO =
  'Declaro transportar y custodiar temporalmente los artículos indicados en este traslado, ' +
  'asumiendo responsabilidad por su resguardo hasta la recepción en la bodega destino.';

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
      setError('Por favor dibuje la firma antes de confirmar.');
      return;
    }

    const firmaBase64 = canvas.toDataURL('image/png');
    const acceptanceText = entrega.tipo === 'traslado'
      ? TEXTO_ACEPTACION_TRASLADO
      : TEXTO_ACEPTACION;

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

  const isTraslado = entrega.tipo === 'traslado';
  const acceptanceText = isTraslado ? TEXTO_ACEPTACION_TRASLADO : TEXTO_ACEPTACION;
  const signerLabel = isTraslado ? 'transportista' : 'receptor';
  const itemsCount = entrega.cantidad_items ?? entrega.detalles?.length ?? 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isTraslado ? 'Firma de traslado' : 'Firma de entrega'}>
      {/* Resumen entrega */}
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-gray-700">
          <span className="font-medium">{isTraslado ? 'Transportista' : 'Trabajador'}:</span> {trabajadorNombre}
          {entrega.rut ? ` · RUT ${entrega.rut}` : ''}
        </p>
        <p className="text-sm text-gray-700 mt-1">
          <span className="font-medium">Artículos:</span>{' '}
          {itemsCount} ítem(s)
        </p>
        <p className="text-sm text-gray-700 mt-1">
          <span className="font-medium">Tipo:</span>{' '}
          {entrega.tipo === 'entrega'
            ? 'Entrega'
            : entrega.tipo === 'prestamo'
            ? 'Entrega'
            : 'Traslado'}
        </p>
      </div>

      {/* Texto de aceptación */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600 leading-relaxed">{acceptanceText}</p>
      </div>

      {/* Canvas firma */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <label htmlFor={signatureCanvasId} className="text-sm font-medium text-gray-700">
            {`Firma del ${signerLabel}`} <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={clearCanvas}
            className="text-xs text-gray-500 hover:text-red-500 underline transition-colors"
          >
            Limpiar
          </button>
        </div>
        <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white relative">
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
        <p id={signatureHelpId} className="mt-1 text-xs text-gray-500">
          Use el dedo o el ratón para firmar en el área de arriba.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          id={signatureErrorId}
          className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
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
          className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={isSubmitting || !hasFirma}
          onClick={handleConfirmar}
          className="flex-1 py-2 px-4 bg-primary-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Registrando firma...' : 'Confirmar firma'}
        </button>
      </div>
    </Modal>
  );
};

export default EntregaFirmaModal;
