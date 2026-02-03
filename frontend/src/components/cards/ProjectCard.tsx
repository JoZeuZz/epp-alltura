import React from 'react';
import { EntityCard, InfoField, CardAction } from './EntityCard';
import type { Project } from '../../types/api';

interface ProjectCardProps {
  project: Project;
  onEdit: (project?: Project | null) => void;
  onDelete: (projectId: number) => void;
  onReactivate: (projectId: number) => void;
  onAssign: (project: Project) => void;
  onGallery?: (project: Project) => void;
}

const ProjectStatusBadge: React.FC<{ project: Project }> = ({ project }) => {
  if (!project.active) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Inactivo
      </span>
    );
  }
  
  if (!project.client_active) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        Cliente Inactivo
      </span>
    );
  }
  
  return (
    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
      Activo
    </span>
  );
};

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onEdit,
  onDelete,
  onReactivate,
  onAssign,
  onGallery,
}) => {
  const fields: InfoField[] = [
    {
      label: 'Cliente',
      value: project.client_name,
    },
  ];
  
  const actions: CardAction[] = [];
  
  // Lógica condicional de acciones (replica la lógica de ProjectsPage)
  const isActive = project.active;
  const isClientActive = project.client_active;
  
  // Reactivar (solo si proyecto inactivo pero cliente activo)
  if (!isActive && isClientActive) {
    actions.push({
      label: 'Reactivar',
      onClick: () => onReactivate(project.id),
      variant: 'success',
      show: true,
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    });
  }

  if (onGallery) {
    actions.push({
      label: 'Galería',
      onClick: () => onGallery(project),
      variant: 'secondary',
      show: true,
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11a3 3 0 100 6 3 3 0 000-6z" />
        </svg>
      ),
    });
  }
  
  // Asignar (solo si proyecto activo)
  if (isActive) {
    actions.push({
      label: 'Asignar',
      onClick: () => onAssign(project),
      variant: 'secondary',
      show: true,
      dataTour: 'admin-projects-assign',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    });
  }
  
  // Editar (solo si proyecto activo)
  if (isActive) {
    actions.push({
      label: 'Editar',
      onClick: () => onEdit(project),
      variant: 'primary',
      show: true,
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    });
  }
  
  // Eliminar (solo si proyecto activo)
  if (isActive) {
    actions.push({
      label: 'Eliminar',
      onClick: () => onDelete(project.id),
      variant: 'danger',
      show: true,
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
    });
  }
  
  return (
    <EntityCard
      title={project.name}
      badge={<ProjectStatusBadge project={project} />}
      fields={fields}
      actions={actions}
      inactive={!project.active}
    />
  );
};

export default ProjectCard;
