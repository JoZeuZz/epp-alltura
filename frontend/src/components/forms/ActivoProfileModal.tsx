import React, { useEffect, useId, useMemo, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../Modal';
import { extractApiError } from '../../lib/apiError';
import EntregaCreateModal from './EntregaCreateModal';
import EntregaFirmaModal from './EntregaFirmaModal';
import DevolucionActivoModal from './DevolucionActivoModal';
import DevolucionFirmaModal from './DevolucionFirmaModal';
import EditarActivoModal from './EditarActivoModal';
import ActaDetailModal from './ActaDetailModal';
import { useGet, useAuth } from '../../hooks';
import { usePdfDownload } from '../../hooks/usePdfDownload';
import {
  createEntrega,
  cambiarEstadoArticulo,
  deleteArticulo,
  getActivoProfile,
  getEntregaById,
  type Articulo,
  type ActivoCustodiaEntry,
  type ActivoTimelineEntry,
  type EntregaRow,
  type DevolucionRow,
  type ActivoProfileResponse,
  type EntregaCreatePayload,
  type CambiarEstadoArticuloPayload,
  type ArticuloCertificacion,
} from '../../services/apiService';
import ConfirmationModal from '../ConfirmationModal';
import { formatCLP } from '../../utils/currency';
import { getToolStatusBadgeClasses, getToolStatusLabel } from '../../utils/toolPresentation';
import { buildImageUrl, DEFAULT_IMAGE_PLACEHOLDER } from '../../utils/image';
import AlertaDevolucionBadge from '../AlertaDevolucionBadge';

type SubModal = 'entregar' | 'firmar-entrega' | 'devolver' | 'firmar-devolucion' | null;

type EstadoTarget = CambiarEstadoArticuloPayload['nuevo_estado'];

const MOV_ICONS: Record<string, string> = {
  entrada: '↓',
  salida: '↑',
  entrega: '→',
  devolucion: '←',
  ajuste: '≡',
  baja: '×',
  mantencion: '↺',
};

const MOV_LABELS: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  entrega: 'Entrega',
  devolucion: 'Devolución',
  ajuste: 'Ajuste',
  baja: 'Baja',
  mantencion: 'Mantención',
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDateTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface Props {
  activoId: string;
  onClose: () => void;
  onRefresh?: () => void;
}

interface ArticuloImageToggleProps {
  src: string;
  alt: string;
  expanded: boolean;
  onToggle: () => void;
}

const ArticuloImageToggle: React.FC<ArticuloImageToggleProps> = ({ src, alt, expanded, onToggle }) => {
  if (expanded) {
    return (
      <div
        className="relative cursor-pointer w-full"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); }}
      >
        <img
          src={src}
          alt={alt}
          className="w-full max-h-72 object-contain rounded-lg border border-edge transition-all duration-200"
          loading="lazy"
          decoding="async"
          onError={(e) => { e.currentTarget.src = DEFAULT_IMAGE_PLACEHOLDER; }}
        />
        <div className="absolute top-2 right-2 bg-black/40 rounded p-0.5">
          <Minimize2 className="w-5 h-5 text-white drop-shadow" />
        </div>
      </div>
    );
  }
  return (
    <div
      className="relative group cursor-pointer flex-shrink-0"
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); }}
    >
      <img
        src={src}
        alt={alt}
        className="w-24 h-24 object-cover rounded-lg border border-edge"
        loading="lazy"
        decoding="async"
        onError={(e) => { e.currentTarget.src = DEFAULT_IMAGE_PLACEHOLDER; }}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity duration-150">
        <Maximize2 className="w-5 h-5 text-white drop-shadow" />
      </div>
    </div>
  );
};

