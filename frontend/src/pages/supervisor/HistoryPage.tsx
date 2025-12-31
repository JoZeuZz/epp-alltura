import React, { useState, useMemo } from 'react';
import { useGet } from '../../hooks/useGet';

interface HistoryEntry {
  id: number;
  scaffold_id: number;
  scaffold_number: string;
  area: string;
  tag: string;
  project_name: string;
  change_type: string;
  description: string;
  created_at: string;
}

const HistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: history,
    isLoading,
    error,
  } = useGet<HistoryEntry[]>('my-history', '/scaffolds/my-history');

  const filteredHistory = useMemo(() => {
    if (!history) return [];
    return history.filter(
      (item) =>
        (item.project_name && item.project_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.scaffold_number && item.scaffold_number.toLowerCase().includes(searchTerm.toLowerCase())),
    );
  }, [history, searchTerm]);

  const getChangeTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      create: 'Creación',
      card_status: 'Cambio de tarjeta',
      assembly_status: 'Cambio de estado',
      update: 'Actualización',
    };
    return types[type] || type;
  };

  if (isLoading) {
    return <p className="text-center text-neutral-gray">Cargando historial...</p>;
  }

  if (error) {
    return <p className="text-red-500 bg-red-100 p-3 rounded-lg">{error.message}</p>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-dark-blue mb-6">Mi Historial de Cambios</h1>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por proyecto o número de andamio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
        />
      </div>

      {filteredHistory.length === 0 ? (
        <p className="text-neutral-gray text-center py-8">
          {searchTerm
            ? 'No se encontraron registros que coincidan con tu búsqueda.'
            : 'Aún no has realizado ningún cambio.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block px-2 py-1 bg-primary-blue text-white text-xs font-semibold rounded">
                      {getChangeTypeLabel(item.change_type)}
                    </span>
                    <p className="font-bold text-dark-blue">
                      {item.scaffold_number && `N° ${item.scaffold_number}`}
                      {item.project_name && ` - ${item.project_name}`}
                    </p>
                  </div>
                  {item.area && (
                    <p className="text-sm text-neutral-gray">Área: {item.area}</p>
                  )}
                  {item.tag && (
                    <p className="text-sm text-neutral-gray">TAG: {item.tag}</p>
                  )}
                  {item.description && (
                    <p className="text-sm text-gray-700 mt-2">{item.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-neutral-gray">
                    {new Date(item.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    })}
                  </p>
                  <p className="text-xs text-neutral-gray">
                    {new Date(item.created_at).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
