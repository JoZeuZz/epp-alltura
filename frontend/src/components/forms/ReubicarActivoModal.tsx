import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../Modal';
import { useGet } from '../../hooks';
import {
  reubicarActivo,
  type InventoryActivoDetailRow,
} from '../../services/apiService';
import type { Ubicacion } from '../../types/api';

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  const payload = error as { response?: { data?: { message?: string } } };
  return payload?.response?.data?.message || 'No se pudo completar la operación.';
};

interface Props {
  activo: InventoryActivoDetailRow;
  onClose: () => void;
  onSuccess: () => void;
}

const ReubicarActivoModal: React.FC<Props> = ({ activo, onClose, onSuccess }) => {
  const [ubicacionId, setUbicacionId] = useState('');
  const [motivo, setMotivo] = useState('');
  const queryClient = useQueryClient();

  const { data: ubicaciones } = useGet<Ubicacion[]>(
    ['ubicaciones'],
    '/ubicaciones'
  );

  const currentUbicacionId = activo.ubicacion_id ?? activo.custodia_ubicacion_id ?? '';

  const mutation = useMutation({
    mutationFn: () =>
      reubicarActivo(activo.id, {
        ubicacion_destino_id: ubicacionId,
        motivo: motivo.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Activo reubicado correctamente.');
      queryClient.invalidateQueries({ queryKey: ['inventory-activos'] });
      queryClient.invalidateQueries({ queryKey: ['activo-profile'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      onSuccess();
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  const canSubmit = ubicacionId && ubicacionId !== currentUbicacionId;

  return (
    <Modal isOpen onClose={onClose} title={`Reubicar — ${activo.codigo}`}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Ubicación actual: <strong>{activo.ubicacion_nombre ?? activo.custodia_ubicacion_nombre ?? '—'}</strong>
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nueva ubicación <span className="text-red-500">*</span>
          </label>
          <select
            value={ubicacionId}
            onChange={(e) => setUbicacionId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar ubicación...</option>
            {(ubicaciones ?? [])
              .filter((u) => u.activo && u.id !== currentUbicacionId)
              .map((u) => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Describa el motivo de la reubicación..."
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Procesando...' : 'Confirmar reubicación'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ReubicarActivoModal;
