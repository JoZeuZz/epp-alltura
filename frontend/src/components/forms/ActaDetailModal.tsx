import { useQuery } from '@tanstack/react-query';
import Modal from '../Modal';
import { usePdfDownload } from '../../hooks/usePdfDownload';
import {
  getEntregaById,
  getDevolucionById,
  type EntregaRow,
  type DevolucionRow,
} from '../../services/apiService';
import { buildImageUrl } from '../../utils/image';

interface Props {
  type: 'entrega' | 'devolucion';
  id: string;
  onClose: () => void;
}

const ESTADO_CLASSES: Record<string, string> = {
  confirmada: 'bg-green-100 text-green-800 border-green-200',
  borrador: 'bg-red-100 text-red-700 border-red-200',
  pendiente_firma: 'bg-red-100 text-red-700 border-red-200',
  anulada: 'bg-gray-100 text-gray-600 border-gray-200',
  revertida_admin: 'bg-gray-100 text-gray-600 border-gray-200',
};

const ESTADO_LABELS: Record<string, string> = {
  confirmada: 'Confirmada',
  borrador: 'Borrador',
  pendiente_firma: 'Pendiente de firma',
  anulada: 'Anulada',
  revertida_admin: 'Revertida',
};

const CONDICION_LABELS: Record<string, string> = {
  ok: 'OK',
  usado: 'Usado',
  danado: 'Dañado',
  perdido: 'Perdido',
};

const DISPOSICION_LABELS: Record<string, string> = {
  devuelto: 'Devuelto',
  perdido: 'Perdido',
  baja: 'Baja',
  mantencion: 'Mantención',
};

