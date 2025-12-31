import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGet } from '../../hooks/useGet';
import Modal from '../../components/Modal';
import ScaffoldDetailsModal from '../../components/ScaffoldDetailsModal';
import { Project, Scaffold } from '../../types/api';

/**
 * Página de visualización de andamios para usuarios cliente
 * Vista de solo lectura de los andamios de un proyecto
 */
const ClientProjectScaffoldsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [selectedScaffold, setSelectedScaffold] = useState<Scaffold | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: project, isLoading: projectLoading } = useGet<Project>(
    `project-${projectId}`,
    `/projects/${projectId}`,
  );

  const { data: scaffolds, isLoading: scaffoldsLoading } = useGet<Scaffold[]>(
    ['scaffolds', projectId],
    `/scaffolds/project/${projectId}`,
  );

  const filteredScaffolds = scaffolds?.filter((scaffold) => {
    if (statusFilter === 'all') return true;
    return scaffold.assembly_status === statusFilter;
  });

  const isLoading = projectLoading || scaffoldsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-dark-blue mb-2">
          {project?.name || 'Proyecto'}
        </h1>
        <p className="text-gray-600">
          Cliente: {project?.client_name}
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary-blue text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Todos ({scaffolds?.length || 0})
          </button>
          <button
            onClick={() => setStatusFilter('assembled')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'assembled'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Armados ({scaffolds?.filter((s) => s.assembly_status === 'assembled').length || 0})
          </button>
          <button
            onClick={() => setStatusFilter('disassembled')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'disassembled'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Desarmados ({scaffolds?.filter((s) => s.assembly_status === 'disassembled').length || 0})
          </button>
        </div>
      </div>

      {/* Grid de andamios */}
      {!filteredScaffolds || filteredScaffolds.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay andamios</h3>
          <p className="mt-1 text-sm text-gray-500">
            {statusFilter === 'all'
              ? 'Aún no hay andamios creados en este proyecto.'
              : `No hay andamios ${statusFilter === 'assembled' ? 'armados' : 'desarmados'} en este momento.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredScaffolds.map((scaffold) => (
            <div
              key={scaffold.id}
              onClick={() => setSelectedScaffold(scaffold)}
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:scale-105"
            >
              {/* Imagen */}
              <div className="relative h-48 bg-gray-200">
                <img
                  src={scaffold.assembly_image_url || '/placeholder-scaffold.png'}
                  alt={`Andamio #${scaffold.id}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo imagen%3C/text%3E%3C/svg%3E';
                  }}
                />
                {/* Badge de estado */}
                <div className="absolute top-2 right-2">
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-full ${
                      scaffold.assembly_status === 'assembled'
                        ? 'bg-green-500 text-white'
                        : 'bg-yellow-500 text-white'
                    }`}
                  >
                    {scaffold.assembly_status === 'assembled' ? 'Armado' : 'Desarmado'}
                  </span>
                </div>
              </div>

              {/* Información */}
              <div className="p-4">
                <h3 className="text-lg font-bold text-dark-blue mb-2">
                  Andamio #{scaffold.id}
                </h3>
                
                <div className="space-y-1 text-sm text-gray-600">
                  {scaffold.location && (
                    <p>
                      <span className="font-semibold">Ubicación:</span> {scaffold.location}
                    </p>
                  )}
                  <p>
                    <span className="font-semibold">Dimensiones:</span> {scaffold.height}m × {scaffold.width}m × {scaffold.depth}m
                  </p>
                  <p>
                    <span className="font-semibold">Volumen:</span> {scaffold.cubic_meters} m³
                  </p>
                  <p>
                    <span className="font-semibold">Fecha:</span>{' '}
                    {new Date(scaffold.assembly_created_at).toLocaleDateString('es-CL')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalles */}
      <Modal isOpen={!!selectedScaffold} onClose={() => setSelectedScaffold(null)}>
        {selectedScaffold && (
          <ScaffoldDetailsModal
            scaffold={selectedScaffold}
          />
        )}
      </Modal>
    </div>
  );
};

export default ClientProjectScaffoldsPage;
