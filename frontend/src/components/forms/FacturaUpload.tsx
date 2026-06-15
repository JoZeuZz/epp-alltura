import React, { useRef, useState } from 'react';
import { parseFactura, type FacturaAnalysis } from '../../services/api/facturas';

type UploadState = 'idle' | 'analyzing' | 'done' | 'error';

interface Props {
  articuloNombre: string;
  value: File | null;
  onChange: (file: File | null) => void;
  onAnalysis: (result: FacturaAnalysis | null) => void;
  existingUrl?: string | null;
}

const FacturaUpload: React.FC<Props> = ({
  articuloNombre,
  value,
  onChange,
  onAnalysis,
  existingUrl,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>('idle');

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    onChange(file);
    setState('analyzing');
    try {
      const result = await parseFactura(file, articuloNombre);
      setState(result.extractado_ok ? 'done' : 'error');
      onAnalysis(result);
    } catch {
      setState('error');
      onAnalysis({ proveedor_id: null, proveedor_nombre: null, proveedor_creado: false, fecha_compra: null, valor: null, extractado_ok: false });
    }
  };

  const handleClear = () => {
    onChange(null);
    onAnalysis(null);
    setState('idle');
    if (inputRef.current) inputRef.current.value = '';
  };

  const stripe = (): { bg: string; text: string; content: React.ReactNode } => {
    if (state === 'analyzing') return {
      bg: 'bg-amber-50 border-t border-amber-200',
      text: 'text-amber-800',
      content: (
        <span className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          Analizando factura…
        </span>
      ),
    };
    if (state === 'done') return {
      bg: 'bg-green-50 border-t border-green-200',
      text: 'text-green-800 font-semibold',
      content: '✓ Análisis completado',
    };
    if (state === 'error') return {
      bg: 'bg-red-50 border-t border-red-200',
      text: 'text-red-800',
      content: '⚠ No se pudo leer la factura — completá los datos manualmente',
    };
    return {
      bg: 'bg-blue-50 border-t border-blue-100',
      text: 'text-blue-800',
      content: '✦ Extrae proveedor, fecha y precio automáticamente',
    };
  };

  const { bg, text, content } = stripe();

  const PDF_ICON = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  return (
    <div className="space-y-1">
      {existingUrl && !value && (
        <a href={existingUrl} target="_blank" rel="noopener noreferrer"
          className="block text-xs text-primary-blue hover:underline mb-1">
          ↓ Ver factura actual
        </a>
      )}

      <div
        className={`rounded-lg border-2 overflow-hidden cursor-pointer transition-colors ${
          value ? 'border-primary-blue' : 'border-dashed border-primary-blue'
        }`}
        onClick={() => !value && inputRef.current?.click()}
        role={value ? undefined : 'button'}
        tabIndex={value ? undefined : 0}
        onKeyDown={(e) => { if (!value && (e.key === 'Enter' || e.key === ' ')) inputRef.current?.click(); }}
        aria-label={value ? undefined : 'Subir factura PDF'}
      >
        <div className="px-4 py-3 flex items-center gap-3 bg-blue-50">
          <span className="text-primary-blue">{PDF_ICON}</span>
          {value ? (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-dark-blue truncate">{value.name}</p>
                <p className="text-xs text-content-muted">{(value.size / 1024).toFixed(0)} KB · PDF</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                className="text-danger hover:text-danger-text text-lg leading-none px-1"
                aria-label="Eliminar factura seleccionada"
              >
                ×
              </button>
            </>
          ) : (
            <div>
              <p className="text-sm font-semibold text-primary-blue">Subir factura PDF</p>
              <p className="text-xs text-content-muted">PDF · máx 25MB</p>
            </div>
          )}
        </div>

        <div className={`px-4 py-1.5 text-xs font-medium ${bg} ${text}`}>
          {content}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
};

export default FacturaUpload;
