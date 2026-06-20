import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '../Modal';
import { useGet, useAuth } from '../../hooks';
import { usePdfDownload } from '../../hooks/usePdfDownload';
import { useActivoWorkflows } from '../../hooks/useActivoWorkflows';
import {
  getActivoProfile,
  getEntregaById,
  getEntregasPendientesByArticulo,
  type Articulo,
  type EntregaRow,
  type ActivoProfileResponse,
} from '../../services/apiService';
import ConfirmationModal from '../ConfirmationModal';
import EditarActivoModal from './EditarActivoModal';
import ActaDetailModal from './ActaDetailModal';
import ActivoSubModals from './activo-profile/ActivoSubModals';
import ActivoProfileHeader from './activo-profile/ActivoProfileHeader';
import ActivoAccionesSection from './activo-profile/ActivoAccionesSection';
import ActivoDatosSection from './activo-profile/ActivoDatosSection';
import ActivoTimelineSection from './activo-profile/ActivoTimelineSection';
import ActivoHistorialCustodias from './activo-profile/ActivoHistorialCustodias';
import { formatDate } from './activo-profile/utils';

interface Props {
  activoId: string;
  onClose: () => void;
  onRefresh?: () => void;
}

const ActivoProfileModal: React.FC<Props> = ({ activoId, onClose, onRefresh }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);

  useEffect(() => {
    setImageExpanded(false);
  }, [activoId]);

  const workflows = useActivoWorkflows({
    activoId,
    onClose,
    onRefresh,
    onDeleteDone: () => setShowDeleteConfirm(false),
  });

  const { downloadPdf, isLoading: isPdfLoading } = usePdfDownload();

  const handleDownloadFicha = () => {
    if (!activoId) return;
    const timestamp = new Date().toISOString().slice(0, 10);
    void downloadPdf(
      `/inventario/activos/${activoId}/pdf`,
      `ficha-activo-${activoId.slice(0, 8)}-${timestamp}.pdf`
    );
  };

  const handleDownloadActa = (entregaId: string) => {
    const timestamp = new Date().toISOString().slice(0, 10);
    void downloadPdf(
      `/entregas/${entregaId}/pdf`,
      `acta-entrega-${entregaId.slice(0, 8)}-${timestamp}.pdf`
    );
  };

  const handleDownloadActaDevolucion = (devolucionId: string) => {
    const timestamp = new Date().toISOString().slice(0, 10);
    void downloadPdf(
      `/devoluciones/${devolucionId}/pdf`,
      `acta-devolucion-${devolucionId.slice(0, 8)}-${timestamp}.pdf`
    );
  };

  const { data: profile, isLoading, error } = useQuery<ActivoProfileResponse>({
    queryKey: ['activo-profile', activoId],
    queryFn: () => getActivoProfile(activoId),
    enabled: !!activoId,
  });

  const { data: trabajadores = [] } = useGet<{
    id: string;
    persona_id: string;
    nombres: string;
    apellidos: string;
    rut: string;
    cargo?: string | null;
  }[]>(
    ['activo-profile-modal', 'trabajadores'],
    '/trabajadores',
    undefined,
    { enabled: !!activoId }
  );
  const { data: bodegas = [] } = useGet<{
    id: string;
    nombre: string;
    estado: string;
  }[]>(
    ['activo-profile-modal', 'bodegas'],
    '/bodegas',
    undefined,
    { enabled: !!activoId }
  );
  const { data: proyectos = [] } = useGet<{
    id: string;
    nombre: string;
    estado: string;
  }[]>(
    ['activo-profile-modal', 'proyectos'],
    '/proyectos',
    undefined,
    { enabled: !!activoId }
  );

  const ubicaciones = [
    ...bodegas.map((b) => ({ id: b.id, nombre: b.nombre, tipo: 'bodega' as const })),
    ...proyectos.map((p) => ({ id: p.id, nombre: p.nombre, tipo: 'planta' as const })),
  ];
  const activasBodegas = useMemo(
    () => bodegas.filter((b) => !b.estado || b.estado === 'activo'),
    [bodegas]
  );

  const latestEntregaId = useMemo(() => {
    if (!profile?.timeline?.length) return null;
    const sorted = [...profile.timeline].sort(
      (a, b) => b.fecha_movimiento.localeCompare(a.fecha_movimiento)
    );
    const mostRecent = sorted.find((entry) => entry.entrega_id);
    return mostRecent?.entrega_id ?? null;
  }, [profile?.timeline]);

  const { data: inProgressEntrega } = useQuery<EntregaRow | null>({
    queryKey: ['activo-profile', activoId, 'latest-entrega', latestEntregaId],
    queryFn: async () => {
      if (!latestEntregaId) return null;
      return getEntregaById(latestEntregaId);
    },
    enabled: Boolean(latestEntregaId && !workflows.subModal),
    staleTime: 30_000,
  });

  const hasInProgressEntrega = inProgressEntrega?.estado === 'borrador';
  const inProgressSigned = Boolean(inProgressEntrega?.firmado_en || inProgressEntrega?.firma_imagen_url);

  const { data: pendingEntregas = [] } = useQuery<EntregaRow[]>({
    queryKey: ['activo-profile', activoId, 'pending-entregas'],
    queryFn: () => getEntregasPendientesByArticulo(activoId),
    enabled: !!activoId && !workflows.subModal,
    staleTime: 30_000,
  });

  const pendingEntrega = pendingEntregas[0] ?? null;
  const pendingIsSigned = Boolean(
    pendingEntrega?.firmado_en || pendingEntrega?.firma_imagen_url
  );

  if (workflows.subModal && profile) {
    return (
      <ActivoSubModals
        workflows={workflows}
        profile={profile}
        trabajadores={trabajadores}
        ubicaciones={ubicaciones}
      />
    );
  }

  return (
    <Modal isOpen onClose={onClose} title="Perfil del activo" mobileFullscreen>
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}
      {error && (
        <p className="text-danger text-center py-8">Error al cargar el perfil del activo.</p>
      )}
      {profile && (
        <div className="space-y-6">
          <ActivoProfileHeader
            profile={profile}
            imageExpanded={imageExpanded}
            onToggleImage={() => setImageExpanded((v) => !v)}
            showMoreDetails={showMoreDetails}
            onToggleDetails={() => setShowMoreDetails((prev) => !prev)}
          />

          {hasInProgressEntrega && inProgressEntrega && (
            <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="text-sm font-semibold text-blue-900">Entrega en curso</h4>
              <p className="mt-1 text-xs text-blue-800">
                ID: {inProgressEntrega.id} · Estado: pendiente de confirmación
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    workflows.setDraftEntrega(inProgressEntrega);
                    workflows.setSubModal('firmar-entrega');
                  }}
                  className="inline-flex items-center px-3 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
                >
                  {inProgressSigned ? 'Reintentar confirmación' : 'Reanudar firma'}
                </button>
              </div>
            </section>
          )}

          {pendingEntrega && !hasInProgressEntrega && (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h4 className="text-sm font-semibold text-amber-900">Operación pendiente</h4>
              <p className="mt-1 text-xs text-amber-800">
                Entrega {pendingEntrega.estado === 'pendiente_firma' ? 'pendiente de firma' : 'en borrador'}
                {' '}— ID: {pendingEntrega.id.slice(0, 8)}
                {pendingEntrega.creado_en
                  ? ` · Creada: ${new Date(pendingEntrega.creado_en).toLocaleDateString('es-CL')}`
                  : ''}
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    workflows.setDraftEntrega(pendingEntrega);
                    workflows.setSubModal('firmar-entrega');
                  }}
                  className="inline-flex items-center px-3 py-2 rounded-md bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors"
                >
                  {pendingIsSigned ? 'Confirmar entrega' : 'Reanudar firma'}
                </button>
              </div>
            </section>
          )}

          <ActivoAccionesSection
            profile={profile}
            workflows={workflows}
            isAdmin={isAdmin}
            activasBodegas={activasBodegas}
            isPdfLoading={isPdfLoading}
            onDownloadFicha={handleDownloadFicha}
            onSetShowEdit={() => setShowEdit(true)}
            onSetShowDeleteConfirm={() => setShowDeleteConfirm(true)}
          />

          {profile.custodia_activa && (
            <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Custodia activa</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-content-muted block text-xs">Custodio</span>
                  <span className="font-medium">
                    {profile.custodia_activa.custodio_nombres} {profile.custodia_activa.custodio_apellidos}
                  </span>
                </div>
                <div>
                  <span className="text-content-muted block text-xs">Ubicación</span>
                  <span className="font-medium">{profile.custodia_activa.custodia_ubicacion_nombre ?? '—'}</span>
                </div>
                <div>
                  <span className="text-content-muted block text-xs">Desde</span>
                  <span className="font-medium">{formatDate(profile.custodia_activa.desde_en)}</span>
                </div>
                <div>
                  <span className="text-content-muted block text-xs">Días</span>
                  <span className="font-medium">{profile.custodia_activa.dias_en_custodia ?? 0}d</span>
                </div>
              </div>
            </section>
          )}

          <ActivoDatosSection profile={profile} />

          <ActivoTimelineSection
            entries={profile.timeline}
            onDownloadActa={handleDownloadActa}
            onDownloadActaDevolucion={handleDownloadActaDevolucion}
            onOpenDetail={(type, id) => workflows.setActaDetail({ type, id })}
          />

          {profile.custodias.length > 0 && (
            <ActivoHistorialCustodias custodias={profile.custodias} />
          )}
        </div>
      )}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => workflows.deleteMutation.mutate()}
        title="Eliminar artículo permanentemente"
        message={`¿Eliminar "${profile?.nombre}" (${profile?.codigo})? Se borrarán el registro, su foto, factura, manual y todas las certificaciones. El historial de movimientos y asignaciones también se eliminará. Esta acción es irreversible.`}
        confirmText="Sí, eliminar todo"
        variant="danger"
      />
      {showEdit && profile && (
        <EditarActivoModal
          activo={profile as unknown as Articulo}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            setShowEdit(false);
            void queryClient.invalidateQueries({ queryKey: ['activo-profile', activoId] });
          }}
        />
      )}
      {workflows.actaDetail && (
        <ActaDetailModal
          type={workflows.actaDetail.type}
          id={workflows.actaDetail.id}
          onClose={() => workflows.setActaDetail(null)}
        />
      )}
    </Modal>
  );
};

export default ActivoProfileModal;
