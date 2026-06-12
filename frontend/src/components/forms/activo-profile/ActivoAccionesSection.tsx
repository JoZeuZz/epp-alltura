import React from 'react';
import { ActionButton } from './shared';
import type { ActivoProfileResponse } from '../../../services/apiService';
import type { ActivoWorkflows } from '../../../hooks/useActivoWorkflows';

interface BodegaItem {
  id: string;
  nombre: string;
  estado: string;
}

interface Props {
  profile: ActivoProfileResponse;
  workflows: ActivoWorkflows;
  isAdmin: boolean;
  activasBodegas: BodegaItem[];
  isPdfLoading: boolean;
  onDownloadFicha: () => void;
  onSetShowEdit: () => void;
  onSetShowDeleteConfirm: () => void;
}

const ActivoAccionesSection: React.FC<Props> = ({
  profile,
  workflows,
  isAdmin,
  activasBodegas,
  isPdfLoading,
  onDownloadFicha,
  onSetShowEdit,
  onSetShowDeleteConfirm,
}) => {
  const {
    setSubModal,
    estadoMotivo,
    setEstadoMotivo,
    recuperarBodegaId,
    setRecuperarBodegaId,
    estadoMutation,
    deleteMutation,
    handleCambiarEstado,
  } = workflows;

  const canEntregar = profile.estado === 'en_stock';
  const canDevolver = profile.custodia_activa != null;
  const isEnStock = profile.estado === 'en_stock';
  const isAsignado = profile.estado === 'asignado';
  const isRecuperable =
    profile.estado === 'mantencion' ||
    profile.estado === 'dado_de_baja' ||
    profile.estado === 'perdido';

  return (
    <section className="space-y-3" aria-label="Acciones del activo" data-tour="activo-modal-acciones">
      <h4 className="text-xs font-semibold text-content-muted uppercase tracking-wide">Acciones</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div data-tour="activo-modal-btn-entregar">
          <ActionButton
            label="Entregar"
            tone="primary"
            disabled={!canEntregar}
            reason={!canEntregar ? 'Solo se puede entregar cuando el artículo está en stock.' : undefined}
            onClick={() => setSubModal('entregar')}
          />
        </div>
        <ActionButton
          label="Devolver"
          tone="primary"
          disabled={!canDevolver}
          reason={!canDevolver ? 'La devolución aplica cuando existe custodia activa.' : undefined}
          onClick={() => setSubModal('devolver')}
        />
      </div>

      <div className="rounded-lg border border-edge bg-surface p-3 space-y-3" data-tour="activo-modal-estado">
        <h5 className="text-xs font-semibold text-content-muted uppercase tracking-wide">
          Cambio de estado
        </h5>

        {isAsignado && (
          <p className="text-xs text-content-disabled">
            Para un artículo asignado el estado se resuelve registrando una devolución.
          </p>
        )}

        {(isEnStock || isRecuperable) && (
          <>
            <div>
              <label htmlFor="articulo-estado-motivo" className="block text-xs font-medium text-content-secondary mb-1">
                Motivo (opcional)
              </label>
              <input
                id="articulo-estado-motivo"
                type="text"
                value={estadoMotivo}
                onChange={(e) => setEstadoMotivo(e.target.value)}
                placeholder="Ej: revisión preventiva, daño detectado…"
                className="w-full border border-edge-strong rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {isEnStock && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <ActionButton
                  label="Enviar a mantención"
                  disabled={estadoMutation.isPending}
                  onClick={() => handleCambiarEstado('mantencion')}
                />
                <ActionButton
                  label="Dar de baja"
                  disabled={estadoMutation.isPending}
                  onClick={() => handleCambiarEstado('dado_de_baja')}
                />
                <ActionButton
                  label="Marcar como perdido"
                  disabled={estadoMutation.isPending}
                  onClick={() => handleCambiarEstado('perdido')}
                />
              </div>
            )}

            {isRecuperable && (
              <div className="space-y-2">
                <div>
                  <label htmlFor="articulo-recuperar-bodega" className="block text-xs font-medium text-content-secondary mb-1">
                    Bodega de destino <span className="text-danger">*</span>
                  </label>
                  <select
                    id="articulo-recuperar-bodega"
                    value={recuperarBodegaId}
                    onChange={(e) => setRecuperarBodegaId(e.target.value)}
                    className="w-full border border-edge-strong rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="">— Seleccionar bodega —</option>
                    {activasBodegas.map((b) => (
                      <option key={b.id} value={b.id}>{b.nombre}</option>
                    ))}
                  </select>
                </div>
                <ActionButton
                  label="Recuperar a stock"
                  tone="primary"
                  disabled={estadoMutation.isPending || !recuperarBodegaId}
                  onClick={() => handleCambiarEstado('en_stock')}
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="pt-1 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDownloadFicha}
          disabled={isPdfLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-edge text-sm text-content-secondary bg-surface hover:bg-surface-muted transition-colors disabled:opacity-50"
          aria-label="Descargar ficha PDF"
        >
          {isPdfLoading ? '…' : '↓'} Descargar ficha PDF
        </button>
        <button
          type="button"
          onClick={onSetShowEdit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary-blue text-sm text-primary-blue bg-surface hover:bg-surface-muted transition-colors"
          aria-label="Editar artículo"
        >
          ✎ Editar artículo
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={onSetShowDeleteConfirm}
            disabled={deleteMutation.isPending}
            aria-label={`Eliminar artículo ${profile.nombre}`}
            className="px-3 py-1.5 text-xs text-danger border border-danger rounded-md hover:bg-danger hover:text-white transition-colors disabled:opacity-50"
          >
            Eliminar artículo
          </button>
        )}
      </div>
    </section>
  );
};

export default ActivoAccionesSection;
