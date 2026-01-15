import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ScaffoldModification } from '../types/scaffoldModifications';

interface ModificationsListProps {
  modifications: ScaffoldModification[];
  currentUserRole: string;
  onApprove?: (id: number) => Promise<void>;
  onReject?: (id: number, reason: string) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

export default function ModificationsList({
  modifications,
  currentUserRole,
  onApprove,
  onReject,
  onDelete,
}: ModificationsListProps) {
  const isAdmin = currentUserRole === 'admin';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✓ Aprobado
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            ⏳ Pendiente
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            ✗ Rechazado
          </span>
        );
      default:
        return null;
    }
  };

  const handleApprove = async (id: number) => {
    if (!onApprove) return;
    if (!confirm('¿Estás seguro de que quieres aprobar esta modificación?')) return;

    try {
      await onApprove(id);
    } catch (error) {
      console.error('Error approving modification:', error);
    }
  };

  const handleReject = async (id: number) => {
    if (!onReject) return;
    
    const reason = prompt('Motivo del rechazo (requerido):');
    if (!reason || reason.trim() === '') {
      alert('Debes especificar un motivo para rechazar la modificación');
      return;
    }

    try {
      await onReject(id, reason);
    } catch (error) {
      console.error('Error rejecting modification:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!onDelete) return;
    if (!confirm('¿Estás seguro de que quieres eliminar esta modificación pendiente?')) return;

    try {
      await onDelete(id);
    } catch (error) {
      console.error('Error deleting modification:', error);
    }
  };

  if (modifications.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-sm">No hay modificaciones registradas</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {modifications.map((mod) => (
        <div
          key={mod.id}
          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between gap-4">
            {/* Información principal */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg font-semibold text-gray-900">
                  {mod.height}m × {mod.width}m × {mod.length}m
                </span>
                <span className="text-xl font-bold text-blue-600">
                  = {parseFloat(String(mod.cubic_meters)).toFixed(2)} m³
                </span>
                {getStatusBadge(mod.approval_status)}
              </div>

              {/* Motivo */}
              {mod.reason && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Motivo:</span> {mod.reason}
                </p>
              )}

              {/* Motivo de rechazo */}
              {mod.approval_status === 'rejected' && mod.rejection_reason && (
                <p className="text-sm text-red-600 mb-2">
                  <span className="font-medium">Rechazado por:</span> {mod.rejection_reason}
                </p>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>
                  Creado por: {mod.created_by_name || mod.created_by_username || `Usuario #${mod.created_by}`}
                </span>
                <span>
                  Fecha: {format(new Date(mod.created_at), "dd 'de' MMM yyyy, HH:mm", { locale: es })}
                </span>
                {mod.approved_at && (
                  <span>
                    {mod.approval_status === 'approved' ? 'Aprobado' : 'Rechazado'} por:{' '}
                    {mod.approved_by_name || mod.approved_by_username || `Usuario #${mod.approved_by}`}
                    {' '}el {format(new Date(mod.approved_at), "dd 'de' MMM yyyy", { locale: es })}
                  </span>
                )}
              </div>
            </div>

            {/* Acciones (solo admin) */}
            {isAdmin && mod.approval_status === 'pending' && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleApprove(mod.id)}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                  title="Aprobar modificación"
                >
                  ✓ Aprobar
                </button>
                <button
                  onClick={() => handleReject(mod.id)}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                  title="Rechazar modificación"
                >
                  ✗ Rechazar
                </button>
              </div>
            )}

            {/* Eliminar (solo pendientes) */}
            {mod.approval_status === 'pending' && onDelete && (
              <button
                onClick={() => handleDelete(mod.id)}
                className="text-gray-400 hover:text-red-600 transition-colors"
                title="Eliminar modificación pendiente"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
