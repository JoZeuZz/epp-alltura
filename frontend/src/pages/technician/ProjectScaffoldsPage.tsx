import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useGet } from '../../hooks/useGet';
import { Project, Scaffold } from '../../types/api';

const ProjectScaffoldsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = useGet<Project>(`project-${projectId}`, `/projects/${projectId}`);
  const {
    data: scaffolds,
    isLoading: scaffoldsLoading,
    error: scaffoldsError,
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-dark-blue">{project?.name}</h1>
          <p className="text-neutral-gray">Cliente: {project?.client_name}</p>
        </div>
        <Link
          to={`/tech/project/${projectId}/new-scaffold`}
          className="bg-primary-blue text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg"
        >
          + Reportar Montaje
        </Link>
      </div>

      <h2 className="text-2xl font-bold text-dark-blue mb-4">Andamios Reportados</h2>
      {scaffolds?.length === 0 ? (
        <p className="text-neutral-gray">Aún no se han reportado andamios para este proyecto.</p>
      ) : (
        <div className="space-y-4">
          {scaffolds?.map((scaffold) => (
            <div
              key={scaffold.id}
              className="bg-white p-4 rounded-lg shadow-md flex items-center justify-between gap-4"
            >
              <div className="flex items-center">
                <img
                  src={scaffold.assembly_image_url}
                  alt={`Andamio ${scaffold.id}`}
                  className="h-16 w-16 object-cover rounded-md mr-4"
                />
                <div>
                  <p className="font-bold text-dark-blue">{scaffold.cubic_meters} m³</p>
                  <p className="text-sm text-neutral-gray">
                    Reportado el: {new Date(scaffold.assembly_created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`capitalize px-3 py-1 text-sm font-semibold rounded-full ${scaffold.status === 'assembled' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                >
                  {scaffold.status === 'assembled' ? 'Armado' : 'Desarmado'}
                </span>
                {scaffold.status === 'assembled' && (
                  <Link
                    to={`/tech/scaffold/${scaffold.id}/disassemble?projectId=${projectId}`}
                    className="bg-yellow-500 text-white px-3 py-1 rounded-lg text-sm font-bold hover:bg-yellow-600 transition-colors"
                  >
                    Desarmar
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectScaffoldsPage;
