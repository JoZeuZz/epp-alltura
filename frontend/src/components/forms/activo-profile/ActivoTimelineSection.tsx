import React from 'react';
import { TimelineItem } from './shared';
import type { ActivoTimelineEntry } from '../../../services/apiService';

interface Props {
  entries: ActivoTimelineEntry[];
  onDownloadActa: (entregaId: string) => void;
  onDownloadActaDevolucion: (devolucionId: string) => void;
  onOpenDetail: (type: 'entrega' | 'devolucion', id: string) => void;
}

const ActivoTimelineSection: React.FC<Props> = ({
  entries,
  onDownloadActa,
  onDownloadActaDevolucion,
  onOpenDetail,
}) => (
  <section data-tour="activo-modal-historial">
    <h4 className="text-sm font-semibold text-content-secondary mb-3">Timeline de movimientos</h4>
    {entries.length === 0 ? (
      <p className="text-sm text-content-muted italic">Sin movimientos registrados.</p>
    ) : (
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-edge" />
        <ul className="space-y-3">
          {entries.map((entry) => (
            <TimelineItem
              key={entry.id}
              entry={entry}
              onDownloadActa={onDownloadActa}
              onDownloadActaDevolucion={onDownloadActaDevolucion}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </ul>
      </div>
    )}
  </section>
);

export default ActivoTimelineSection;
