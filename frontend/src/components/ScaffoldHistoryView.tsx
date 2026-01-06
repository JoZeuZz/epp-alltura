import React, { useEffect, useState } from 'react';
import { ScaffoldHistory } from '../types/api';

interface ScaffoldHistoryViewProps {
  scaffoldId: number;
  userRole: 'admin' | 'supervisor' | 'client';
  onDelete?: (historyId: number) => Promise<void>;
}

/**
 * Componente para visualizar el historial de cambios de un andamio
 * Muestra una línea de tiempo con todos los cambios realizados
 */
export const ScaffoldHistoryView: React.FC<ScaffoldHistoryViewProps> = ({
  scaffoldId,
  userRole,
  onDelete,
}) => {
  const [history, setHistory] = useState<ScaffoldHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [scaffoldId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/scaffolds/${scaffoldId}/history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar historial');
      }

      const data = await response.json();
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (historyId: number) => {
    if (!onDelete) return;

    if (window.confirm('¿Está seguro de eliminar esta entrada del historial?')) {
      try {
        await onDelete(historyId);
        // Recargar historial
        await fetchHistory();
      } catch (err) {
        alert('Error al eliminar entrada de historial');
      }
    }
  };

  const getChangeTypeColor = (changeType: string) => {
    if (changeType.includes('card_status')) return 'bg-yellow-100 text-yellow-800';
    if (changeType.includes('assembly_status')) return 'bg-blue-100 text-blue-800';
    if (changeType.includes('create')) return 'bg-green-100 text-green-800';
    if (changeType.includes('dimensions')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getChangeTypeIcon = (changeType: string) => {
    if (changeType.includes('card_status')) return '🏷️';
    if (changeType.includes('assembly_status')) return '🏗️';
    if (changeType.includes('create')) return '➕';
    if (changeType.includes('dimensions')) return '📏';
    if (changeType.includes('progress')) return '📊';
    return '✏️';
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">No hay historial de cambios para este andamio</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Historial de Modificaciones</h3>
      
      <div className="relative border-l-2 border-gray-300 pl-6 space-y-6">
        {history.map((entry) => (
          <div key={entry.id} className="relative">
            {/* Punto en la línea de tiempo */}
            <div className="absolute -left-9 top-0 w-6 h-6 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center">
              <span className="text-xs">{getChangeTypeIcon(entry.change_type)}</span>
            </div>

            {/* Contenido del cambio */}
            <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getChangeTypeColor(entry.change_type)}`}>
                    {entry.change_type}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(entry.created_at).toLocaleString('es-ES')}
                  </span>
                </div>

                {userRole === 'admin' && onDelete && (
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                    title="Eliminar entrada"
                  >
                    🗑️
                  </button>
                )}
              </div>

              <p className="text-gray-700 mb-2">{entry.description}</p>

              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="font-medium">{entry.modified_by_name}</span>
                {entry.modified_by_email && (
                  <span className="text-gray-400">({entry.modified_by_email})</span>
                )}
              </div>

              {/* Detalles del cambio (expandible) */}
              <details className="mt-2">
                <summary className="text-sm text-blue-600 cursor-pointer hover:underline">
                  Ver detalles del cambio
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">Datos Anteriores:</h4>
                    <pre className="text-xs bg-white p-2 rounded overflow-auto">
                      {JSON.stringify(entry.previous_data, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-1">Datos Nuevos:</h4>
                    <pre className="text-xs bg-white p-2 rounded overflow-auto">
                      {JSON.stringify(entry.new_data, null, 2)}
                    </pre>
                  </div>
                </div>
              </details>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScaffoldHistoryView;
