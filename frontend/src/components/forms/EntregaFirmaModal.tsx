import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import Modal from '../Modal';
import {
  confirmEntrega,
  firmarEntregaDispositivo,
  generateEntregaSignatureToken,
  type EntregaRow,
} from '../../services/apiService';
import { useDeliverySignatureEvents } from '../../hooks/useDeliverySignatureEvents';

interface EntregaFirmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  entrega: EntregaRow | null;
  onCompleted: () => void;
  /**
   * Extension point: awaited between signature registration and delivery confirmation.
   * Default: no-op. Future use: photo evidence upload.
   * If it throws, confirmation is aborted and the error is shown in UI.
   */
  afterSignatureBeforeConfirm?: () => Promise<void>;
  /**
   * Override: treat entrega as already signed (skips canvas check).
   * Useful when entrega.firmado_en is not yet reflected in the snapshot.
   */
  alreadySigned?: boolean;
}

interface DeliveryTokenMeta {
  token: string;
  expira_en?: string;
}

const TEXTO_ACEPTACION =
  'Confirmo que recibo los equipos y herramientas indicados en buen estado ' +
  'y me comprometo a su uso y cuidado responsable.';

const wait = (ms: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, ms);
});

const EntregaFirmaModal: React.FC<EntregaFirmaModalProps> = ({
  isOpen,
  onClose,
  entrega,
  onCompleted,
  afterSignatureBeforeConfirm,
  alreadySigned = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureCanvasId = useId();
  const signatureHelpId = useId();
  const signatureErrorId = useId();
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const confirmingRef = useRef(false);
  const [hasFirma, setHasFirma] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrMeta, setQrMeta] = useState<DeliveryTokenMeta | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  const qrLink = useMemo(() => {
    if (!qrMeta?.token) {
      return null;
    }

    return `${window.location.origin}/firma/${qrMeta.token}`;
  }, [qrMeta]);

  const finalizeDelivery = useCallback(async () => {
    if (!entrega || confirmingRef.current) {
      return;
    }

    confirmingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      // Extension point: no-op by default, future use for photo evidence
      if (afterSignatureBeforeConfirm) {
        await afterSignatureBeforeConfirm();
      }

      let retryCount = 0;
      while (retryCount < 2) {
        try {
          await confirmEntrega(entrega.id);
          break;
        } catch (err: unknown) {
          const apiError = err as {
            response?: {
              status?: number;
              data?: {
                message?: string;
                errors?: Array<string | { message?: string }>;
              };
            };
            message?: string;
          };

          const errorTokens = (apiError?.response?.data?.errors ?? []).map((item) => {
            if (typeof item === 'string') {
              return item;
            }
            return item?.message ?? '';
          });
          const fallbackMessage = apiError?.response?.data?.message ?? apiError?.message ?? '';

          const isSignatureRequired =
            errorTokens.some((token) => token.includes('SIGNATURE_REQUIRED')) ||
            fallbackMessage.includes('debe estar firmada');

          if (isSignatureRequired && retryCount === 0) {
            retryCount += 1;
            await wait(700);
            continue;
          }

          const isAlreadyConfirmed =
            errorTokens.some((token) => token.includes('DELIVERY_ALREADY_CONFIRMED')) ||
            fallbackMessage.includes('ya está confirmada') ||
            (apiError?.response?.status === 409 && fallbackMessage.includes('confirmada'));

          if (isAlreadyConfirmed) {
            toast.success('La entrega ya estaba confirmada.');
            onCompleted();
            return;
          }

          throw err;
        }
      }

      toast.success('Entrega confirmada y activo actualizado.');
      onCompleted();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } }; message?: string };
      const message =
        apiError?.response?.data?.message ??
        apiError?.message ??
        'No se pudo confirmar la entrega.';

      setError(message);
      confirmingRef.current = false;
      setIsSubmitting(false);
    }
  }, [entrega, onCompleted, afterSignatureBeforeConfirm]);

  useDeliverySignatureEvents({
    enabled: isOpen && Boolean(entrega?.id),
    onSigned: (event) => {
      if (!entrega || event.entrega_id !== entrega.id) {
        return;
      }

      void finalizeDelivery();
    },
  });

  // Reset canvas when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setHasFirma(false);
      setError(null);
      setIsSubmitting(false);
      setQrMeta(null);
      setIsGeneratingQr(false);
      lastPos.current = null;
      isDrawing.current = false;
      confirmingRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !entrega?.id) {
      return;
    }

    let cancelled = false;

    const loadQr = async () => {
      setIsGeneratingQr(true);
      try {
        const data = await generateEntregaSignatureToken(entrega.id, 30);
        if (!cancelled) {
          setQrMeta({
            token: data.token,
            expira_en: data.expira_en,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const apiError = err as { response?: { data?: { message?: string } }; message?: string };
          setError(
            apiError?.response?.data?.message ??
              apiError?.message ??
              'No se pudo generar el QR de firma.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsGeneratingQr(false);
        }
      }
    };

    void loadQr();

    return () => {
      cancelled = true;
    };
  }, [entrega?.id, isOpen]);

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

    if (hasExistingSignature) {
      setIsSubmitting(true);
      try {
        await finalizeDelivery();
      } catch {
        setIsSubmitting(false);
      }
      return;
    }

    if (!hasFirma) {
      setError('Debes firmar antes de confirmar.');
      return;
    }

    const firmaBase64 = canvas.toDataURL('image/png');
    const acceptanceText = TEXTO_ACEPTACION;
    setIsSubmitting(true);

    try {
      await firmarEntregaDispositivo(entrega.id, firmaBase64, acceptanceText);
      await finalizeDelivery();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.message ?? 'Error al registrar la firma.');
      setIsSubmitting(false);
    }
  };

  const handleCopyQrLink = async () => {
    if (!qrLink) {
      return;
    }

    await navigator.clipboard.writeText(qrLink);
    toast.success('Enlace de firma copiado al portapapeles.');
  };

  if (!entrega) return null;

  const trabajadorNombre =
    entrega.nombres && entrega.apellidos
      ? `${entrega.nombres} ${entrega.apellidos}`
      : '—';

  const acceptanceText = TEXTO_ACEPTACION;
  const signerLabel = 'trabajador';
  const itemsCount = entrega.cantidad_items ?? entrega.detalles?.length ?? 0;
  const hasExistingSignature = alreadySigned || Boolean(entrega.firmado_en || entrega.firma_imagen_url);

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

      {/* QR remoto */}
      <div className="mb-4 rounded-lg border border-edge bg-white p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-content-primary">Firma remota por QR</h3>
            <p className="text-xs text-content-muted mt-1">
              El trabajador puede escanear este QR desde su teléfono. Cuando firme, esta pantalla se actualizará sola.
            </p>
          </div>
          {isGeneratingQr ? (
            <span className="text-xs text-content-muted">Generando QR...</span>
          ) : qrMeta ? (
            <span className="text-xs text-success-text font-medium">QR activo</span>
          ) : null}
        </div>

        {qrLink ? (
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="rounded-lg border border-edge p-3 bg-white">
              <QRCodeSVG
                value={qrLink}
                size={156}
                bgColor="#ffffff"
                fgColor="#1E2A4A"
                level="M"
              />
            </div>
            <div className="flex-1 space-y-3">
              <div className="rounded-lg bg-surface-muted border border-edge p-3">
                <p className="text-xs text-content-muted break-all">{qrLink}</p>
              </div>
              {qrMeta?.expira_en ? (
                <p className="text-xs text-content-muted">
                  Expira: {new Date(qrMeta.expira_en).toLocaleTimeString('es-CL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              ) : null}
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => void handleCopyQrLink()}
                  className="px-3 py-2 rounded-md border border-edge-strong text-sm text-content-secondary hover:bg-surface-muted transition-colors"
                >
                  Copiar enlace
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Firma esta entrega en: ${qrLink}`)}`}
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
          <p className="text-sm text-content-muted">El QR aún no está disponible.</p>
        )}
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
          disabled={isSubmitting}
          className="flex-1 py-2 px-4 border border-edge-strong rounded-lg text-sm text-content-secondary hover:bg-surface-muted transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={isSubmitting || (!hasFirma && !hasExistingSignature)}
          onClick={handleConfirmar}
          className="flex-1 py-2 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Registrando confirmación...' : hasExistingSignature ? 'Confirmar entrega pendiente' : 'Confirmar recepción'}
        </button>
      </div>
    </Modal>
  );
};

export default EntregaFirmaModal;
