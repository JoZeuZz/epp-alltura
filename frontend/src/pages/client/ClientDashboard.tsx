import React from 'react';
import { Link, useLoaderData } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Project } from '../../types/api';
import { ResponsiveGrid } from '../../components/layout';
import { formatNameParts } from '../../utils/name';

/**
 * Dashboard para usuarios cliente
 * Permite visualizar los proyectos asignados y sus andamios
 */
const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const { projects } = useLoaderData() as { projects: Project[] };

  return (
    <div>
      <div className="mb-6">
        <h1 className="heading-1 text-dark-blue mb-2">
          Bienvenido, {formatNameParts(user?.first_name, user?.last_name)}
        </h1>
        <p className="body-large text-gray-600">
          Visualiza los andamios de los proyectos asignados a tu empresa
        </p>
      </div>

      {/* Proyectos asignados */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="heading-2 text-dark-blue mb-4">Mis Proyectos</h2>
        
        {!projects || projects.length === 0 ? (
          <div className="text-center py-12">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 body-base font-medium text-gray-900">No hay proyectos asignados</h3>
            <p className="mt-1 body-small text-gray-500">
              Aún no tienes proyectos asignados. Contacta al administrador.
            </p>
          </div>
        ) : (
          <ResponsiveGrid variant="cards" gap="md">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/client/project/${project.id}`}
                className="block p-6 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-lg hover:shadow-lg transition-all hover:scale-105"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="heading-4 text-dark-blue mb-2">
                      {project.name}
                    </h3>
                    <p className="body-small text-gray-600 mb-3">
                      {project.client_name}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      project.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {project.status === 'active' ? 'Activo' : 'Completado'}
                  </span>
                </div>
                
                <div className="mt-4 flex items-center text-primary-blue hover:text-blue-700">
                  <span className="text-sm font-medium">Ver andamios</span>
                  <svg
                    className="ml-2 w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </ResponsiveGrid>
        )}
      </div>

      {/* Información adicional */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Nota:</strong> Como usuario cliente, puedes visualizar los andamios de tus proyectos asignados. 
              Para cualquier modificación, contacta al supervisor o administrador del proyecto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
