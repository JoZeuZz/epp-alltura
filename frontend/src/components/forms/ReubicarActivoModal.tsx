import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../Modal';
import { useGet } from '../../hooks';
import {
  reubicarActivo,
  type InventoryActivoDetailRow,
} from '../../services/apiService';
import { useFormErrors } from '../../hooks/useFormErrors';
import ErrorAlert from '../ui/ErrorAlert';

interface BodegaOption {
  id: string;
  nombre: string;
  estado: string;
}

interface Props {
  activo: InventoryActivoDetailRow;
  onClose: () => void;
  onSuccess: () => void;
}

const ReubicarActivoModal: React.FC<Props> = ({ activo, onClose, onSuccess }) => {
  const [ubicacionId, setUbicacionId] = useState('');
  const [motivo, setMotivo] = useState('');
  const queryClient = useQueryClient();
  const { error, handleError, clearError } = useFormErrors();

  const { data: bodegas } = useGet<BodegaOption[]>(
    ['bodegas'],
    '/bodegas'
  );

  const currentBodegaId = activo.bodega_actual_id ?? '';

  const mutation = useMutation({
    mutationFn: () =>
      reubicarActivo(activo.id, {
        bodega_destino_id: ubicacionId,
        motivo: motivo.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Activo reubicado correctamente.');
      clearError();
      queryClient.invalidateQueries({ queryKey: ['inventory-activos'] });
      queryClient.invalidateQueries({ queryKey: ['activo-profile'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      onSuccess();
    },
    onError: (err: unknown) => { handleError(err); },
  });

  const canSubmit = ubicacionId && ubicacionId !== currentBodegaId;

  return (
    <Modal isOpen onClose={onClose} title={`Reubicar — ${activo.codigo}`} mobileFullscreen>
      <div className="space-y-4">
        <p className="text-sm text-content-secondary">
          Ubicación actual: <strong>{activo.bodega_nombre ?? activo.proyecto_nombre ?? '—'}</strong>
        </p>

        <div>
          <label className="block text-sm font-medium text-content-secondary mb-1">
            Nueva ubicación <span className="text-danger">*</span>
          </label>
          <select
            value={ubicacionId}
            onChange={(e) => setUbicacionId(e.target.value)}
            className="w-full rounded-md border border-edge-strong px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
          >
            <option value="">Seleccionar ubicación...</option>
            {(bodegas ?? [])
              .filter((b) => b.estado === 'activo' && b.id !== currentBodegaId)
              .map((b) => (
                <option key={b.id} value={b.id}>{b.nombre}</option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-content-secondary mb-1">Motivo (opcional)</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Describa el motivo de la reubicación..."
            rows={2}
            className="w-full rounded-md border border-edge-strong px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
          />
        </div>

        <ErrorAlert message={error} className="mb-3" />

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-content-secondary bg-surface-overlay rounded-md hover:bg-edge"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="px-4 py-2 text-sm text-white bg-primary rounded-md hover:bg-primary-hover disabled:opacity-50"
          >
            {mutation.isPending ? 'Procesando...' : 'Confirmar reubicación'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ReubicarActivoModal;
