import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import Modal from '../Modal';
import {
  confirmDevolucion,
  firmarDevolucionDispositivo,
  generateDevolucionSignatureToken,
  type DevolucionRow,
} from '../../services/apiService';
import { useDeliverySignatureEvents } from '../../hooks/useDeliverySignatureEvents';

interface DevolucionFirmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  devolucion: DevolucionRow | null;
  onCompleted: () => void;
}

interface QrMeta {
  token: string;
  expira_en?: string;
}

const TEXTO_ACEPTACION =
  'Confirmo la devolución de los equipos y herramientas indicados, en las condiciones registradas.';

const DevolucionFirmaModal: React.FC<DevolucionFirmaModalProps> = ({
  isOpen,
  onClose,
  devolucion,
  onCompleted,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureCanvasId = useId();
  const signatureHelpId = useId();
  const signatureErrorId = useId();
  const confirmingRef = useRef(false);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const [hasFirma, setHasFirma] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrMeta, setQrMeta] = useState<QrMeta | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  const qrLink = useMemo(() => {
    if (!qrMeta?.token) return null;
    return `${window.location.origin}/firma/devolucion/${qrMeta.token}`;
  }, [qrMeta]);

  const finalizeDevolucion = useCallback(async () => {
    if (!devolucion || confirmingRef.current) return;
    confirmingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      await confirmDevolucion(devolucion.id);
      toast.success('Devolución confirmada y activo actualizado.');
      onCompleted();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        apiError?.response?.data?.message ?? apiError?.message ?? 'No se pudo confirmar la devolución.'
      );
      confirmingRef.current = false;
      setIsSubmitting(false);
    }
  }, [devolucion, onCompleted]);

  useDeliverySignatureEvents({
    enabled: isOpen && Boolean(devolucion?.id),
    onReturnSigned: (event) => {
      if (!devolucion || event.devolucion_id !== devolucion.id) return;
      void finalizeDevolucion();
    },
  });

  // Reset al cerrar
  useEffect(() => {
    if (!isOpen) {
      setHasFirma(false);
      setError(null);
      setIsSubmitting(false);
      setQrMeta(null);
      setIsGeneratingQr(false);
      isDrawing.current = false;
      lastPos.current = null;
      confirmingRef.current = false;
    }
  }, [isOpen]);

  // Fondo blanco del canvas al abrir
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, [isOpen]);

  // Generar QR al abrir el modal
  useEffect(() => {
    if (!isOpen || !devolucion?.id) return;
    let cancelled = false;

    const loadQr = async () => {
      setIsGeneratingQr(true);
      try {
        const data = await generateDevolucionSignatureToken(devolucion.id, 30);
        if (!cancelled) setQrMeta({ token: data.token, expira_en: data.expira_en });
      } catch (err: unknown) {
        if (!cancelled) {
          const apiError = err as { response?: { data?: { message?: string } }; message?: string };
          setError(
            apiError?.response?.data?.message ?? apiError?.message ?? 'No se pudo generar el QR de firma.'
          );
        }
      } finally {
        if (!cancelled) setIsGeneratingQr(false);
      }
    };

    void loadQr();
    return () => { cancelled = true; };
  }, [devolucion?.id, isOpen]);

  const getPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
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
    return { x: (me.clientX - rect.left) * scaleX, y: (me.clientY - rect.top) * scaleY };
  };

  const startDraw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      isDrawing.current = true;
      lastPos.current = getPos(e, canvas);
    }, []
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
    }, []
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
    if (!devolucion) return;
    if (!hasFirma) {
      setError('Debes firmar antes de confirmar.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const firmaBase64 = canvas.toDataURL('image/png');
    setIsSubmitting(true);
    try {
      await firmarDevolucionDispositivo(devolucion.id, firmaBase64, TEXTO_ACEPTACION);
      await finalizeDevolucion();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.message ?? 'Error al registrar la firma.');
      setIsSubmitting(false);
    }
  };

  const handleCopyQrLink = async () => {
    if (!qrLink) return;
    await navigator.clipboard.writeText(qrLink);
    toast.success('Enlace de firma copiado al portapapeles.');
  };

  if (!devolucion) return null;

  const trabajadorNombre =
    devolucion.nombres && devolucion.apellidos
      ? `${devolucion.nombres} ${devolucion.apellidos}`
      : '—';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar devolución">
      {/* Resumen */}
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-content-secondary">
          <span className="font-medium">Trabajador:</span> {trabajadorNombre}
        </p>
        <p className="text-sm text-content-secondary mt-1">
          <span className="font-medium">Artículos:</span> {devolucion.cantidad_detalles ?? devolucion.detalles?.length ?? 0} ítem(s)
        </p>
      </div>

      {/* Texto de aceptación */}
      <div className="mb-4 p-3 bg-surface-muted rounded-lg border border-edge">
        <p className="text-xs text-content-secondary leading-relaxed">{TEXTO_ACEPTACION}</p>
      </div>

      {/* QR remoto */}
      <div className="mb-4 rounded-lg border border-edge bg-white p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-content-primary">Firma remota por QR</h3>
            <p className="text-xs text-content-muted mt-1">
              El trabajador escanea el QR desde su teléfono. Esta pantalla se actualiza sola al firmar.
            </p>
          </div>
          {isGeneratingQr && <span className="text-xs text-content-muted">Generando QR...</span>}
          {!isGeneratingQr && qrMeta && <span className="text-xs text-success-text font-medium">QR activo</span>}
        </div>

        {qrLink ? (
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="rounded-lg border border-edge p-3 bg-white">
              <QRCodeSVG value={qrLink} size={156} bgColor="#ffffff" fgColor="#1E2A4A" level="M" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="rounded-lg bg-surface-muted border border-edge p-3">
                <p className="text-xs text-content-muted break-all">{qrLink}</p>
              </div>
              {qrMeta?.expira_en && (
                <p className="text-xs text-content-muted">
                  Expira:{' '}
                  {new Date(qrMeta.expira_en).toLocaleTimeString('es-CL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => void handleCopyQrLink()}
                  className="px-3 py-2 rounded-md border border-edge-strong text-sm text-content-secondary hover:bg-surface-muted transition-colors"
                >
                  Copiar enlace
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Firma esta devolución en: ${qrLink}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-md border border-edge-strong text-sm text-content-secondary hover:bg-surface-muted transition-colors"
                >
                  Compartir por WhatsApp
                </a>
              </div>
            </div>
          </div>
        ) : (
          !isGeneratingQr && <p className="text-sm text-content-muted">El QR no está disponible.</p>
        )}
      </div>

      {/* Canvas firma local */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <label htmlFor={signatureCanvasId} className="text-sm font-medium text-content-secondary">
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

      {error && (
        <div
          id={signatureErrorId}
          className="mt-3 p-3 bg-danger-subtle border border-danger-border rounded-lg text-sm text-danger-text"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="flex gap-3 mt-5">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="flex-1 py-2 px-4 border border-edge-strong rounded-lg text-sm text-content-secondary hover:bg-surface-muted transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={isSubmitting || !hasFirma}
          onClick={() => void handleConfirmar()}
          className="flex-1 py-2 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Registrando...' : 'Confirmar devolución'}
        </button>
      </div>
    </Modal>
  );
};

export default DevolucionFirmaModal;
