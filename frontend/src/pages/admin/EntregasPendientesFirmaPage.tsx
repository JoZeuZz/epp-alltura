import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useGet } from '../../hooks';
import {
  anularEntrega,
  getEntregaById,
  type EntregaRow,
} from '../../services/apiService';
import EntregaFirmaModal from '../../components/forms/EntregaFirmaModal';
import ActaDetailModal from '../../components/forms/ActaDetailModal';
import ConfirmationModal from '../../components/ConfirmationModal';

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  pendiente_firma: 'Pendiente de firma',
};

const ESTADO_COLOR: Record<string, string> = {
  borrador: 'bg-yellow-100 text-yellow-800',
  pendiente_firma: 'bg-blue-100 text-blue-800',
};

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-CL') : '—';

const EntregasPendientesFirmaPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: entregas = [], isLoading, error, refetch } = useGet<EntregaRow[]>(
    ['entregas-pendientes-firma'],
    '/entregas',
    { estado_in: 'borrador,pendiente_firma' }
  );

  const [firmaEntrega, setFirmaEntrega] = useState<EntregaRow | null>(null);
  const [firmaAlreadySigned, setFirmaAlreadySigned] = useState(false);
  const [detalleEntregaId, setDetalleEntregaId] = useState<string | null>(null);
  const [anularTarget, setAnularTarget] = useState<EntregaRow | null>(null);
  const [anularMotivo, setAnularMotivo] = useState('');
  const [isAnulando, setIsAnulando] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleReanudar = async (entrega: EntregaRow) => {
    setLoadingId(entrega.id);
    try {
      const fresh = await getEntregaById(entrega.id);
      const alreadySigned = Boolean(fresh.firmado_en || fresh.firma_imagen_url);
      setFirmaAlreadySigned(alreadySigned);
      setFirmaEntrega(fresh);
    } catch {
      toast.error('No se pudo cargar la entrega.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleFirmaCompleted = () => {
    setFirmaEntrega(null);
    toast.success('Entrega completada correctamente.');
    void refetch();
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const handleAnularConfirm = async () => {
    if (!anularTarget) return;
    setIsAnulando(true);
    try {
      await anularEntrega(anularTarget.id, anularMotivo.trim() || undefined);
      toast.success('Entrega anulada.');
      setAnularTarget(null);
      setAnularMotivo('');
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message ?? e?.message ?? 'Error al anular la entrega.');
    } finally {
      setIsAnulando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="heading-2 text-content-primary">Entregas pendientes de firma</h1>
        <p className="body-small text-content-muted">
          Entregas en borrador o pendiente de firma que aún no han sido confirmadas.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
        </div>
      )}

      {error && (
        <p className="text-danger text-center py-8">
          Error al cargar las entregas pendientes.
        </p>
      )}

      {!isLoading && !error && entregas.length === 0 && (
        <div className="bg-surface rounded-lg p-8 text-center">
          <p className="body-small text-content-muted">
            No hay entregas pendientes de firma.
          </p>
        </div>
      )}

      {!isLoading && !error && entregas.length > 0 && (
        <div className="space-y-3">
          {entregas.map((entrega) => {
            const isSigned = Boolean(entrega.firmado_en || entrega.firma_imagen_url);
            const isItemLoading = loadingId === entrega.id;
            return (
              <div
                key={entrega.id}
                className="bg-surface rounded-lg border border-edge p-4 space-y-3 shadow-card"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-content-primary">
                      {entrega.nombres} {entrega.apellidos}
                      {entrega.rut ? ` — ${entrega.rut}` : ''}
                    </p>
                    <p className="text-xs text-content-muted">
                      Creada: {formatDate(entrega.creado_en)}
                      {entrega.cantidad_items != null
                        ? ` · ${entrega.cantidad_items} ítem${entrega.cantidad_items !== 1 ? 's' : ''}`
                        : ''}
                      {entrega.creador_nombres
                        ? ` · Por: ${entrega.creador_nombres} ${entrega.creador_apellidos ?? ''}`
                        : ''}
                    </p>
                    <p className="text-xs text-content-muted font-mono">
                      ID: {entrega.id.slice(0, 8)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      ESTADO_COLOR[entrega.estado] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {ESTADO_LABEL[entrega.estado] ?? entrega.estado}
                  </span>
                </div>

                {/* Article list */}
                {entrega.detalles && entrega.detalles.length > 0 && (
                  <ul className="text-xs text-content-secondary space-y-0.5 pl-1">
                    {entrega.detalles.slice(0, 5).map((d) => (
                      <li key={d.id} className="flex gap-1">
                        <span className="text-content-muted">·</span>
                        {d.articulo_nombre ?? d.articulo_id.slice(0, 8)}
                        {d.articulo_codigo ? ` (${d.articulo_codigo})` : ''}
                      </li>
                    ))}
                    {entrega.detalles.length > 5 && (
                      <li className="text-content-muted">
                        y {entrega.detalles.length - 5} más…
                      </li>
                    )}
                  </ul>
                )}

                {/* Signature status */}
                {isSigned && (
                  <p className="text-xs text-success font-medium">
                    ✓ Firma registrada — pendiente de confirmación
                  </p>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isItemLoading}
                    onClick={() => void handleReanudar(entrega)}
                    className="px-3 py-1.5 text-xs rounded-md bg-primary-blue text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isItemLoading ? 'Cargando…' : isSigned ? 'Confirmar entrega' : 'Reanudar firma'}
                  </button>
                  <button
                    type="button"
                    disabled={isItemLoading}
                    onClick={() => { setAnularTarget(entrega); setAnularMotivo(''); }}
                    className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-content-secondary hover:bg-red-50 hover:text-danger hover:border-danger font-semibold disabled:opacity-50 transition-colors"
                  >
                    Anular
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetalleEntregaId(entrega.id)}
                    className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-content-secondary hover:bg-gray-50 font-semibold transition-colors"
                  >
                    Ver detalle
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Firma modal */}
      {firmaEntrega && (
        <EntregaFirmaModal
          isOpen
          onClose={() => setFirmaEntrega(null)}
          entrega={firmaEntrega}
          alreadySigned={firmaAlreadySigned}
          onCompleted={handleFirmaCompleted}
        />
      )}

      {/* Ver detalle modal */}
      {detalleEntregaId && (
        <ActaDetailModal
          type="entrega"
          id={detalleEntregaId}
          onClose={() => setDetalleEntregaId(null)}
        />
      )}

      {/* Anular confirmation */}
      {anularTarget && (
        <ConfirmationModal
          isOpen
          title="Anular entrega"
          message={
            `¿Anular la entrega de ${anularTarget.nombres} ${anularTarget.apellidos} ` +
            `(ID: ${anularTarget.id.slice(0, 8)})? Esta acción no se puede deshacer.`
          }
          confirmText="Anular"
          variant="danger"
          onConfirm={() => void handleAnularConfirm()}
          onClose={() => setAnularTarget(null)}
          confirmDisabled={isAnulando}
        >
          <div className="mt-3">
            <label
              htmlFor="motivo-anulacion"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Motivo (opcional)
            </label>
            <textarea
              id="motivo-anulacion"
              value={anularMotivo}
              onChange={(e) => setAnularMotivo(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
              placeholder="Describe el motivo de la anulación…"
            />
          </div>
        </ConfirmationModal>
      )}
    </div>
  );
};

export default EntregasPendientesFirmaPage;
