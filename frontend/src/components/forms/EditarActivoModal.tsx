import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../Modal';
import {
  editarActivo,
  type InventoryActivoDetailRow,
} from '../../services/apiService';

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

const EditarActivoModal: React.FC<Props> = ({ activo, onClose, onSuccess }) => {
  const [valor, setValor] = useState(activo.valor != null ? String(activo.valor) : '');
  const [fechaVencimiento, setFechaVencimiento] = useState(
    activo.fecha_vencimiento ? activo.fecha_vencimiento.slice(0, 10) : ''
  );
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      const payload: { valor?: number | null; fecha_vencimiento?: string | null } = {};
      const newValor = valor.trim() === '' ? null : parseInt(valor, 10);
      const newFecha = fechaVencimiento.trim() === '' ? null : fechaVencimiento;

      // Solo enviar campos que cambiaron
      const oldValor = activo.valor ?? null;
      const oldFecha = activo.fecha_vencimiento ? activo.fecha_vencimiento.slice(0, 10) : null;

      if (newValor !== oldValor) payload.valor = newValor;
      if (newFecha !== oldFecha) payload.fecha_vencimiento = newFecha;

      if (Object.keys(payload).length === 0) {
        return Promise.reject(new Error('No hay cambios para guardar.'));
      }

      return editarActivo(activo.id, payload);
    },
    onSuccess: () => {
      toast.success('Activo actualizado correctamente.');
      queryClient.invalidateQueries({ queryKey: ['inventory-activos'] });
      queryClient.invalidateQueries({ queryKey: ['activo-profile'] });
      onSuccess();
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  return (
    <Modal isOpen onClose={onClose} title={`Editar — ${activo.codigo}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">Valor ($)</label>
            <input
              type="number"
              step="1"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Ej: 150000"
              className="w-full rounded-md border border-edge-strong px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">Fecha vencimiento</label>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="w-full rounded-md border border-edge-strong px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

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
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm text-white bg-primary rounded-md hover:bg-primary-hover disabled:opacity-50"
          >
            {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EditarActivoModal;
