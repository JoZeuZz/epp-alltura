import React, { useEffect, useRef, useState } from 'react';
import {
  ALLOWED_IMAGE_ACCEPT,
  ALLOWED_IMAGE_TYPES,
  IMAGE_MAX_BYTES,
  IMAGE_MAX_LABEL,
} from '../../config/imageLimits';

interface Props {
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string | null;
}

const FotoEvidenciaUpload: React.FC<Props> = ({ value, onChange, error }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      onChange(null);
      setFileError(null);
      return;
    }
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setFileError('Solo se permiten imágenes JPG, PNG, WEBP o AVIF.');
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setFileError(`La imagen supera el tamaño máximo permitido (${IMAGE_MAX_LABEL}).`);
      return;
    }
    setFileError(null);
    onChange(file);
  };

  const handleClear = () => {
    onChange(null);
    setFileError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const displayError = fileError ?? error;

  if (previewUrl) {
    return (
      <div className="space-y-1">
        <div className="flex items-start gap-3">
          <div className="relative inline-block">
            <img
              src={previewUrl}
              alt="Vista previa de evidencia"
              className="w-28 h-28 object-cover rounded-lg border border-edge"
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute -top-2 -right-2 bg-white border border-edge-strong rounded-full w-5 h-5 flex items-center justify-center text-xs text-danger hover:bg-danger-subtle leading-none"
              aria-label="Eliminar imagen seleccionada"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-content-muted mt-1">{value?.name}</p>
        </div>
        {displayError && (
          <p className="text-xs text-danger-text" role="alert">
            {displayError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors select-none ${
          displayError
            ? 'border-danger bg-danger-subtle'
            : 'border-primary bg-blue-50 hover:bg-blue-100'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="none"
          stroke={displayError ? 'currentColor' : '#2A64A4'}
          strokeWidth="1.8"
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={displayError ? 'text-danger' : ''}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <circle cx="12" cy="13" r="3" strokeLinecap="round" />
        </svg>
        <div>
          <p
            className={`text-sm font-semibold ${
              displayError ? 'text-danger-text' : 'text-primary-blue'
            }`}
          >
            Subir foto <span className="text-danger">*</span>
          </p>
          <p className="text-xs text-content-muted">
            Obligatoria · JPG, PNG, WEBP · máx {IMAGE_MAX_LABEL}
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_ACCEPT}
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
      />
      {displayError && (
        <p className="text-xs text-danger-text" role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
};

export default FotoEvidenciaUpload;
