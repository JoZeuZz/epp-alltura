import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGet } from '../../hooks/useGet';
import { Project, Scaffold } from '../../types/api';
import Modal from '../../components/Modal';
import ScaffoldDetailsModal from '../../components/ScaffoldDetailsModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { useAuth } from '../../context/AuthContext';

const ProjectScaffoldsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedScaffold, setSelectedScaffold] = useState<Scaffold | null>(null);
  const [isDisassembleModalOpen, setIsDisassembleModalOpen] = useState(false);
  const [scaffoldToDisassemble, setScaffoldToDisassemble] = useState<number | null>(null);

  const handleDisassembleClick = (scaffoldId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setScaffoldToDisassemble(scaffoldId);
    setIsDisassembleModalOpen(true);
  };

  const confirmDisassemble = () => {
    if (scaffoldToDisassemble) {
      navigate(`/supervisor/scaffold/${scaffoldToDisassemble}/disassemble?projectId=${projectId}`);
    }
  };

  // Helper para normalizar URLs de imágenes
  const getImageUrl = (url: string | undefined | null): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `http://localhost:5000${url}`;
  };

  // Handle image error
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23ddd" width="64" height="64"/%3E%3Ctext fill="%23999" font-size="10" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ESin imagen%3C/text%3E%3C/svg%3E';
  };

  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useGet<Project>(`project-${projectId}`, `/projects/${projectId}`);
  const {
    data: scaffolds,
    isLoading: scaffoldsLoading,
    error: scaffoldsError,
    refetch: refetchScaffolds,
  } = useGet<Scaffold[]>(`scaffolds-${projectId}`, `/scaffolds/project/${projectId}`);

  const isLoading = projectLoading || scaffoldsLoading;
  const error = projectError || scaffoldsError;

  if (isLoading) {
    return <p className="text-center text-neutral-gray">Cargando proyecto...</p>;
  }

  if (error) {
    return <p className="text-red-500 bg-red-100 p-3 rounded-lg">{error.message}</p>;
  }

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-4 text-primary-blue hover:underline">
        &larr; Volver a Mis Proyectos
      </button>
      
      {/* Header responsive: vertical en móvil, horizontal en desktop */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">{project?.name}</h1>
          <p className="text-sm sm:text-base text-neutral-gray">Cliente: {project?.client_name}</p>
        </div>
        <button
          onClick={() => navigate(`/supervisor/project/${projectId}/create-scaffold`)}
          className="bg-primary-blue text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg text-center text-sm sm:text-base whitespace-nowrap"
        >
          + Reportar Montaje
        </button>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-dark-blue mb-4">Andamios Reportados</h2>
      {scaffolds?.length === 0 ? (
        <p className="text-neutral-gray">Aún no se han reportado andamios para este proyecto.</p>
      ) : (
        <div className="space-y-4">
          {scaffolds?.map((scaffold) => (
            <div
              key={scaffold.id}
              onClick={() => setSelectedScaffold(scaffold)}
              className="bg-white p-4 rounded-lg shadow-md cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01]"
            >
              {/* Layout móvil: Todo en columna */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Sección principal: imagen + info */}
                <div className="flex gap-3 items-start">
                  <img
                    src={getImageUrl(scaffold.assembly_image_url)}
                    alt={`Andamio ${scaffold.id}`}
                    className="h-20 w-20 sm:h-16 sm:w-16 object-cover rounded-md flex-shrink-0"
                    onError={handleImageError}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-dark-blue text-base sm:text-lg mb-1">
                      {scaffold.scaffold_number && `N° ${scaffold.scaffold_number} - `}
                      {scaffold.cubic_meters} m³
                    </p>
                    {scaffold.area && (
                      <p className="text-xs sm:text-sm text-neutral-gray">
                        Área: {scaffold.area}
                      </p>
                    )}
                    {scaffold.location && (
                      <p className="text-xs sm:text-sm text-neutral-gray truncate">
                        Ubicación: {scaffold.location}
                      </p>
                    )}
                    <p className="text-xs sm:text-sm text-neutral-gray mt-1">
                      {new Date(scaffold.assembly_created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Sección de acciones: badge + botón */}
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <span
                    className={`capitalize px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-full whitespace-nowrap ${
                      scaffold.assembly_status === 'assembled' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {scaffold.assembly_status === 'assembled' ? 'Armado' : 'Desarmado'}
                  </span>
                  {scaffold.assembly_status === 'assembled' && (
                    <button
                      onClick={(e) => handleDisassembleClick(scaffold.id, e)}
                      className="bg-yellow-500 text-white px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold hover:bg-yellow-600 transition-colors whitespace-nowrap"
                    >
                      Desarmar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      <Modal isOpen={!!selectedScaffold} onClose={() => setSelectedScaffold(null)}>
        {selectedScaffold && (
          <ScaffoldDetailsModal 
            scaffold={selectedScaffold} 
            canEdit={user?.role === 'supervisor'}
            projectId={Number(projectId)}
            onUpdate={() => {
              refetchScaffolds();
              setSelectedScaffold(null);
            }}
          />
        )}
      </Modal>

      {/* Disassemble Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDisassembleModalOpen}
        onClose={() => setIsDisassembleModalOpen(false)}
        onConfirm={confirmDisassemble}
        title="Desarmar Andamio"
        message="¿Estás seguro de que deseas desarmar este andamio? Serás redirigido a un formulario para cargar las pruebas del desarmado (foto y notas)."
        variant="warning"
        confirmText="Desarmar"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default ProjectScaffoldsPage;
