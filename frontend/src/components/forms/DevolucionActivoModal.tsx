import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../Modal';
import { useGet } from '../../hooks';
import { devolverActivo, type DevolucionRow } from '../../services/apiService';

interface BodegaOption {
  id: string;
  nombre: string;
  estado?: string;
}

interface Props {
  /** ID del activo a devolver */
  activoId: string;
  /** UUID del artículo al que pertenece el activo */
  articuloId: string;
  trabajadorId: string;
  trabajadorNombre: string;
  onClose: () => void;
  /** Llamado cuando el borrador queda creado para abrir la pantalla de firma */
  onDraftCreated: (devolucion: DevolucionRow) => void;
}

const CONDICION_LABELS = {
  ok: 'Bueno',
  usado: 'Usado',
  danado: 'Dañado',
  perdido: 'Perdido',
} as const;

const DISPOSICION_LABELS = {
  devuelto: 'Devuelto al stock',
  perdido: 'Perdido',
  baja: 'Dar de baja',
  mantencion: 'Enviar a mantención',
} as const;

const DevolucionActivoModal: React.FC<Props> = ({
  activoId,
  articuloId,
  trabajadorId,
  trabajadorNombre,
  onClose,
  onDraftCreated,
}) => {
  const [ubicacionId, setUbicacionId] = useState('');
  const [condicion, setCondicion] = useState<'ok' | 'usado' | 'danado' | 'perdido'>('ok');
  const [disposicion, setDisposicion] = useState<'devuelto' | 'perdido' | 'baja' | 'mantencion'>('devuelto');
  const [notas, setNotas] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: bodegas = [] } = useGet<BodegaOption[]>(['bodegas'], '/bodegas');
  const activasBodegas = (bodegas as BodegaOption[]).filter((b) => !b.estado || b.estado === 'activo');

  const mutation = useMutation({
    mutationFn: () =>
      devolverActivo(activoId, {
        trabajador_id: trabajadorId,
        ubicacion_recepcion_id: ubicacionId,
        notas: notas.trim() || null,
        detalles: [
          {
            articulo_id: articuloId,
            activo_ids: [activoId],
            condicion_entrada: condicion,
            disposicion,
            notas: notas.trim() || null,
          },
        ],
      }),
    onSuccess: (devolucion) => {
      toast.success('Borrador de devolución creado. Falta registrar la firma.');
      onDraftCreated(devolucion);
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: { message?: string } }; message?: string };
      const msg = e?.response?.data?.message ?? e?.message ?? 'No se pudo crear la devolución.';
      setFormError(msg);
    },
  });

  const handleSubmit = () => {
    setFormError(null);
    if (!ubicacionId) {
      setFormError('Selecciona una ubicación de recepción.');
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal isOpen onClose={onClose} title="Registrar devolución">
      <div className="space-y-4">
        {/* Trabajador locked */}
        <div>
          <p className="text-xs uppercase tracking-wide text-content-muted mb-1">Trabajador</p>
          <p className="text-sm font-medium text-content-primary bg-surface-muted border border-edge rounded-md px-3 py-2">
            {trabajadorNombre}
          </p>
        </div>

        {/* Ubicación recepción */}
        <div>
          <label className="block text-xs uppercase tracking-wide text-content-muted mb-1">
            Ubicación de recepción <span className="text-danger">*</span>
          </label>
          <select
            value={ubicacionId}
            onChange={(e) => setUbicacionId(e.target.value)}
            className="w-full border border-edge-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Seleccionar ubicación...</option>
            {activasBodegas.map((b) => (
              <option key={b.id} value={b.id}>{b.nombre}</option>
            ))}
          </select>
        </div>

        {/* Condición de entrada */}
        <div>
          <label className="block text-xs uppercase tracking-wide text-content-muted mb-1">
            Condición de entrada <span className="text-danger">*</span>
          </label>
          <select
            value={condicion}
            onChange={(e) => setCondicion(e.target.value as typeof condicion)}
            className="w-full border border-edge-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {Object.entries(CONDICION_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Disposición */}
        <div>
          <label className="block text-xs uppercase tracking-wide text-content-muted mb-1">
            Disposición <span className="text-danger">*</span>
          </label>
          <select
            value={disposicion}
            onChange={(e) => setDisposicion(e.target.value as typeof disposicion)}
            className="w-full border border-edge-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {Object.entries(DISPOSICION_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-xs uppercase tracking-wide text-content-muted mb-1">Notas</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="Observaciones opcionales..."
            className="w-full border border-edge-strong rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {formError && (
          <div className="p-3 bg-danger-subtle border border-danger-border rounded-lg text-sm text-danger-text" role="alert">
            {formError}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="flex-1 py-2 px-4 border border-edge-strong rounded-lg text-sm text-content-secondary hover:bg-surface-muted transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="flex-1 py-2 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mutation.isPending ? 'Creando...' : 'Continuar a firma →'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DevolucionActivoModal;
