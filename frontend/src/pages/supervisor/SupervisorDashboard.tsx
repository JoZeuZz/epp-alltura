import React, { useState, useMemo } from 'react';
import { useLoaderData } from 'react-router-dom';
import { Project } from '../../types/api';
import { ResponsiveGrid } from '../../components/layout';
import ProjectCard from '../../components/ProjectCard';

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
      <h1 className="heading-1 text-dark-blue mb-4 md:mb-6">Mis Proyectos Activos</h1>

      <div className="mb-4 md:mb-6">
        <input
          type="text"
          placeholder="Buscar proyecto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 body-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue min-h-touch"
        />
      </div>

      {filteredProjects.length === 0 ? (
        <p className="text-neutral-gray text-center py-8 body-base">
          {searchTerm
            ? 'No se encontraron proyectos que coincidan con tu búsqueda.'
            : 'No tienes proyectos asignados en este momento.'}
        </p>
      ) : (
        <ResponsiveGrid variant="cards" gap="lg">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              linkTo={`/supervisor/project/${project.id}`}
            />
          ))}
        </ResponsiveGrid>
      )}
    </div>
  );
};

export default SupervisorDashboard;
