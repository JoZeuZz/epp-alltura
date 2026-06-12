import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { DEFAULT_IMAGE_PLACEHOLDER } from '../../../utils/image';
import { MOV_ICONS, MOV_LABELS, CUSTODIA_ESTADO_CLASSES, formatDate, formatDateTime } from './utils';
import type { ActivoCustodiaEntry, ActivoTimelineEntry } from '../../../services/apiService';

interface ArticuloImageToggleProps {
  src: string;
  alt: string;
  expanded: boolean;
  onToggle: () => void;
}

export const ArticuloImageToggle: React.FC<ArticuloImageToggleProps> = ({ src, alt, expanded, onToggle }) => {
  if (expanded) {
    return (
      <div
        className="relative cursor-pointer w-full"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); }}
      >
        <img
          src={src}
          alt={alt}
          className="w-full max-h-72 object-contain rounded-lg border border-edge transition-all duration-200"
          loading="lazy"
          decoding="async"
          onError={(e) => { e.currentTarget.src = DEFAULT_IMAGE_PLACEHOLDER; }}
        />
        <div className="absolute top-2 right-2 bg-black/40 rounded p-0.5">
          <Minimize2 className="w-5 h-5 text-white drop-shadow" />
        </div>
      </div>
    );
  }
  return (
    <div
      className="relative group cursor-pointer flex-shrink-0"
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); }}
    >
      <img
        src={src}
        alt={alt}
        className="w-24 h-24 object-cover rounded-lg border border-edge"
        loading="lazy"
        decoding="async"
        onError={(e) => { e.currentTarget.src = DEFAULT_IMAGE_PLACEHOLDER; }}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity duration-150">
        <Maximize2 className="w-5 h-5 text-white drop-shadow" />
      </div>
    </div>
  );
};

export const StatBox: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="bg-surface border rounded-lg px-3 py-2 min-w-[70px]">
    <p className="text-xl font-bold text-content-primary">{value}</p>
    <p className="text-[10px] text-content-muted uppercase tracking-wide">{label}</p>
  </div>
);

export const MobileSummaryItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="bg-surface border rounded-lg p-2">
    <p className="text-[10px] text-content-muted uppercase tracking-wide mb-1">{label}</p>
    <div className="text-xs">{children}</div>
  </div>
);

export const ActionButton: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  reason?: string;
  tone?: 'primary' | 'neutral';
}> = ({ label, onClick, disabled = false, reason, tone = 'neutral' }) => (
  <div className="space-y-0.5">
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 rounded-md border text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:bg-surface-muted disabled:text-content-disabled disabled:cursor-not-allowed ${
        tone === 'primary'
          ? 'border-primary bg-primary text-white hover:bg-primary-hover disabled:border-edge disabled:bg-surface-muted'
          : 'border-edge text-content-secondary bg-surface hover:bg-surface-muted'
      }`}
    >
      {label}
    </button>
    {disabled && reason && <p className="text-xs text-content-disabled leading-tight">{reason}</p>}
  </div>
);

export const TimelineItem: React.FC<{
  entry: ActivoTimelineEntry;
  onDownloadActa?: (entregaId: string) => void;
  onDownloadActaDevolucion?: (devolucionId: string) => void;
  onOpenDetail?: (type: 'entrega' | 'devolucion', id: string) => void;
}> = ({ entry, onDownloadActa, onDownloadActaDevolucion, onOpenDetail }) => {
  const isPending =
    (entry.estado_entrega != null && ['borrador', 'pendiente_firma'].includes(entry.estado_entrega)) ||
    (entry.estado_devolucion != null && ['borrador', 'pendiente_firma'].includes(entry.estado_devolucion));

  const handleRowClick = () => {
    if (entry.entrega_id && onOpenDetail) onOpenDetail('entrega', entry.entrega_id);
    else if (entry.devolucion_id && onOpenDetail) onOpenDetail('devolucion', entry.devolucion_id);
  };

  const isClickable = !!(entry.entrega_id || entry.devolucion_id) && !!onOpenDetail;

  return (
    <li
      className={`relative pl-10 ${isClickable ? 'cursor-pointer hover:bg-surface-muted rounded transition-colors' : ''}`}
      onClick={isClickable ? handleRowClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleRowClick(); } : undefined}
    >
      <span className="absolute left-2 top-0.5 w-5 h-5 flex items-center justify-center text-sm bg-surface border rounded-full">
        {MOV_ICONS[entry.tipo] ?? '•'}
      </span>
      <div className="text-sm py-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-medium text-content-primary">{MOV_LABELS[entry.tipo] ?? entry.tipo}</span>
          <span className="text-xs text-content-disabled">{formatDateTime(entry.fecha_movimiento)}</span>
          {isPending && (
            <span className="text-xs font-semibold text-red-600">● Pendiente</span>
          )}
          {entry.entrega_id && onDownloadActa && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDownloadActa(entry.entrega_id!); }}
              className="text-xs text-primary hover:underline"
              aria-label="Descargar acta PDF"
            >
              ↓ Acta
            </button>
          )}
          {entry.devolucion_id && onDownloadActaDevolucion && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDownloadActaDevolucion(entry.devolucion_id!); }}
              className="text-xs text-primary hover:underline"
              aria-label="Descargar acta devolución PDF"
            >
              ↓ Acta
            </button>
          )}
        </div>
        <div className="text-xs text-content-muted mt-0.5 space-y-0.5">
          {(entry.ubicacion_origen_nombre || entry.ubicacion_destino_nombre) && (
            <p>{entry.ubicacion_origen_nombre ?? '?'} → {entry.ubicacion_destino_nombre ?? '?'}</p>
          )}
          {entry.notas && <p className="italic">{entry.notas}</p>}
          {entry.responsable_email && <p>Por: {entry.responsable_email}</p>}
        </div>
      </div>
    </li>
  );
};

export const CustodiaRow: React.FC<{ custodia: ActivoCustodiaEntry }> = ({ custodia }) => (
  <tr className="border-b last:border-b-0">
    <td className="py-2 px-2 font-medium">{custodia.custodio_nombres} {custodia.custodio_apellidos}</td>
    <td className="py-2 px-2">{custodia.custodia_ubicacion_nombre ?? '—'}</td>
    <td className="py-2 px-2">{formatDate(custodia.desde_en)}</td>
    <td className="py-2 px-2">{custodia.hasta_en ? formatDate(custodia.hasta_en) : 'Activa'}</td>
    <td className="py-2 px-2">{custodia.dias_en_custodia ?? 0}d</td>
    <td className={`py-2 px-2 font-medium ${CUSTODIA_ESTADO_CLASSES[custodia.estado] ?? ''}`}>
      {custodia.estado}
    </td>
  </tr>
);

export const InfoField: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div>
    <span className="text-xs text-content-muted block">{label}</span>
    <span className="font-medium text-content-primary">{value || '—'}</span>
  </div>
);
