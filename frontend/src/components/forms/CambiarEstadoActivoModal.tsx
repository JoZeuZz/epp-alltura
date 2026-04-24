import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../Modal';
import { useGet } from '../../hooks';
import {
  cambiarEstadoActivo,
  type InventoryActivoDetailRow,
} from '../../services/apiService';
import type { Ubicacion } from '../../types/api';

const TRANSICIONES: Record<string, { estado: string; label: string; descripcion: string; variant: 'info' | 'warning' | 'danger'; requiereUbicacion: boolean }[]> = {
  en_stock: [
    { estado: 'mantencion', label: 'Enviar a mantención', descripcion: 'El activo será retirado del stock para reparación o calibración.', variant: 'warning', requiereUbicacion: false },
    { estado: 'dado_de_baja', label: 'Dar de baja', descripcion: 'El activo será retirado permanentemente del sistema.', variant: 'danger', requiereUbicacion: false },
    { estado: 'perdido', label: 'Reportar pérdida', descripcion: 'El activo será marcado como perdido.', variant: 'danger', requiereUbicacion: false },
  ],
  mantencion: [
    { estado: 'en_stock', label: 'Retorno de mantención', descripcion: 'El activo regresa al stock disponible.', variant: 'info', requiereUbicacion: true },
  ],
  perdido: [
    { estado: 'en_stock', label: 'Recuperar activo', descripcion: 'El activo fue encontrado y regresa al stock.', variant: 'info', requiereUbicacion: true },
  ],
  dado_de_baja: [
    { estado: 'en_stock', label: 'Reincorporar activo', descripcion: 'El activo será reintegrado al stock disponible.', variant: 'info', requiereUbicacion: true },
  ],
};

const VARIANT_CLASSES: Record<string, string> = {
  info: 'border-blue-200 bg-blue-50 hover:bg-blue-100',
  warning: 'border-amber-200 bg-amber-50 hover:bg-amber-100',
  danger: 'border-red-200 bg-red-50 hover:bg-red-100',
};

const VARIANT_RING: Record<string, string> = {
  info: 'ring-blue-500',
  warning: 'ring-amber-500',
  danger: 'ring-red-500',
};

interface Props {
  activo: InventoryActivoDetailRow;
  onClose: () => void;
  onSuccess: () => void;
}

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  const payload = error as { response?: { data?: { message?: string } } };
  return payload?.response?.data?.message || 'No se pudo completar la operación.';
};

const CambiarEstadoActivoModal: React.FC<Props> = ({ activo, onClose, onSuccess }) => {
  const transiciones = TRANSICIONES[activo.estado ?? ''] ?? [];
  const [selectedEstado, setSelectedEstado] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [ubicacionId, setUbicacionId] = useState('');
  const queryClient = useQueryClient();

  const selectedTransicion = transiciones.find((t) => t.estado === selectedEstado);

  const { data: ubicaciones } = useGet<Ubicacion[]>(
    ['ubicaciones'],
    '/ubicaciones',
    undefined,
    { enabled: selectedTransicion?.requiereUbicacion ?? false }
  );

  const mutation = useMutation({
    mutationFn: () =>
      cambiarEstadoActivo(activo.id, {
        nuevo_estado: selectedEstado!,
        motivo,
        ubicacion_destino_id: selectedTransicion?.requiereUbicacion ? ubicacionId : undefined,
      }),
    onSuccess: () => {
      toast.success('Estado del activo actualizado correctamente.');
      queryClient.invalidateQueries({ queryKey: ['inventory-activos'] });
      queryClient.invalidateQueries({ queryKey: ['activo-profile'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory'] });
      onSuccess();
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  const canSubmit =
    selectedEstado &&
    motivo.trim().length >= 3 &&
    (!selectedTransicion?.requiereUbicacion || ubicacionId);

  return (
    <Modal isOpen onClose={onClose} title={`Cambiar estado — ${activo.codigo}`}>
      <div className="space-y-4">
        {transiciones.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No hay transiciones disponibles para el estado actual ({activo.estado}).
            {activo.estado === 'asignado' && ' Debe procesarse mediante devolución.'}
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Nuevo estado</label>
              {transiciones.map((t) => (
                <button
                  key={t.estado}
                  type="button"
                  onClick={() => setSelectedEstado(t.estado)}
                  className={`w-full text-left border rounded-lg p-3 transition-all ${
                    VARIANT_CLASSES[t.variant]
                  } ${selectedEstado === t.estado ? `ring-2 ${VARIANT_RING[t.variant]}` : ''}`}
                >
                  <p className="text-sm font-medium text-gray-900">{t.label}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{t.descripcion}</p>
                </button>
              ))}
            </div>

            {selectedTransicion?.requiereUbicacion && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ubicación destino <span className="text-red-500">*</span>
                </label>
                <select
                  value={ubicacionId}
                  onChange={(e) => setUbicacionId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar ubicación...</option>
                  {(ubicaciones ?? []).filter((u) => u.activo).map((u) => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo <span className="text-red-500">*</span>
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Describa el motivo del cambio de estado (mínimo 3 caracteres)..."
                rows={3}
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
                {mutation.isPending ? 'Procesando...' : 'Confirmar cambio'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default CambiarEstadoActivoModal;
