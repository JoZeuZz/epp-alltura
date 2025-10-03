import React, { useState, useMemo } from 'react';
import { useGet } from '../../hooks/useGet';
import { Scaffold } from '../../types/api';
import Modal from '../../components/Modal';

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
                  src={item.assembly_image_url}
                  alt={`Andamio ${item.id}`}
                  className="h-16 w-16 object-cover rounded-md mr-4"
                />
                <div>
                  <p className="font-bold text-dark-blue">{item.project_name}</p>
                  <p className="text-sm text-neutral-gray">
                    {item.cubic_meters} m³ -{' '}
                    {new Date(item.assembly_created_at).toLocaleDateString()}
                  </p>
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
        {selectedScaffold && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-dark-blue">
              Detalle del Reporte #{selectedScaffold.id}
            </h2>
            <div className="space-y-4">
              <img
                src={selectedScaffold.assembly_image_url}
                alt="Foto de montaje"
                className="rounded-lg w-full object-contain max-h-[50vh]"
              />
              <div className="p-4 bg-light-gray-bg rounded-lg">
                <p>
                  <strong>Proyecto:</strong> {selectedScaffold.project_name}
                </p>
                <p>
                  <strong>Fecha de Montaje:</strong>{' '}
                  {new Date(selectedScaffold.assembly_created_at).toLocaleString()}
                </p>
                <p>
                  <strong>Dimensiones:</strong> {selectedScaffold.height}m x{' '}
                  {selectedScaffold.width}m x {selectedScaffold.depth}m
                </p>
                <p>
                  <strong>Metros Cúbicos:</strong> {selectedScaffold.cubic_meters} m³
                </p>
                <p>
                  <strong>Estado:</strong>{' '}
                  <span className="capitalize">
                    {selectedScaffold.status === 'assembled' ? 'Armado' : 'Desarmado'}
                  </span>
                </p>
                {selectedScaffold.assembly_notes && (
                  <p className="mt-2">
                    <strong>Notas de Montaje:</strong> {selectedScaffold.assembly_notes}
                  </p>
                )}
              </div>
              {selectedScaffold.status === 'disassembled' && (
                <div className="p-4 bg-light-gray-bg rounded-lg border-t">
                  <h3 className="font-bold text-dark-blue">Información de Desmontaje</h3>
                  {selectedScaffold.disassembly_image_url && (
                    <img
                      src={selectedScaffold.disassembly_image_url}
                      alt="Foto de desmontaje"
                      className="mt-2 rounded-lg w-full object-contain max-h-[50vh]"
                    />
                  )}
                  {selectedScaffold.disassembled_at && (
                    <p>
                      <strong>Fecha de Desmontaje:</strong>{' '}
                      {new Date(selectedScaffold.disassembled_at).toLocaleString()}
                    </p>
                  )}
                  {selectedScaffold.disassembly_notes && (
                    <p className="mt-2">
                      <strong>Notas de Desmontaje:</strong> {selectedScaffold.disassembly_notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default HistoryPage;
