import React, { useEffect, useRef, useState } from 'react';
import {
  ALLOWED_IMAGE_ACCEPT,
  ALLOWED_IMAGE_TYPES,
  IMAGE_MAX_BYTES,
  IMAGE_MAX_LABEL,
} from '../../config/imageLimits';
import { processImageFile } from '../../utils/imageProcessing';

interface Props {
  value: File | null;
  previewUrl?: string | null;
  onChange: (file: File | null) => void;
  error?: string | null;
}

const PersonIcon: React.FC = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    <circle cx="12" cy="8" r="3.5" />
    <path strokeLinecap="round" d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
  </svg>
);

const TrabajadorFotoInput: React.FC<Props> = ({ value, previewUrl, onChange, error }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!value) {
      setLocalPreview(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setFileError('Solo se permiten imágenes JPG, PNG, WEBP o AVIF.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setFileError(`La imagen supera el tamaño máximo permitido (${IMAGE_MAX_LABEL}).`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setFileError(null);
    try {
      setProcessing(true);
      const processed = await processImageFile(file, { maxSizeMB: 0.4, maxWidthOrHeight: 512 });
      onChange(processed.file);
    } catch {
      setFileError('Error al procesar la imagen.');
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleClear = () => {
    onChange(null);
    setFileError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const shownPreview = localPreview ?? previewUrl ?? null;
  const displayError = fileError ?? error;

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600 mb-1">Foto del trabajador</label>

      {shownPreview ? (
        <div className="flex items-center gap-3 border border-edge rounded-xl px-3.5 py-3 bg-white">
          <img src={shownPreview} alt="Foto del trabajador" className="w-12 h-12 rounded-full object-cover border border-edge" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-sm font-semibold text-primary-blue hover:text-blue-700"
          >
            Cambiar foto
          </button>
          <button type="button" onClick={handleClear} className="ml-auto text-xs text-danger hover:underline">
            Quitar
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label="Subir foto del trabajador"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
          className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors select-none ${
            displayError ? 'border-danger bg-danger-subtle' : 'border-primary bg-blue-50 hover:bg-blue-100'
          }`}
        >
          <span className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${displayError ? 'bg-danger-subtle text-danger' : 'bg-blue-100 text-primary-blue'}`}>
            <PersonIcon />
          </span>
          <div>
            <p className={`text-sm font-semibold ${displayError ? 'text-danger-text' : 'text-primary-blue'}`}>
              {processing ? 'Procesando…' : 'Subir foto del trabajador'}
            </p>
            <p className="text-xs text-content-muted">JPG, PNG, WEBP · máx {IMAGE_MAX_LABEL}</p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        data-testid="trabajador-foto-input"
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

export default TrabajadorFotoInput;