const formatDateTime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function EntregaDetail({ data, onDownload, isPdfLoading }: { data: EntregaRow; onDownload: () => void; isPdfLoading: boolean }) {
  const isPending = ['borrador', 'pendiente_firma'].includes(data.estado);
  const estadoClass = ESTADO_CLASSES[data.estado] ?? 'bg-gray-100 text-gray-600 border-gray-200';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-content-secondary">Entrega</span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${estadoClass}`}>
          {ESTADO_LABELS[data.estado] ?? data.estado}
        </span>
        <span className="text-xs text-content-disabled">{formatDateTime(data.creado_en)}</span>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface-muted rounded-lg p-3 text-sm">
        <div>
          <p className="text-xs font-medium text-content-muted uppercase tracking-wide mb-1">Entregado por</p>
          <p className="font-medium text-content-primary">
            {[data.creador_nombres, data.creador_apellidos].filter(Boolean).join(' ') || '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-content-muted uppercase tracking-wide mb-1">Recibido por</p>
          <p className="font-medium text-content-primary">
            {[data.nombres, data.apellidos].filter(Boolean).join(' ') || '—'}
          </p>
          {data.rut && <p className="text-xs text-content-secondary">RUT: {data.rut}</p>}
        </div>
      </section>

      {data.detalles && data.detalles.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-2">Ítems entregados</h4>
          <ul className="space-y-1">
            {data.detalles.map((d) => (
              <li key={d.id} className="flex items-start gap-2 text-sm bg-surface rounded p-2 border border-edge">
                <div className="flex-1">
                  <span className="font-medium">{d.articulo_nombre ?? '—'}</span>
                  {d.articulo_codigo && <span className="text-xs text-content-secondary ml-2">{d.articulo_codigo}</span>}
                </div>
                <span className="text-xs text-content-secondary">{CONDICION_LABELS[d.condicion_salida ?? ''] ?? d.condicion_salida}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.evidencia_foto_url && (
        <section>
          <h4 className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-2">Foto de evidencia</h4>
          <img
            src={buildImageUrl(data.evidencia_foto_url, 'medium') || data.evidencia_foto_url}
            alt="Evidencia de entrega"
            className="max-h-48 w-full object-contain rounded-lg border border-edge"
            loading="lazy"
            decoding="async"
          />
        </section>
      )}

      <section>
        <h4 className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-2">Firma del receptor</h4>
        {data.firma_imagen_url ? (
          <>
            <img
              src={buildImageUrl(data.firma_imagen_url, 'medium') || data.firma_imagen_url}
              alt="Firma del receptor"
              className="max-h-24 object-contain rounded border border-edge"
              loading="lazy"
              decoding="async"
            />
            <p className="text-xs text-content-secondary mt-1">Firmado el {formatDateTime(data.firmado_en)}</p>
          </>
        ) : (
          <p className="text-sm text-content-disabled italic">Sin firma registrada</p>
        )}
      </section>

      {isPending && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          Esta entrega está pendiente de completarse. Usa el perfil del activo para retomar el flujo.
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-edge">
        <button
          type="button"
          onClick={onDownload}
          disabled={isPdfLoading}
          className="btn-secondary text-sm"
        >
          {isPdfLoading ? '…' : '↓ Descargar Acta PDF'}
        </button>
      </div>
    </div>
  );
}

function DevolucionDetail({ data, onDownload, isPdfLoading }: { data: DevolucionRow; onDownload: () => void; isPdfLoading: boolean }) {
  const isPending = ['borrador', 'pendiente_firma'].includes(data.estado);
  const estadoClass = ESTADO_CLASSES[data.estado] ?? 'bg-gray-100 text-gray-600 border-gray-200';

  let acceptanceText: string | null = null;
  if (data.texto_aceptacion) {
    try {
      const parsed = JSON.parse(data.texto_aceptacion);
      acceptanceText = parsed.general ?? data.texto_aceptacion;
    } catch {
      acceptanceText = data.texto_aceptacion;
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-content-secondary">Devolución</span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${estadoClass}`}>
          {ESTADO_LABELS[data.estado] ?? data.estado}
        </span>
        <span className="text-xs text-content-disabled">{formatDateTime(data.creado_en)}</span>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface-muted rounded-lg p-3 text-sm">
        <div>
          <p className="text-xs font-medium text-content-muted uppercase tracking-wide mb-1">Devuelto por</p>
          <p className="font-medium text-content-primary">
            {[data.nombres, data.apellidos].filter(Boolean).join(' ') || '—'}
          </p>
          {data.rut && <p className="text-xs text-content-secondary">RUT: {data.rut}</p>}
        </div>
        <div>
          <p className="text-xs font-medium text-content-muted uppercase tracking-wide mb-1">Recibido por</p>
          <p className="font-medium text-content-primary">
            {[data.receptor_nombres, data.receptor_apellidos].filter(Boolean).join(' ') || '—'}
          </p>
        </div>
      </section>

      {data.detalles && data.detalles.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-2">Ítems devueltos</h4>
          <ul className="space-y-1">
            {data.detalles.map((d) => (
              <li key={d.id} className="flex items-start gap-2 text-sm bg-surface rounded p-2 border border-edge">
                <div className="flex-1">
                  <span className="font-medium">{d.articulo_nombre ?? '—'}</span>
                  {d.articulo_codigo && <span className="text-xs text-content-secondary ml-2">{d.articulo_codigo}</span>}
                </div>
                <div className="text-right text-xs text-content-secondary space-y-0.5">
                  <div>{CONDICION_LABELS[d.condicion_entrada ?? ''] ?? d.condicion_entrada}</div>
                  <div>{DISPOSICION_LABELS[d.disposicion ?? ''] ?? d.disposicion}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.evidencia_foto_url && (
        <section>
          <h4 className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-2">Foto de evidencia</h4>
          <img
            src={buildImageUrl(data.evidencia_foto_url, 'medium') || data.evidencia_foto_url}
            alt="Evidencia de devolución"
            className="max-h-48 w-full object-contain rounded-lg border border-edge"
            loading="lazy"
            decoding="async"
          />
        </section>
      )}

      <section>
        <h4 className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-2">Firma del trabajador</h4>
        {data.firma_imagen_url ? (
          <>
            <img
              src={buildImageUrl(data.firma_imagen_url, 'medium') || data.firma_imagen_url}
              alt="Firma del trabajador"
              className="max-h-24 object-contain rounded border border-edge"
              loading="lazy"
              decoding="async"
            />
            <p className="text-xs text-content-secondary mt-1">Firmado el {formatDateTime(data.firmado_en)}</p>
          </>
        ) : (
          <p className="text-sm text-content-disabled italic">Sin firma registrada</p>
        )}
      </section>

      {acceptanceText && (
        <section>
          <h4 className="text-xs font-semibold text-content-muted uppercase tracking-wide mb-2">Texto de aceptación</h4>
          <p className="text-sm text-content-secondary bg-surface-muted rounded p-3 border border-edge whitespace-pre-wrap">{acceptanceText}</p>
        </section>
      )}

      {isPending && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          Esta devolución está pendiente de completarse. Usa el perfil del activo para retomar el flujo.
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-edge">
        <button
          type="button"
          onClick={onDownload}
          disabled={isPdfLoading}
          className="btn-secondary text-sm"
        >
          {isPdfLoading ? '…' : '↓ Descargar Acta PDF'}
        </button>
      </div>
    </div>
  );
}

export default function ActaDetailModal({ type, id, onClose }: Props) {
  const { downloadPdf, isLoading: isPdfLoading } = usePdfDownload();

  const { data: entregaData, isLoading: entregaLoading, error: entregaError } = useQuery({
    queryKey: ['acta-entrega', id],
    queryFn: () => getEntregaById(id),
    enabled: type === 'entrega',
  });

  const { data: devolucionData, isLoading: devolucionLoading, error: devolucionError } = useQuery({
    queryKey: ['acta-devolucion', id],
    queryFn: () => getDevolucionById(id),
    enabled: type === 'devolucion',
  });

  const isLoading = type === 'entrega' ? entregaLoading : devolucionLoading;
  const hasError = type === 'entrega' ? !!entregaError : !!devolucionError;

  const handleDownload = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    if (type === 'entrega') {
      void downloadPdf(`/entregas/${id}/pdf`, `acta-entrega-${id.slice(0, 8)}-${timestamp}.pdf`);
    } else {
      void downloadPdf(`/devoluciones/${id}/pdf`, `acta-devolucion-${id.slice(0, 8)}-${timestamp}.pdf`);
    }
  };

  const title = type === 'entrega' ? 'Acta de Entrega' : 'Acta de Devolución';

  return (
    <Modal isOpen onClose={onClose} title={title}>
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}
      {hasError && (
        <p className="text-danger text-center py-8">Error al cargar el acta. Intenta de nuevo.</p>
      )}
      {type === 'entrega' && entregaData && (
        <EntregaDetail data={entregaData} onDownload={handleDownload} isPdfLoading={isPdfLoading} />
      )}
      {type === 'devolucion' && devolucionData && (
        <DevolucionDetail data={devolucionData} onDownload={handleDownload} isPdfLoading={isPdfLoading} />
      )}
    </Modal>
  );
}
