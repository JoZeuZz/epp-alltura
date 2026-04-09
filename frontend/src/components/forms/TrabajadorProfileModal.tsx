import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal from '../Modal';
import {
  getTrabajadorProfile,
  type TrabajadorProfileResponse,
  type TrabajadorCustodiaRow,
} from '../../services/apiService';

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const SEMAFORO_CONFIG: Record<string, { dot: string; label: string; bg: string }> = {
  verde: { dot: 'bg-green-500', label: 'En plazo', bg: 'bg-green-50 text-green-700' },
  amarillo: { dot: 'bg-yellow-500', label: 'Próximo', bg: 'bg-yellow-50 text-yellow-700' },
  rojo: { dot: 'bg-red-500', label: 'Vencido', bg: 'bg-red-50 text-red-700' },
  sin_plazo: { dot: 'bg-gray-400', label: 'Sin plazo', bg: 'bg-gray-50 text-gray-500' },
};

const SemaforoBadge: React.FC<{ semaforo: string; diasRestantes: number | null }> = ({
  semaforo,
  diasRestantes,
}) => {
  const cfg = SEMAFORO_CONFIG[semaforo] ?? SEMAFORO_CONFIG.sin_plazo;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg}`}
      title={diasRestantes != null ? `${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''}` : 'Sin plazo definido'}
    >
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
      {diasRestantes != null && semaforo !== 'sin_plazo' && (
        <span className="opacity-75">({diasRestantes}d)</span>
      )}
    </span>
  );
};

const StatBox: React.FC<{ label: string; value: string | number; accent?: string }> = ({
  label,
  value,
  accent = 'text-blue-600',
}) => (
  <div className="bg-gray-50 rounded-lg p-3 text-center">
    <p className={`text-xl font-bold ${accent}`}>{value}</p>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
  </div>
);

interface Props {
  trabajadorId: string;
  onClose: () => void;
  onOpenActivoProfile?: (activoId: string) => void;
}

const TrabajadorProfileModal: React.FC<Props> = ({ trabajadorId, onClose, onOpenActivoProfile }) => {
  const [tab, setTab] = useState<'custodia' | 'consumibles'>('custodia');

  const { data: profile, isLoading, error } = useQuery<TrabajadorProfileResponse>({
    queryKey: ['trabajador-profile', trabajadorId],
    queryFn: () => getTrabajadorProfile(trabajadorId),
    enabled: !!trabajadorId,
  });

  return (
    <Modal isOpen onClose={onClose} title="Perfil del trabajador">
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}
      {error && (
        <p className="text-red-500 text-center py-8">Error al cargar el perfil del trabajador.</p>
      )}
      {profile && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {profile.nombres} {profile.apellidos}
              </h2>
              <p className="text-sm text-gray-500">RUT: {profile.rut}</p>
              {profile.cargo && (
                <p className="text-sm text-gray-600 mt-0.5">{profile.cargo}</p>
              )}
              {profile.email && (
                <p className="text-xs text-gray-500 mt-0.5">{profile.email}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  profile.estado === 'activo'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {profile.estado === 'activo' ? 'Activo' : 'Inactivo'}
              </span>
              {profile.fecha_ingreso && (
                <span className="text-xs text-gray-500">
                  Ingreso: {formatDate(profile.fecha_ingreso)}
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox
              label="Activos en custodia"
              value={profile.stats.activos_en_custodia}
              accent={profile.stats.activos_en_custodia > 0 ? 'text-blue-600' : 'text-gray-400'}
            />
            <StatBox
              label="Total entregas"
              value={profile.stats.total_entregas}
            />
            <StatBox
              label="Días prom. custodia"
              value={profile.stats.dias_promedio_custodia}
            />
            <StatBox
              label="Alertas devolución"
              value={profile.stats.activos_vencidos_o_proximos}
              accent={profile.stats.activos_vencidos_o_proximos > 0 ? 'text-red-600' : 'text-green-600'}
            />
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-4" aria-label="Tabs">
              <button
                onClick={() => setTab('custodia')}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'custodia'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Activos en custodia ({profile.custodias.length})
              </button>
              <button
                onClick={() => setTab('consumibles')}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'consumibles'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Consumibles recibidos ({profile.consumibles_entregados.length})
              </button>
            </nav>
          </div>

          {/* Tab content */}
          {tab === 'custodia' && (
            <CustodiaTable
              custodias={profile.custodias}
              onOpenActivoProfile={onOpenActivoProfile}
            />
          )}
          {tab === 'consumibles' && (
            <ConsumiblesTable consumibles={profile.consumibles_entregados} />
          )}
        </div>
      )}
    </Modal>
  );
};

/* ── Tabla custodias ──────────────────────────────────────── */

const CustodiaTable: React.FC<{
  custodias: TrabajadorCustodiaRow[];
  onOpenActivoProfile?: (activoId: string) => void;
}> = ({ custodias, onOpenActivoProfile }) => {
  if (custodias.length === 0) {
    return (
      <p className="text-center text-gray-400 py-6 text-sm">
        No tiene activos en custodia actualmente.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto max-h-64 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Código</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Artículo</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Desde</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Días</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Devolución</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {custodias.map((c) => (
            <tr key={c.custodia_id} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-mono text-xs text-gray-800">{c.codigo}</td>
              <td className="px-3 py-2 text-gray-700">{c.articulo_nombre}</td>
              <td className="px-3 py-2 text-gray-500 text-xs">{formatDate(c.desde_en)}</td>
              <td className="px-3 py-2 text-gray-600">{c.dias_en_custodia}d</td>
              <td className="px-3 py-2">
                <SemaforoBadge semaforo={c.semaforo} diasRestantes={c.dias_restantes} />
              </td>
              <td className="px-3 py-2">
                {onOpenActivoProfile && (
                  <button
                    onClick={() => onOpenActivoProfile(c.activo_id)}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                  >
                    Ver
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ── Tabla consumibles ────────────────────────────────────── */

const ConsumiblesTable: React.FC<{
  consumibles: TrabajadorProfileResponse['consumibles_entregados'];
}> = ({ consumibles }) => {
  if (consumibles.length === 0) {
    return (
      <p className="text-center text-gray-400 py-6 text-sm">
        No se han registrado entregas de consumibles.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto max-h-64 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Artículo</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Cantidad</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Lote</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Entregado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {consumibles.map((c) => (
            <tr key={c.detalle_id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-700">{c.articulo_nombre}</td>
              <td className="px-3 py-2 text-gray-600">
                {Number(c.cantidad)} {c.unidad_medida}
              </td>
              <td className="px-3 py-2 text-gray-500 font-mono text-xs">{c.codigo_lote ?? '—'}</td>
              <td className="px-3 py-2 text-gray-500 text-xs">{formatDate(c.confirmada_en)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TrabajadorProfileModal;
