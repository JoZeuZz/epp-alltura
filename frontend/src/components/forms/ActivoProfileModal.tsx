import React, { useId, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../Modal';
import CambiarEstadoActivoModal from './CambiarEstadoActivoModal';
import ReubicarActivoModal from './ReubicarActivoModal';
import EditarActivoModal from './EditarActivoModal';
import EntregaCreateModal from './EntregaCreateModal';
import EntregaFirmaModal from './EntregaFirmaModal';
import DevolucionActivoModal from './DevolucionActivoModal';
import DevolucionFirmaModal from './DevolucionFirmaModal';
import { useGet } from '../../hooks';
import {
  entregarActivo,
  getActivoProfile,
  getEntregaById,
  type ActivoCustodiaEntry,
  type ActivoTimelineEntry,
  type EntregaRow,
  type DevolucionRow,
  type ActivoProfileResponse,
  type EntregarActivoPayload,
  type InventoryActivoDetailRow,
} from '../../services/apiService';
import { formatCLP } from '../../utils/currency';
import { getToolStatusBadgeClasses, getToolStatusLabel } from '../../utils/toolPresentation';

type SubModal = 'entregar' | 'firmar-entrega' | 'devolver' | 'firmar-devolucion' | 'estado' | 'reubicar' | 'editar' | null;

const MOV_ICONS: Record<string, string> = {
  entrada: '📥',
  salida: '📤',
  entrega: '🤝',
  devolucion: '↩️',
  ajuste: '📋',
  baja: '🗑️',
  mantencion: '🔧',
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

const toActivoRow = (profile: ActivoProfileResponse): InventoryActivoDetailRow => ({
  id: profile.id,
  codigo: profile.codigo,
  nro_serie: profile.nro_serie ?? null,
  articulo_id: profile.articulo_id,
  articulo_nombre: profile.articulo_nombre,
  ubicacion_id: profile.ubicacion_actual_id ?? null,
  ubicacion_nombre: profile.ubicacion_nombre ?? null,
  estado: profile.estado,
  valor: profile.valor ?? null,
  fecha_vencimiento: profile.fecha_vencimiento ?? null,
  custodia_id: profile.custodia_activa?.id ?? null,
  custodia_estado: profile.custodia_activa?.estado ?? null,
  custodio_trabajador_id: profile.custodia_activa?.trabajador_id ?? null,
  custodio_nombres: profile.custodia_activa?.custodio_nombres ?? null,
  custodio_apellidos: profile.custodia_activa?.custodio_apellidos ?? null,
  custodia_ubicacion_id: profile.custodia_activa?.ubicacion_destino_id ?? null,
  custodia_ubicacion_nombre: profile.custodia_activa?.custodia_ubicacion_nombre ?? null,
  fecha_devolucion_esperada: null,
  semaforo_devolucion: null,
});

const ActivoProfileModal: React.FC<Props> = ({ activoId, onClose, onRefresh }) => {
  const queryClient = useQueryClient();
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [subModal, setSubModal] = useState<SubModal>(null);
  const [draftEntrega, setDraftEntrega] = useState<EntregaRow | null>(null);
  const [draftDevolucion, setDraftDevolucion] = useState<DevolucionRow | null>(null);
  const detailsPanelId = useId();

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
  const { data: articulos = [] } = useGet<{
    id: string;
    nombre: string;
    tracking_mode: 'serial' | 'lote';
  }[]>(
    ['activo-profile-modal', 'articulos'],
    '/articulos',
    undefined,
    { enabled: !!activoId }
  );
  const activoRow = useMemo(
    () => (profile ? toActivoRow(profile) : null),
    [profile]
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
    mutationFn: (payload: EntregarActivoPayload) => entregarActivo(activoId, payload),
    onSuccess: (created) => {
      setDraftEntrega(created);
      setSubModal('firmar-entrega');
      toast.success('Entrega creada. Continúa con la firma del trabajador para completar el flujo.');
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message ?? e?.message ?? 'No se pudo crear la entrega.');
    },
  });

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

  if (subModal && profile && activoRow) {
    if (subModal === 'entregar') {
      const code = profile.codigo;
      const name = profile.articulo_nombre;
      const value = profile.valor != null ? formatCLP(profile.valor) : '—';
      return (
        <EntregaCreateModal
          isOpen
          onClose={handleCloseEntregaFlow}
          onSubmit={async (payload) => {
            await entregaMutation.mutateAsync(payload);
          }}
          isSubmitting={entregaMutation.isPending}
          trabajadores={trabajadores}
          ubicaciones={ubicaciones}
          articulos={articulos}
          templates={[]}
          initialActivoId={profile.id}
          initialArticuloId={profile.articulo_id}
          lockActivoSelection
          initialActivoCode={code}
          initialActivoName={name}
          initialActivoValue={value}
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
          activoId={profile.id}
          articuloId={profile.articulo_id}
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
    if (subModal === 'estado') {
      return (
        <CambiarEstadoActivoModal
          activo={activoRow}
          onClose={() => setSubModal(null)}
          onSuccess={handleSubmodalSuccess}
        />
      );
    }
    if (subModal === 'reubicar') {
      return (
        <ReubicarActivoModal
          activo={activoRow}
          onClose={() => setSubModal(null)}
          onSuccess={handleSubmodalSuccess}
        />
      );
    }
    if (subModal === 'editar') {
      return (
        <EditarActivoModal
          activo={activoRow}
          onClose={() => setSubModal(null)}
          onSuccess={handleSubmodalSuccess}
        />
      );
    }
  }

  const canEntregar = profile ? profile.estado !== 'asignado' : false;
  const canDevolver = profile ? profile.custodia_activa != null : false;
  const canCambiarEstado = profile ? profile.estado !== 'asignado' : false;
  const canReubicar = profile ? profile.estado === 'en_stock' : false;

  return (
    <Modal isOpen onClose={onClose} title="Perfil del activo">
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
          {/* Header */}
          <div className="space-y-4">
            {/* Mobile */}
            <div className="sm:hidden space-y-3">
              {profile.foto_url && (
                <img
                  src={profile.foto_url}
                  alt={profile.articulo_nombre}
                  className="w-24 h-24 object-cover rounded-lg border border-edge"
                />
              )}
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
                    {profile.compra?.precio_unitario != null ? formatCLP(profile.compra.precio_unitario) : '—'}
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
                <p>Artículo: <strong>{profile.articulo_nombre}</strong></p>
                <p>Fecha relevante: <strong>{formatDate(profile.custodia_activa?.desde_en ?? profile.compra?.fecha_compra)}</strong></p>
                <p>Ubicación: <strong>{profile.custodia_activa?.custodia_ubicacion_nombre ?? profile.ubicacion_nombre ?? '—'}</strong></p>
                <p>Código: <strong>{profile.codigo}</strong></p>
                {profile.nro_serie && <p>Serie: <strong>{profile.nro_serie}</strong></p>}
              </div>
            </div>

            {/* Desktop */}
            <div className="hidden sm:flex flex-col sm:flex-row sm:items-start gap-4">
              {profile.foto_url && (
                <img
                  src={profile.foto_url}
                  alt={profile.articulo_nombre}
                  className="w-24 h-24 object-cover rounded-lg border border-edge flex-shrink-0"
                />
              )}
              <div className="flex-1 space-y-1">
                <h3 className="text-lg font-bold text-content-primary">{profile.articulo_nombre}</h3>
                <div className="flex flex-wrap gap-2 text-sm text-content-secondary">
                  <span>Código: <strong>{profile.codigo}</strong></span>
                  {profile.nro_serie && <span>Serie: <strong>{profile.nro_serie}</strong></span>}
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getToolStatusBadgeClasses(profile.estado)}`}>
                    {getToolStatusLabel(profile.estado)}
                  </span>
                  {profile.ubicacion_nombre && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-surface-overlay text-content-secondary">
                      📍 {profile.ubicacion_nombre}
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
          <section className="space-y-2" aria-label="Acciones del activo">
            <h4 className="text-xs font-semibold text-content-muted uppercase tracking-wide">Acciones</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <ActionButton
                label="Entregar"
                tone="primary"
                disabled={!canEntregar}
                reason={!canEntregar ? 'Solo se puede entregar cuando el activo está disponible.' : undefined}
                onClick={() => setSubModal('entregar')}
              />
              <ActionButton
                label="Devolver"
                tone="primary"
                disabled={!canDevolver}
                reason={!canDevolver ? 'La devolución aplica cuando existe custodia activa.' : undefined}
                onClick={() => setSubModal('devolver')}
              />
              <ActionButton
                label="Cambiar estado"
                disabled={!canCambiarEstado}
                reason={!canCambiarEstado ? 'Para activos asignados el estado se resuelve desde devolución.' : undefined}
                onClick={() => setSubModal('estado')}
              />
              <ActionButton
                label="Reubicar"
                disabled={!canReubicar}
                reason={!canReubicar ? 'La reubicación directa solo aplica para activos en stock.' : undefined}
                onClick={() => setSubModal('reubicar')}
              />
              <ActionButton
                label="Editar"
                onClick={() => setSubModal('editar')}
              />
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

          {/* Compra de origen */}
          {profile.compra && (
            <section className="bg-surface-muted rounded-lg p-4">
              <h4 className="text-sm font-semibold text-content-secondary mb-1">Origen de compra</h4>
              <div className="text-sm text-content-secondary flex flex-wrap gap-4">
                <span>Fecha: {formatDate(profile.compra.fecha_compra)}</span>
                {profile.compra.proveedor_nombre && (
                  <span>Proveedor: {profile.compra.proveedor_nombre}</span>
                )}
                {profile.compra.precio_unitario != null && (
                  <span>Valor unitario: {formatCLP(profile.compra.precio_unitario)}</span>
                )}
              </div>
            </section>
          )}

          {/* Timeline */}
          <section>
            <h4 className="text-sm font-semibold text-content-secondary mb-3">Timeline de movimientos</h4>
            {profile.timeline.length === 0 ? (
              <p className="text-sm text-content-muted italic">Sin movimientos registrados.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-edge" />
                <ul className="space-y-3">
                  {profile.timeline.map((entry) => (
                    <TimelineItem key={entry.id} entry={entry} />
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

const TimelineItem: React.FC<{ entry: ActivoTimelineEntry }> = ({ entry }) => (
  <li className="relative pl-10">
    <span className="absolute left-2 top-0.5 w-5 h-5 flex items-center justify-center text-sm bg-surface border rounded-full">
      {MOV_ICONS[entry.tipo] ?? '•'}
    </span>
    <div className="text-sm">
      <div className="flex items-baseline gap-2">
        <span className="font-medium text-content-primary">{MOV_LABELS[entry.tipo] ?? entry.tipo}</span>
        <span className="text-xs text-content-disabled">{formatDateTime(entry.fecha_movimiento)}</span>
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

export default ActivoProfileModal;
