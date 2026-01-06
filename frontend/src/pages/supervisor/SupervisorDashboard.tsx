import React, { useState, useMemo } from 'react';
import { Link, useLoaderData } from 'react-router-dom';
import { Project } from '../../types/api';

const SupervisorDashboard: React.FC = () => {
  const { projects: initialProjects } = useLoaderData() as { projects: Project[] };
  const [searchTerm, setSearchTerm] = useState('');
  const projects = initialProjects;

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    // Filtrar solo proyectos activos con clientes activos
    return projects
      .filter((project) => project.active && project.client_active)
      .filter((project) =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
  }, [projects, searchTerm]);

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-dark-blue mb-4 md:mb-6">Mis Proyectos Activos</h1>

      <div className="mb-4 md:mb-6">
        <input
          type="text"
          placeholder="Buscar proyecto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 text-sm md:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
        />
      </div>

      {filteredProjects.length === 0 ? (
        <p className="text-neutral-gray text-center py-8 text-sm md:text-base">
          {searchTerm
            ? 'No se encontraron proyectos que coincidan con tu búsqueda.'
            : 'No tienes proyectos asignados en este momento.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredProjects.map((project) => (
            <Link
              to={`/supervisor/project/${project.id}`}
              key={project.id}
              className="block p-4 md:p-6 bg-white rounded-lg border border-gray-200 shadow-md hover:bg-gray-100 transition-colors"
            >
              <h5 className="mb-2 text-xl md:text-2xl font-bold tracking-tight text-dark-blue">
                {project.name}
              </h5>
              <p className="font-normal text-neutral-gray mb-3">Cliente: {project.client_name}</p>
              <div className="flex items-center justify-between">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                >
                  {project.status === 'active' ? 'Activo' : 'Completado'}
                </span>
                <span className="text-primary-blue font-semibold">Ver detalles &rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupervisorDashboard;
