import React, { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal from '../Modal';
import {
  getActivoProfile,
  type ActivoCustodiaEntry,
  type ActivoProfileResponse,
  type ActivoTimelineEntry,
} from '../../services/apiService';
import { formatCLP } from '../../utils/currency';
import { getToolStatusBadgeClasses, getToolStatusLabel } from '../../utils/toolPresentation';

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
  onCambiarEstado?: () => void;
  onReubicar?: () => void;
  onEditar?: () => void;
}

const ActivoProfileModal: React.FC<Props> = ({ activoId, onClose, onCambiarEstado, onReubicar, onEditar }) => {
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const detailsPanelId = useId();
  const { data: profile, isLoading, error } = useQuery<ActivoProfileResponse>({
    queryKey: ['activo-profile', activoId],
    queryFn: () => getActivoProfile(activoId),
    enabled: !!activoId,
  });

  return (
    <Modal isOpen onClose={onClose} title="Perfil del activo">
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}
      {error && (
        <p className="text-red-500 text-center py-8">Error al cargar el perfil del activo.</p>
      )}
      {profile && (
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="sm:hidden space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <MobileSummaryItem label="Estado">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getToolStatusBadgeClasses(profile.estado)}`}>
                    {getToolStatusLabel(profile.estado)}
                  </span>
                </MobileSummaryItem>
                <MobileSummaryItem label="Responsable">
                  <span className="font-medium text-gray-900">
                    {profile.custodia_activa
                      ? `${profile.custodia_activa.custodio_nombres} ${profile.custodia_activa.custodio_apellidos}`
                      : 'Sin custodia'}
                  </span>
                </MobileSummaryItem>
                <MobileSummaryItem label="Valor">
                  <span className="font-medium text-gray-900">
                    {profile.compra?.precio_unitario != null ? formatCLP(profile.compra.precio_unitario) : '—'}
                  </span>
                </MobileSummaryItem>
              </div>
              <ActionButtons
                estado={profile.estado}
                onCambiarEstado={onCambiarEstado}
                onReubicar={onReubicar}
                onEditar={onEditar}
              />

              <button
                type="button"
                aria-expanded={showMoreDetails}
                aria-controls={detailsPanelId}
                onClick={() => setShowMoreDetails((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
              >
                {showMoreDetails ? 'Ocultar detalles' : 'Ver más detalles'}
              </button>
              <div id={detailsPanelId} className={`${showMoreDetails ? 'block' : 'hidden'} bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 space-y-1`}>
                <p>
                  Artículo: <strong>{profile.articulo_nombre}</strong>
                </p>
                <p>
                  Fecha relevante:{' '}
                  <strong>
                    {formatDate(profile.custodia_activa?.desde_en ?? profile.compra?.fecha_compra)}
                  </strong>
                </p>
                <p>
                  Ubicación extendida:{' '}
                  <strong>
                    {profile.custodia_activa?.custodia_ubicacion_nombre ?? profile.ubicacion_nombre ?? '—'}
                  </strong>
                </p>
                <p>
                  Código: <strong>{profile.codigo}</strong>
                </p>
                {profile.nro_serie && (
                  <p>
                    Serie: <strong>{profile.nro_serie}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="hidden sm:flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1 space-y-1">
                <h3 className="text-lg font-bold text-gray-900">{profile.articulo_nombre}</h3>
                <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                  <span>Código: <strong>{profile.codigo}</strong></span>
                  {profile.nro_serie && <span>Serie: <strong>{profile.nro_serie}</strong></span>}
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getToolStatusBadgeClasses(profile.estado)}`}>
                    {getToolStatusLabel(profile.estado)}
                  </span>
                  {profile.ubicacion_nombre && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                      📍 {profile.ubicacion_nombre}
                    </span>
                  )}
                </div>
                <ActionButtons
                  estado={profile.estado}
                  onCambiarEstado={onCambiarEstado}
                  onReubicar={onReubicar}
                  onEditar={onEditar}
                />
              </div>
              <div className="flex flex-wrap gap-3 text-center">
                <StatBox label="Entregas" value={profile.estadisticas.total_entregas} />
                <StatBox label="Devoluciones" value={profile.estadisticas.total_devoluciones} />
                <StatBox label="Días custodia" value={profile.estadisticas.dias_total_custodia} />
              </div>
            </div>
          </div>

          {/* Custodia activa */}
          {profile.custodia_activa && (
            <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Custodia activa</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-gray-500 block text-xs">Custodio</span>
                  <span className="font-medium">
                    {profile.custodia_activa.custodio_nombres} {profile.custodia_activa.custodio_apellidos}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Ubicación</span>
                  <span className="font-medium">{profile.custodia_activa.custodia_ubicacion_nombre ?? '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Desde</span>
                  <span className="font-medium">{formatDate(profile.custodia_activa.desde_en)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Días</span>
                  <span className="font-medium">{profile.custodia_activa.dias_en_custodia ?? 0}d</span>
                </div>
              </div>
            </section>
          )}

          {/* Compra de origen */}
          {profile.compra && (
            <section className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Origen de compra</h4>
              <div className="text-sm text-gray-600 flex flex-wrap gap-4">
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
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Timeline de movimientos</h4>
            {profile.timeline.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Sin movimientos registrados.</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
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
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Historial de custodias</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase border-b">
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
  <div className="bg-white border rounded-lg px-3 py-2 min-w-[70px]">
    <p className="text-xl font-bold text-gray-900">{value}</p>
    <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
  </div>
);

const MobileSummaryItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="bg-white border rounded-lg p-2">
    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">{label}</p>
    <div className="text-xs">{children}</div>
  </div>
);

const ActionButtons: React.FC<{
  estado: string;
  onCambiarEstado?: () => void;
  onReubicar?: () => void;
  onEditar?: () => void;
}> = ({ estado, onCambiarEstado, onReubicar, onEditar }) => {
  if (!onCambiarEstado && !onReubicar && !onEditar) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {onCambiarEstado && estado !== 'asignado' && (
        <button
          onClick={onCambiarEstado}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
        >
          Cambiar estado
        </button>
      )}
      {onReubicar && estado === 'en_stock' && (
        <button
          onClick={onReubicar}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
        >
          Reubicar
        </button>
      )}
      {onEditar && (
        <button
          onClick={onEditar}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
        >
          Editar
        </button>
      )}
    </div>
  );
};

const TimelineItem: React.FC<{ entry: ActivoTimelineEntry }> = ({ entry }) => (
  <li className="relative pl-10">
    <span className="absolute left-2 top-0.5 w-5 h-5 flex items-center justify-center text-sm bg-white border rounded-full">
      {MOV_ICONS[entry.tipo] ?? '•'}
    </span>
    <div className="text-sm">
      <div className="flex items-baseline gap-2">
        <span className="font-medium text-gray-900">{MOV_LABELS[entry.tipo] ?? entry.tipo}</span>
        <span className="text-xs text-gray-400">{formatDateTime(entry.fecha_movimiento)}</span>
      </div>
      <div className="text-xs text-gray-500 mt-0.5 space-y-0.5">
        {(entry.ubicacion_origen_nombre || entry.ubicacion_destino_nombre) && (
          <p>
            {entry.ubicacion_origen_nombre ?? '?'} → {entry.ubicacion_destino_nombre ?? '?'}
          </p>
        )}
        {entry.notas && <p className="italic">{entry.notas}</p>}
        {entry.responsable_email && <p>Por: {entry.responsable_email}</p>}
      </div>
    </div>
  </li>
);

const CUSTODIA_ESTADO_CLASSES: Record<string, string> = {
  activa: 'text-blue-600',
  devuelta: 'text-green-600',
  perdida: 'text-red-600',
  baja: 'text-gray-600',
  mantencion: 'text-amber-600',
};

const CustodiaRow: React.FC<{ custodia: ActivoCustodiaEntry }> = ({ custodia }) => (
  <tr className="border-b last:border-b-0">
    <td className="py-2 px-2 font-medium">
      {custodia.custodio_nombres} {custodia.custodio_apellidos}
    </td>
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
