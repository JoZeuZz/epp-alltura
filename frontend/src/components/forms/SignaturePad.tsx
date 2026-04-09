import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

interface SignaturePadProps {
  label?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  showPreview?: boolean;
  onChange?: (dataUrl: string | null, file: File | null) => void;
}

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 240;

const toFile = (dataUrl: string, filename: string) => {
  const [header, encoded] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new File([bytes], filename, { type: mime });
};

const SignaturePad: React.FC<SignaturePadProps> = ({
  label = 'Firma manuscrita',
  required = false,
  className = '',
  disabled = false,
  showPreview = true,
  onChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasId = useId();
  const helpId = useId();
  const errorId = useId();
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    setHasSignature(false);
    setPreviewUrl(null);
    setError(required ? 'La firma es obligatoria.' : null);
    onChange?.(null, null);
  }, [onChange, required]);

  const emitSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) {
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    setPreviewUrl(dataUrl);
    setError(null);

    const file = toFile(dataUrl, `firma-${Date.now()}.png`);
    onChange?.(dataUrl, file);
  }, [hasSignature, onChange]);

  const getCoordinates = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    const point = getCoordinates(event);

    if (!canvas || !context || !point) return;

    if (!hasSignature) {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.strokeStyle = '#111827';
    context.lineWidth = 2.5;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    context.beginPath();
    context.moveTo(point.x, point.y);

    setIsDrawing(true);
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;

    const context = canvasRef.current?.getContext('2d');
    const point = getCoordinates(event);
    if (!context || !point) return;

    context.lineTo(point.x, point.y);
    context.stroke();

    if (!hasSignature) {
      setHasSignature(true);
      setError(null);
    }

    event.preventDefault();
  };

  const endDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    setIsDrawing(false);
    canvasRef.current?.releasePointerCapture(event.pointerId);
    emitSignature();
    event.preventDefault();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={canvasId} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
        <button
          type="button"
          className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          onClick={clearCanvas}
          disabled={disabled}
        >
          Limpiar
        </button>
      </div>

      <div className="rounded-lg border border-gray-300 bg-white overflow-hidden">
        <canvas
          id={canvasId}
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-44 touch-none"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={endDrawing}
          onPointerLeave={endDrawing}
          tabIndex={disabled ? -1 : 0}
          aria-label="Área de firma"
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${helpId} ${errorId}` : helpId}
        />
      </div>

      <p id={helpId} className="text-xs text-gray-500">
        Usa el dedo o el ratón para dibujar la firma en el área indicada.
      </p>

      {error && (
        <p id={errorId} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      {showPreview && previewUrl && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
          <p className="text-xs text-gray-500 mb-1">Vista previa</p>
          <img src={previewUrl} alt="Vista previa de firma" className="w-full max-h-28 object-contain" />
        </div>
      )}
    </div>
  );
};

export default SignaturePad;