const ActivoProfileModal: React.FC<Props> = ({ activoId, onClose, onRefresh }) => {
  const queryClient = useQueryClient();
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [subModal, setSubModal] = useState<SubModal>(null);
  const [draftEntrega, setDraftEntrega] = useState<EntregaRow | null>(null);
  const [draftDevolucion, setDraftDevolucion] = useState<DevolucionRow | null>(null);
  const [estadoMotivo, setEstadoMotivo] = useState('');
  const [recuperarBodegaId, setRecuperarBodegaId] = useState('');
  const detailsPanelId = useId();

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [actaDetail, setActaDetail] = useState<{ type: 'entrega' | 'devolucion'; id: string } | null>(null);

  useEffect(() => {
    setImageExpanded(false);
  }, [activoId]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteArticulo(activoId),
    onSuccess: () => {
      toast.success('Artículo eliminado permanentemente.');
      queryClient.invalidateQueries({ queryKey: ['articulos'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-activos'] });
      setShowDeleteConfirm(false);
      onClose();
    },
    onError: (err: unknown) => {
      const { message } = extractApiError(err);
      toast.error(message);
    },
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
    if (!profile?.timeline?.length) {
      return null;
    }

    const sorted = [...profile.timeline].sort(
      (a, b) => b.fecha_movimiento.localeCompare(a.fecha_movimiento)
    );
    const mostRecent = sorted.find((entry) => entry.entrega_id);
    return mostRecent?.entrega_id ?? null;
  }, [profile?.timeline]);

  const { data: inProgressEntrega } = useQuery<EntregaRow | null>({
    queryKey: ['activo-profile', activoId, 'latest-entrega', latestEntregaId],
    queryFn: async () => {
      if (!latestEntregaId) {
        return null;
      }
      return getEntregaById(latestEntregaId);
    },
    enabled: Boolean(latestEntregaId && !subModal),
    staleTime: 30_000,
  });

  const hasInProgressEntrega = inProgressEntrega?.estado === 'borrador';
  const inProgressSigned = Boolean(inProgressEntrega?.firmado_en || inProgressEntrega?.firma_imagen_url);

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

  if (subModal && profile) {
    if (subModal === 'entregar') {
      const code = profile.codigo;
      const name = profile.nombre;
      const value = profile.valor != null ? formatCLP(profile.valor) : '—';
      return (
        <EntregaCreateModal
          isOpen
          onClose={handleCloseEntregaFlow}
          onSubmit={async (payload, foto) => {
            await entregaMutation.mutateAsync({ payload, foto });
          }}
          isSubmitting={entregaMutation.isPending}
          trabajadores={trabajadores}
          ubicaciones={ubicaciones}
          initialArticuloId={profile.id}
          lockArticuloSelection
          initialArticuloCode={code}
          initialArticuloName={name}
          initialArticuloValue={value}
        />
      );
    }
    if (subModal === 'firmar-entrega' && draftEntrega) {
      return (
        <EntregaFirmaModal
          isOpen
          onClose={handleCloseEntregaFlow}
          entrega={draftEntrega}
          onCompleted={handleSubmodalSuccess}
        />
      );
    }
    if (subModal === 'devolver' && profile.custodia_activa) {
      const custodio = profile.custodia_activa;
      const nombre = `${custodio.custodio_nombres} ${custodio.custodio_apellidos}`;
      return (
        <DevolucionActivoModal
          articuloId={profile.id}
          custodiaId={custodio.id}
          trabajadorId={custodio.trabajador_id}
          trabajadorNombre={nombre}
          onClose={() => { setDraftDevolucion(null); setSubModal(null); }}
          onDraftCreated={(draft) => {
            setDraftDevolucion(draft);
            setSubModal('firmar-devolucion');
          }}
        />
      );
    }
    if (subModal === 'firmar-devolucion' && draftDevolucion) {
      return (
        <DevolucionFirmaModal
          isOpen
          onClose={() => { setDraftDevolucion(null); setSubModal(null); }}
          devolucion={draftDevolucion}
          onCompleted={handleSubmodalSuccess}
        />
      );
    }
  }

  const canEntregar = profile ? profile.estado === 'en_stock' : false;
  const canDevolver = profile ? profile.custodia_activa != null : false;
  const isEnStock = profile?.estado === 'en_stock';
  const isAsignado = profile?.estado === 'asignado';
  const isRecuperable =
    profile?.estado === 'mantencion' ||
    profile?.estado === 'dado_de_baja' ||
    profile?.estado === 'perdido';

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
          {profile.alerta_devolucion && (
            <div className="mx-4 mt-3 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
              <AlertaDevolucionBadge alerta={true} />
              <span className="text-sm text-red-700">
                Este artículo está asignado a un proyecto finalizado y pendiente de devolución.
              </span>
            </div>
          )}
          {/* Header */}
          <div className="space-y-4" data-tour="activo-modal-header">
            {/* Mobile */}
            <div className="sm:hidden space-y-3">
              <ArticuloImageToggle
                src={buildImageUrl(profile.foto_url, 'medium') || DEFAULT_IMAGE_PLACEHOLDER}
                alt={`${profile.nombre} — ${profile.codigo}`}
                expanded={imageExpanded}
                onToggle={() => setImageExpanded((v) => !v)}
              />
              <div className="grid grid-cols-3 gap-2">
                <MobileSummaryItem label="Estado">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getToolStatusBadgeClasses(profile.estado)}`}>
                    {getToolStatusLabel(profile.estado)}
                  </span>
                </MobileSummaryItem>
                <MobileSummaryItem label="Responsable">
                  <span className="font-medium text-content-primary">
                    {profile.custodia_activa
                      ? `${profile.custodia_activa.custodio_nombres} ${profile.custodia_activa.custodio_apellidos}`
                      : 'Sin custodia'}
                  </span>
                </MobileSummaryItem>
                <MobileSummaryItem label="Valor">
                  <span className="font-medium text-content-primary">
                    {profile.valor != null ? formatCLP(profile.valor) : '—'}
                  </span>
                </MobileSummaryItem>
              </div>

              <button
                type="button"
                aria-expanded={showMoreDetails}
                aria-controls={detailsPanelId}
                onClick={() => setShowMoreDetails((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
              >
                {showMoreDetails ? 'Ocultar detalles' : 'Ver más detalles'}
              </button>
              <div id={detailsPanelId} className={`${showMoreDetails ? 'block' : 'hidden'} bg-surface-muted border border-edge rounded-lg p-3 text-sm text-content-secondary space-y-1`}>
                <p>Artículo: <strong>{profile.nombre}</strong></p>
                <p>Fecha relevante: <strong>{formatDate(profile.custodia_activa?.desde_en ?? profile.creado_en)}</strong></p>
                <p>Ubicación: <strong>{profile.custodia_activa?.custodia_ubicacion_nombre ?? profile.bodega_nombre ?? profile.proyecto_nombre ?? '—'}</strong></p>
                <p>Código: <strong>{profile.codigo}</strong></p>
                {profile.nro_serie && <p>Serie: <strong>{profile.nro_serie}</strong></p>}
              </div>
            </div>

            {/* Desktop */}
            <div className={`hidden sm:flex gap-4 ${imageExpanded ? 'flex-col' : 'flex-row sm:items-start'}`}>
              <ArticuloImageToggle
                src={buildImageUrl(profile.foto_url, 'medium') || DEFAULT_IMAGE_PLACEHOLDER}
                alt={`${profile.nombre} — ${profile.codigo}`}
                expanded={imageExpanded}
                onToggle={() => setImageExpanded((v) => !v)}
              />
              <div className="flex-1 space-y-1">
                <h3 className="text-lg font-bold text-content-primary">{profile.nombre}</h3>
                <div className="flex flex-wrap gap-2 text-sm text-content-secondary">
                  <span>Código: <strong>{profile.codigo}</strong></span>
                  {profile.nro_serie && <span>Serie: <strong>{profile.nro_serie}</strong></span>}
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getToolStatusBadgeClasses(profile.estado)}`}>
                    {getToolStatusLabel(profile.estado)}
                  </span>
                  {(profile.bodega_nombre || profile.proyecto_nombre) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-surface-overlay text-content-secondary">
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {profile.bodega_nombre ?? profile.proyecto_nombre}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-center">
                <StatBox label="Entregas" value={profile.estadisticas.total_entregas} />
                <StatBox label="Devoluciones" value={profile.estadisticas.total_devoluciones} />
                <StatBox label="Días custodia" value={profile.estadisticas.dias_total_custodia} />
              </div>
            </div>
          </div>

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
                    setDraftEntrega(inProgressEntrega);
                    setSubModal('firmar-entrega');
                  }}
                  className="inline-flex items-center px-3 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
                >
                  {inProgressSigned ? 'Reintentar confirmación' : 'Reanudar firma'}
                </button>
              </div>
            </section>
          )}

          {/* Acciones */}
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

            {/* Cambio de estado del artículo físico */}
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
                onClick={handleDownloadFicha}
                disabled={isPdfLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-edge text-sm text-content-secondary bg-surface hover:bg-surface-muted transition-colors disabled:opacity-50"
                aria-label="Descargar ficha PDF"
              >
                {isPdfLoading ? '…' : '↓'} Descargar ficha PDF
              </button>
              <button
                type="button"
                onClick={() => setShowEdit(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary-blue text-sm text-primary-blue bg-surface hover:bg-surface-muted transition-colors"
                aria-label="Editar artículo"
              >
                ✎ Editar artículo
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteMutation.isPending}
                  aria-label={`Eliminar artículo ${profile?.nombre ?? ''}`}
                  className="px-3 py-1.5 text-xs text-danger border border-danger rounded-md hover:bg-danger hover:text-white transition-colors disabled:opacity-50"
                >
                  Eliminar artículo
                </button>
              )}
            </div>
          </section>

          {/* Custodia activa */}
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

          {/* Datos del artículo */}
          <section className="bg-surface-muted rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-content-secondary">Datos del artículo</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
              <InfoField label="Registrado"   value={formatDate(profile.creado_en)} />
              <InfoField label="Fecha compra" value={formatDate(profile.fecha_compra)} />
              <InfoField label="Proveedor"    value={profile.proveedor_nombre} />
              <InfoField label="Valor"        value={profile.valor != null ? formatCLP(profile.valor) : null} />
              <InfoField label="Vencimiento"  value={profile.fecha_vencimiento ? formatDate(profile.fecha_vencimiento) : null} />
              <InfoField label="Tipo"         value={profile.tipo?.toUpperCase()} />
              {profile.marca  && <InfoField label="Marca"  value={profile.marca} />}
              {profile.modelo && <InfoField label="Modelo" value={profile.modelo} />}
            </div>

            {profile.factura_url && (
              <div>
                <span className="text-xs font-medium text-content-muted uppercase tracking-wide">Factura</span>
                <div className="mt-1">
                  <a href={profile.factura_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    ↓ Descargar factura
                  </a>
                </div>
              </div>
            )}

            {profile.manual_url && (
              <div>
                <span className="text-xs font-medium text-content-muted uppercase tracking-wide">Manual / Ficha técnica</span>
                <div className="mt-1">
                  <a href={profile.manual_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    ↓ Ver manual
                  </a>
                </div>
              </div>
            )}

            {profile.certificaciones && profile.certificaciones.length > 0 && (
              <div>
                <span className="text-xs font-medium text-content-muted uppercase tracking-wide">
                  Certificaciones ({profile.certificaciones.length})
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(profile.certificaciones as ArticuloCertificacion[]).map(cert => (
                    <a key={cert.id} href={cert.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-surface border border-edge text-primary hover:bg-surface-muted transition-colors">
                      ↓ {cert.nombre || 'Certificación'}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Timeline */}
          <section data-tour="activo-modal-historial">
            <h4 className="text-sm font-semibold text-content-secondary mb-3">Timeline de movimientos</h4>
            {profile.timeline.length === 0 ? (
              <p className="text-sm text-content-muted italic">Sin movimientos registrados.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-edge" />
                <ul className="space-y-3">
                  {profile.timeline.map((entry) => (
                    <TimelineItem
                      key={entry.id}
                      entry={entry}
                      onDownloadActa={handleDownloadActa}
                      onDownloadActaDevolucion={handleDownloadActaDevolucion}
                      onOpenDetail={(type, id) => setActaDetail({ type, id })}
                    />
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Historial de custodias */}
          {profile.custodias.length > 0 && (
            <section>
              <h4 className="text-sm font-semibold text-content-secondary mb-2">Historial de custodias</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-xs text-content-muted uppercase border-b">
                      <th className="text-left py-2 px-2">Custodio</th>
                      <th className="text-left py-2 px-2">Ubicación</th>
                      <th className="text-left py-2 px-2">Desde</th>
                      <th className="text-left py-2 px-2">Hasta</th>
                      <th className="text-left py-2 px-2">Días</th>
                      <th className="text-left py-2 px-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.custodias.map((c) => (
                      <CustodiaRow key={c.id} custodia={c} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Eliminar artículo permanentemente"
        message={`¿Eliminar "${profile?.nombre}" (${profile?.codigo})? Se borrarán el registro, su foto, factura, manual y todas las certificaciones en el bucket. El historial de movimientos y asignaciones también se eliminará en cascada. Esta acción es irreversible.`}
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
      {actaDetail && (
        <ActaDetailModal
          type={actaDetail.type}
          id={actaDetail.id}
          onClose={() => setActaDetail(null)}
        />
      )}
    </Modal>
  );
};

const StatBox: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="bg-surface border rounded-lg px-3 py-2 min-w-[70px]">
    <p className="text-xl font-bold text-content-primary">{value}</p>
    <p className="text-[10px] text-content-muted uppercase tracking-wide">{label}</p>
  </div>
);

const MobileSummaryItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="bg-surface border rounded-lg p-2">
    <p className="text-[10px] text-content-muted uppercase tracking-wide mb-1">{label}</p>
    <div className="text-xs">{children}</div>
  </div>
);

const ActionButton: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  reason?: string;
  tone?: 'primary' | 'neutral';
}> = ({ label, onClick, disabled = false, reason, tone = 'neutral' }) => (
  <div className="space-y-0.5">
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 rounded-md border text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:bg-surface-muted disabled:text-content-disabled disabled:cursor-not-allowed ${
        tone === 'primary'
          ? 'border-primary bg-primary text-white hover:bg-primary-hover disabled:border-edge disabled:bg-surface-muted'
          : 'border-edge text-content-secondary bg-surface hover:bg-surface-muted'
      }`}
    >
      {label}
    </button>
    {disabled && reason && <p className="text-xs text-content-disabled leading-tight">{reason}</p>}
  </div>
);

const TimelineItem: React.FC<{
  entry: ActivoTimelineEntry;
  onDownloadActa?: (entregaId: string) => void;
  onDownloadActaDevolucion?: (devolucionId: string) => void;
  onOpenDetail?: (type: 'entrega' | 'devolucion', id: string) => void;
}> = ({ entry, onDownloadActa, onDownloadActaDevolucion, onOpenDetail }) => {
  const isPending =
    (entry.estado_entrega != null && ['borrador', 'pendiente_firma'].includes(entry.estado_entrega)) ||
    (entry.estado_devolucion != null && ['borrador', 'pendiente_firma'].includes(entry.estado_devolucion));

  const handleRowClick = () => {
    if (entry.entrega_id && onOpenDetail) onOpenDetail('entrega', entry.entrega_id);
    else if (entry.devolucion_id && onOpenDetail) onOpenDetail('devolucion', entry.devolucion_id);
  };

  const isClickable = !!(entry.entrega_id || entry.devolucion_id) && !!onOpenDetail;

  return (
    <li
      className={`relative pl-10 ${isClickable ? 'cursor-pointer hover:bg-surface-muted rounded transition-colors' : ''}`}
      onClick={isClickable ? handleRowClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleRowClick(); } : undefined}
    >
      <span className="absolute left-2 top-0.5 w-5 h-5 flex items-center justify-center text-sm bg-surface border rounded-full">
        {MOV_ICONS[entry.tipo] ?? '•'}
      </span>
      <div className="text-sm py-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-medium text-content-primary">{MOV_LABELS[entry.tipo] ?? entry.tipo}</span>
          <span className="text-xs text-content-disabled">{formatDateTime(entry.fecha_movimiento)}</span>
          {isPending && (
            <span className="text-xs font-semibold text-red-600">● Pendiente</span>
          )}
          {entry.entrega_id && onDownloadActa && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDownloadActa(entry.entrega_id!); }}
              className="text-xs text-primary hover:underline"
              aria-label="Descargar acta PDF"
            >
              ↓ Acta
            </button>
          )}
          {entry.devolucion_id && onDownloadActaDevolucion && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDownloadActaDevolucion(entry.devolucion_id!); }}
              className="text-xs text-primary hover:underline"
              aria-label="Descargar acta devolución PDF"
            >
              ↓ Acta
            </button>
          )}
        </div>
        <div className="text-xs text-content-muted mt-0.5 space-y-0.5">
          {(entry.ubicacion_origen_nombre || entry.ubicacion_destino_nombre) && (
            <p>{entry.ubicacion_origen_nombre ?? '?'} → {entry.ubicacion_destino_nombre ?? '?'}</p>
          )}
          {entry.notas && <p className="italic">{entry.notas}</p>}
          {entry.responsable_email && <p>Por: {entry.responsable_email}</p>}
        </div>
      </div>
    </li>
  );
};

const CUSTODIA_ESTADO_CLASSES: Record<string, string> = {
  activa: 'text-primary',
  devuelta: 'text-success-text',
  perdida: 'text-danger-text',
  baja: 'text-content-secondary',
  mantencion: 'text-amber-600',
};

const CustodiaRow: React.FC<{ custodia: ActivoCustodiaEntry }> = ({ custodia }) => (
  <tr className="border-b last:border-b-0">
    <td className="py-2 px-2 font-medium">{custodia.custodio_nombres} {custodia.custodio_apellidos}</td>
    <td className="py-2 px-2">{custodia.custodia_ubicacion_nombre ?? '—'}</td>
    <td className="py-2 px-2">{formatDate(custodia.desde_en)}</td>
    <td className="py-2 px-2">{custodia.hasta_en ? formatDate(custodia.hasta_en) : 'Activa'}</td>
    <td className="py-2 px-2">{custodia.dias_en_custodia ?? 0}d</td>
    <td className={`py-2 px-2 font-medium ${CUSTODIA_ESTADO_CLASSES[custodia.estado] ?? ''}`}>
      {custodia.estado}
    </td>
  </tr>
);

const InfoField: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div>
    <span className="text-xs text-content-muted block">{label}</span>
    <span className="font-medium text-content-primary">{value || '—'}</span>
  </div>
);

export default ActivoProfileModal;
