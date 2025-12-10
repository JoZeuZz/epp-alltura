import React, { useState, useMemo } from 'react';
import { useGet } from '../../hooks/useGet';
import { Scaffold } from '../../types/api';
import Modal from '../../components/Modal';
import ScaffoldDetailsModal from '../../components/ScaffoldDetailsModal';

const HistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScaffold, setSelectedScaffold] = useState<Scaffold | null>(null);

  const {
    data: history,
    isLoading,
    error,
  } = useGet<Scaffold[]>('my-history', '/scaffolds/my-history');

  const filteredHistory = useMemo(() => {
    if (!history) return [];
    return history.filter(
      (item) =>
        item.project_name && item.project_name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [history, searchTerm]);

  const handleCloseModal = () => {
    setSelectedScaffold(null);
  };

  if (isLoading) {
    return <p className="text-center text-neutral-gray">Cargando historial...</p>;
  }

  if (error) {
    return <p className="text-red-500 bg-red-100 p-3 rounded-lg">{error.message}</p>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-dark-blue mb-6">Mi Historial de Reportes</h1>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre de proyecto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
        />
      </div>

      {filteredHistory.length === 0 ? (
        <p className="text-neutral-gray text-center py-8">
          {searchTerm
            ? 'No se encontraron reportes que coincidan con tu búsqueda.'
            : 'Aún no has realizado ningún reporte.'}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedScaffold(item)}
              className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
            >
              <div className="flex items-center">
                <img
                  src={item.assembly_image_url.startsWith('http') 
                    ? item.assembly_image_url 
                    : `http://localhost:5000${item.assembly_image_url}`}
                  alt={`Andamio ${item.id}`}
                  className="h-16 w-16 object-cover rounded-md mr-4"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23ddd" width="64" height="64"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="10"%3ENo img%3C/text%3E%3C/svg%3E';
                  }}
                />
                <div>
                  <p className="font-bold text-dark-blue">
                    {item.scaffold_number && `N° ${item.scaffold_number} - `}
                    {item.project_name}
                  </p>
                  <p className="text-sm text-neutral-gray">
                    {item.cubic_meters} m³ -{' '}
                    {new Date(item.assembly_created_at).toLocaleDateString()}
                  </p>
                  {item.company_name && <p className="text-sm text-neutral-gray">Solicitante: {item.company_name}</p>}
                  {item.end_user_name && <p className="text-sm text-neutral-gray">Usuario: {item.end_user_name}</p>}
                </div>
              </div>
              <span
                className={`capitalize px-3 py-1 text-sm font-semibold rounded-full ${item.status === 'assembled' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
              >
                {item.status === 'assembled' ? 'Armado' : 'Desarmado'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      <Modal isOpen={!!selectedScaffold} onClose={handleCloseModal}>
        {selectedScaffold && <ScaffoldDetailsModal scaffold={selectedScaffold} />}
      </Modal>
    </div>
  );
};

export default HistoryPage;
