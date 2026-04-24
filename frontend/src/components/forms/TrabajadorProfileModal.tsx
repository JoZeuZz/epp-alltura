import React from 'react';
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
          <div className="grid grid-cols-2 gap-3">
            <StatBox
              label="Equipos asignados"
              value={profile.stats.activos_en_custodia}
              accent={profile.stats.activos_en_custodia > 0 ? 'text-blue-600' : 'text-gray-400'}
            />
            <StatBox
              label="Entregas recibidas"
              value={profile.stats.total_entregas}
            />
          </div>

          <CustodiaTable
            custodias={profile.custodias}
            onOpenActivoProfile={onOpenActivoProfile}
          />
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
            <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {custodias.map((c) => (
            <tr key={c.custodia_id} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-mono text-xs text-gray-800">{c.codigo}</td>
              <td className="px-3 py-2 text-gray-700">{c.articulo_nombre}</td>
              <td className="px-3 py-2 text-gray-500 text-xs">{formatDate(c.desde_en)}</td>
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

export default TrabajadorProfileModal;
