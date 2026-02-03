import React, { useState, useMemo } from 'react';
import { useNavigate, useLoaderData } from 'react-router-dom';
import { User } from '../../types/api';
import { formatNameParts } from '../../utils/name';

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

const UserHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { userData: user, history: initialHistory } = useLoaderData() as { userData: User, history: HistoryEntry[] };
  const [searchTerm, setSearchTerm] = useState('');

  const history = initialHistory;

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
      disassemble: 'Desarmado',
    };
    return types[type] || type;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header con botón de volver */}
      <div className="mb-6" data-tour="admin-userhistory-search">
        <button
          onClick={() => navigate('/admin/users')}
          className="mb-4 flex items-center gap-2 text-primary-blue hover:text-blue-700"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a Usuarios
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-dark-blue">Historial de Cambios</h1>
            {user && (
              <p className="text-lg text-gray-600 mt-2">
                {formatNameParts(user.first_name, user.last_name)}
                <span className={`ml-3 px-3 py-1 text-sm font-semibold rounded-full ${
                  user.role === 'admin' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {user.role === 'admin' ? 'Administrador' : 'Supervisor'}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por proyecto o número de andamio..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
        />
      </div>

      {/* Estadísticas rápidas */}
      {history && history.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total de Cambios</p>
            <p className="text-2xl font-bold text-dark-blue">{history.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Creaciones</p>
            <p className="text-2xl font-bold text-green-600">
              {history.filter(h => h.change_type === 'create').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Actualizaciones</p>
            <p className="text-2xl font-bold text-blue-600">
              {history.filter(h => h.change_type === 'update' || h.change_type === 'assembly_status' || h.change_type === 'card_status').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Desarmados</p>
            <p className="text-2xl font-bold text-yellow-600">
              {history.filter(h => h.change_type === 'disassemble').length}
            </p>
          </div>
        </div>
      )}

      {/* Lista de historial */}
      <div data-tour="admin-userhistory-list">
        {filteredHistory.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-neutral-gray">
              {searchTerm
                ? 'No se encontraron registros que coincidan con tu búsqueda.'
                : 'Este usuario aún no ha realizado ningún cambio.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                        item.change_type === 'create' 
                          ? 'bg-green-100 text-green-800'
                          : item.change_type === 'disassemble'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-primary-blue text-white'
                      }`}>
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
                  <div className="text-right flex-shrink-0">
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
    </div>
  );
};

export default UserHistoryPage;
