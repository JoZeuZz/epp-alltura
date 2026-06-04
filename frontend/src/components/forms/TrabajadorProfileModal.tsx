import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal from '../Modal';
import {
  getTrabajadorProfile,
  getTrabajadorActas,
  type TrabajadorProfileResponse,
  type TrabajadorCustodiaRow,
  type TrabajadorActaRow,
} from '../../services/apiService';
import ActaDetailModal from './ActaDetailModal';

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
  accent = 'text-primary',
}) => (
  <div className="bg-surface-muted rounded-lg p-3 text-center">
    <p className={`text-xl font-bold ${accent}`}>{value}</p>
    <p className="text-xs text-content-muted mt-0.5">{label}</p>
  </div>
);

/* ── Historial de Actas ───────────────────────────────────── */

const ActasHistorial: React.FC<{ trabajadorId: string }> = ({ trabajadorId }) => {
  const [acta, setActa] = React.useState<{ type: 'entrega' | 'devolucion'; id: string } | null>(null);

  const { data: actas = [], isLoading } = useQuery<TrabajadorActaRow[]>({
    queryKey: ['trabajador-actas', trabajadorId],
    queryFn: () => getTrabajadorActas(trabajadorId),
    enabled: !!trabajadorId,
  });

  const formatActaDate = (d: string) =>
    new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-content-muted">
        Historial de Actas
      </h3>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 bg-surface-muted animate-pulse rounded" />
          ))}
        </div>
      ) : actas.length === 0 ? (
        <p className="text-center text-content-disabled py-4 text-sm">
          Sin actas registradas para este trabajador.
        </p>
      ) : (
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-medium text-content-muted uppercase">Artículo</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-content-muted uppercase hidden sm:table-cell">Código</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-content-muted uppercase hidden sm:table-cell">Fecha</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-content-muted uppercase">Estado</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-content-muted uppercase">Actas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {actas.map((a) => {
                const isDeleted = a.articulo_nombre === '(Artículo eliminado)';
                return (
                  <tr key={a.entrega_id} className="hover:bg-surface-muted">
                    <td className="px-3 py-2 text-content-secondary">
                      {isDeleted ? (
                        <span className="italic text-content-disabled">{a.articulo_nombre}</span>
                      ) : (
                        a.articulo_nombre
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-content-primary hidden sm:table-cell">
                      {a.articulo_codigo}
                    </td>
                    <td className="px-3 py-2 text-xs text-content-muted hidden sm:table-cell">
                      {formatActaDate(a.entrega_fecha)}
                    </td>
                    <td className="px-3 py-2">
                      {a.es_activo ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Devuelto
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActa({ type: 'entrega', id: a.entrega_id })}
                          className="text-xs text-primary hover:text-blue-800 font-medium whitespace-nowrap"
                          aria-label="Ver acta de entrega"
                        >
                          ↓ Entrega
                        </button>
                        {a.devolucion_id && (
                          <button
                            type="button"
                            onClick={() => setActa({ type: 'devolucion', id: a.devolucion_id! })}
                            className="text-xs text-content-secondary hover:text-content-primary font-medium whitespace-nowrap"
                            aria-label="Ver acta de devolución"
                          >
                            ↓ Devolución
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {acta && (
        <ActaDetailModal
          type={acta.type}
          id={acta.id}
          onClose={() => setActa(null)}
        />
      )}
    </div>
  );
};

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
    <Modal isOpen onClose={onClose} title="Perfil del trabajador" mobileFullscreen>
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}
      {error && (
        <p className="text-danger text-center py-8">Error al cargar el perfil del trabajador.</p>
      )}
      {profile && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-content-primary truncate">
                {profile.nombres} {profile.apellidos}
              </h2>
              <p className="text-sm text-content-muted">RUT: {profile.rut}</p>
              {profile.cargo && (
                <p className="text-sm text-content-secondary mt-0.5">{profile.cargo}</p>
              )}
              {profile.email && (
                <p className="text-xs text-content-muted mt-0.5">{profile.email}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  profile.estado === 'activo'
                    ? 'bg-success-subtle text-success-text'
                    : 'bg-surface-overlay text-content-secondary'
                }`}
              >
                {profile.estado === 'activo' ? 'Activo' : 'Inactivo'}
              </span>
              {profile.fecha_ingreso && (
                <span className="text-xs text-content-muted">
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
              accent={profile.stats.activos_en_custodia > 0 ? 'text-primary' : 'text-content-disabled'}
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

          <ActasHistorial trabajadorId={trabajadorId} />
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
      <p className="text-center text-content-disabled py-6 text-sm">
        No tiene activos en custodia actualmente.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto max-h-64 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface-muted sticky top-0">
          <tr>
            <th className="text-left px-3 py-2 text-xs font-medium text-content-muted uppercase">Código</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-content-muted uppercase">Artículo</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-content-muted uppercase">Desde</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-content-muted uppercase"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-edge">
          {custodias.map((c) => (
            <tr key={c.custodia_id} className="hover:bg-surface-muted">
              <td className="px-3 py-2 font-mono text-xs text-content-primary">{c.codigo}</td>
              <td className="px-3 py-2 text-content-secondary">{c.nombre}</td>
              <td className="px-3 py-2 text-content-muted text-xs">{formatDate(c.desde_en)}</td>
              <td className="px-3 py-2">
                {onOpenActivoProfile && (
                  <button
                    onClick={() => onOpenActivoProfile(c.articulo_id)}
                    className="text-primary hover:text-blue-800 text-xs font-medium"
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
