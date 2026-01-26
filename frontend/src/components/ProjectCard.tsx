import React from 'react';
import { Link } from 'react-router-dom';
import { Project } from '../types/api';
import { formatDisplayName } from '../utils/name';

interface ProjectCardProps {
  project: Project;
  linkTo: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, linkTo }) => {
  // Determinar el estado visual del proyecto
  const getStatusBadge = () => {
    if (!project.active) {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
          <svg className="w-3 h-3 mr-1 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
          </svg>
          Proyecto Inactivo
        </span>
      );
    }
    
    if (!project.client_active) {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
          <svg className="w-3 h-3 mr-1 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Cliente Inactivo
        </span>
      );
    }
    
    if (project.status === 'completed') {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
          <svg className="w-3 h-3 mr-1 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Completado
        </span>
      );
    }
    
    return (
      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
        <svg className="w-3 h-3 mr-1 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        Activo
      </span>
    );
  };

  // Formatear fecha
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Link
      to={linkTo}
      className="block bg-white rounded-lg border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden group"
    >
      {/* Header con degradado sutil */}
      <div className="bg-gradient-to-r from-primary-blue to-blue-600 p-4 md:p-5">
        <h5 className="heading-3 tracking-tight text-white mb-1 group-hover:translate-x-1 transition-transform">
          {project.name}
        </h5>
        <div className="flex items-center gap-2 mt-2">
          {getStatusBadge()}
        </div>
      </div>

      {/* Contenido - Layout vertical en móvil, grid en desktop */}
      <div className="p-4 md:p-5 space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-3">
        {/* Cliente Empresa */}
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Cliente Empresa</p>
            <p className="text-sm font-medium text-gray-900 truncate">{project.client_name}</p>
          </div>
        </div>

        {/* Cliente Asignado (usuario específico) */}
        {project.assigned_client_name && (
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Contacto Asignado</p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {formatDisplayName(project.assigned_client_name)}
              </p>
            </div>
          </div>
        )}

        {/* Supervisor Asignado */}
        {project.assigned_supervisor_name && (
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Supervisor</p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {formatDisplayName(project.assigned_supervisor_name)}
              </p>
            </div>
          </div>
        )}

        {/* Fecha de creación */}
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Creado</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(project.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Footer con link */}
      <div className="px-4 md:px-5 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Ver andamios del proyecto</span>
          <span className="text-primary-blue font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
            Ir al proyecto
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ProjectCard;
