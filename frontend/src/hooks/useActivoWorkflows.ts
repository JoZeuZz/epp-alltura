import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { extractApiError } from '../lib/apiError';
import {
  createEntrega,
  cambiarEstadoArticulo,
  deleteArticulo,
  type EntregaRow,
  type DevolucionRow,
  type EntregaCreatePayload,
  type CambiarEstadoArticuloPayload,
} from '../services/apiService';

export type SubModal = 'entregar' | 'firmar-entrega' | 'devolver' | 'firmar-devolucion' | null;
type EstadoTarget = CambiarEstadoArticuloPayload['nuevo_estado'];

interface UseActivoWorkflowsProps {
  activoId: string;
  onClose: () => void;
  onRefresh?: () => void;
  onDeleteDone?: () => void;
}

export function useActivoWorkflows({ activoId, onClose, onRefresh, onDeleteDone }: UseActivoWorkflowsProps) {
  const queryClient = useQueryClient();

  const [subModal, setSubModal] = useState<SubModal>(null);
  const [draftEntrega, setDraftEntrega] = useState<EntregaRow | null>(null);
  const [draftDevolucion, setDraftDevolucion] = useState<DevolucionRow | null>(null);
  const [estadoMotivo, setEstadoMotivo] = useState('');
  const [recuperarBodegaId, setRecuperarBodegaId] = useState('');
  const [actaDetail, setActaDetail] = useState<{ type: 'entrega' | 'devolucion'; id: string } | null>(null);

  const deleteMutation = useMutation({
    mutationFn: () => deleteArticulo(activoId),
    onSuccess: () => {
      toast.success('Artículo eliminado permanentemente.');
      queryClient.invalidateQueries({ queryKey: ['articulos'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-activos'] });
      onDeleteDone?.();
      onClose();
    },
    onError: (err: unknown) => {
      const { message } = extractApiError(err);
      toast.error(message);
    },
  });

  const entregaMutation = useMutation({
    mutationFn: ({ payload, foto }: { payload: EntregaCreatePayload; foto?: File }) =>
      createEntrega(payload, foto),
    onSuccess: (created) => {
      setDraftEntrega(created);
      setSubModal('firmar-entrega');
      toast.success('Entrega creada. Continúa con la firma del trabajador para completar el flujo.');
    },
    onError: (err: unknown) => {
      const { message } = extractApiError(err);
      toast.error(message);
    },
  });

  const estadoMutation = useMutation({
    mutationFn: (payload: CambiarEstadoArticuloPayload) =>
      cambiarEstadoArticulo(activoId, payload),
    onSuccess: () => {
      toast.success('Estado del artículo actualizado.');
      setEstadoMotivo('');
      setRecuperarBodegaId('');
      void queryClient.invalidateQueries({ queryKey: ['articulos'] });
      void queryClient.invalidateQueries({ queryKey: ['activo-profile', activoId] });
      onRefresh?.();
    },
    onError: (err: unknown) => {
      const { message } = extractApiError(err);
      toast.error(message);
    },
  });

  const handleCambiarEstado = (nuevoEstado: EstadoTarget) => {
    const payload: CambiarEstadoArticuloPayload = { nuevo_estado: nuevoEstado };
    if (estadoMotivo.trim()) {
      payload.motivo = estadoMotivo.trim();
    }
    if (nuevoEstado === 'en_stock') {
      if (!recuperarBodegaId) {
        toast.error('Selecciona la bodega de destino para recuperar el artículo a stock.');
        return;
      }
      payload.bodega_destino_id = recuperarBodegaId;
    }
    estadoMutation.mutate(payload);
  };

  const handleSubmodalSuccess = () => {
    setDraftEntrega(null);
    setDraftDevolucion(null);
    void queryClient.invalidateQueries({ queryKey: ['activo-profile', activoId] });
    onRefresh?.();
    setSubModal(null);
  };

  const handleCloseEntregaFlow = () => {
    setDraftEntrega(null);
    setSubModal(null);
  };

  return {
    subModal, setSubModal,
    draftEntrega, setDraftEntrega,
    draftDevolucion, setDraftDevolucion,
    estadoMotivo, setEstadoMotivo,
    recuperarBodegaId, setRecuperarBodegaId,
    actaDetail, setActaDetail,
    deleteMutation,
    entregaMutation,
    estadoMutation,
    handleCambiarEstado,
    handleSubmodalSuccess,
    handleCloseEntregaFlow,
  };
}

export type ActivoWorkflows = ReturnType<typeof useActivoWorkflows>;
