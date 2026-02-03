import React, { useState, useEffect, useMemo } from 'react';
import { useLoaderData, useActionData, useNavigate, useSubmit, useRevalidator } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Client, Project, User } from '../../types/api';
import ProjectForm from '../../components/ProjectForm';
import Modal from '../../components/Modal';
import AssignSupervisorsForm from '../../components/AssignSupervisorsForm';
import ConfirmationModal from '../../components/ConfirmationModal';
import { ProjectCard } from '../../components/cards';
import { ResponsiveGrid } from '../../components/layout';
import { useBreakpoints } from '../../hooks';
import { apiService } from '../../services/apiService';

const ProjectsPage: React.FC = () => {
  const { projects, clients, users } = useLoaderData() as { projects: Project[], clients: Client[], users: User[] };
  const actionData = useActionData() as { success?: boolean; message?: string; fieldErrors?: Record<string, string> } | undefined;
  const navigate = useNavigate();
  const submit = useSubmit();
  const revalidator = useRevalidator();
  const { isMobile } = useBreakpoints();
  
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [projectToAssign, setProjectToAssign] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
  const [scaffoldCount, setScaffoldCount] = useState<number>(0);
  const [showInactive, setShowInactive] = useState(false);

  const projectsLoading = false;
  const clientsLoading = false;
  const usersLoading = false;

  // Manejar respuestas de la action
  useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        toast.success(actionData.message || 'Operación exitosa');
        setIsModalOpen(false);
        setIsAssignModalOpen(false);
        setIsConfirmDeleteOpen(false);
        setSelectedProject(null);
        setProjectToAssign(null);
        setProjectToDelete(null);
      } else {
        // Solo mostrar toast si no hay errores de campo específicos
        const hasFieldErrors = actionData.fieldErrors && Object.keys(actionData.fieldErrors).length > 0;
        if (!hasFieldErrors) {
          toast.error(actionData.message || 'Error en la operación');
        }
        // Los errores de campo se muestran inline en el formulario
      }
    }
  }, [actionData]);

  // Filtrar supervisores y usuarios cliente con useMemo para evitar recálculos innecesarios
  const supervisors = useMemo(() => users?.filter(u => u.role === 'supervisor') || [], [users]);
  const clientUsers = useMemo(() => users?.filter(u => u.role === 'client') || [], [users]);

  const handleOpenModal = (project: Project | null = null) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
  };

  const handleOpenAssignModal = (project: Project) => {
    setProjectToAssign(project);
    setIsAssignModalOpen(true);
  };

  const handleCloseAssignModal = () => {
    setIsAssignModalOpen(false);
    setProjectToAssign(null);
  };

  const handleAssignSubmit = async ({
    projectId,
    userIds,
  }: {
    projectId: number;
    userIds: number[];
  }) => {
    // Este método se mantiene temporalmente para AssignSupervisorsForm
    // TODO: migrar AssignSupervisorsForm a usar Form también
    try {
      await apiService.post(`/projects/${projectId}/users`, { userIds });
      toast.success('Usuarios asignados correctamente');
      handleCloseAssignModal();
      revalidator.revalidate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al asignar usuarios';
      toast.error(message);
    }
  };

  const handleDeleteClick = async (projectId: number) => {
    setProjectToDelete(projectId);
    
    // Obtener el conteo de andamios antes de mostrar el modal
    try {
      const response = await apiService.get(`/projects/${projectId}/scaffolds/count`);
      setScaffoldCount(response.data?.count ?? 0);
    } catch (err) {
      console.error('Error al obtener conteo de andamios:', err);
      setScaffoldCount(0);
    }
    
    setIsConfirmDeleteOpen(true);
  };

  const handleReactivate = (projectId: number) => {
    const formData = new FormData();
    formData.append('intent', 'reactivate');
    formData.append('id', String(projectId));
    submit(formData, { method: 'post' });
  };

  const isLoading = projectsLoading || clientsLoading || usersLoading;

  // Filtrar proyectos según el estado del checkbox
  const filteredProjects = projects?.filter(project => {
    if (showInactive) {
      return true; // Mostrar todos
    }
    return project.active && project.client_active; // Solo activos
  }) || [];

  if (isLoading) {
    return <p>Cargando proyectos...</p>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-dark-blue">Gestión de Proyectos</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto" data-tour="admin-projects-filters">
          <label className="flex items-center gap-2 text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded-lg">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 text-primary-blue border-gray-300 rounded focus:ring-primary-blue"
            />
            Mostrar desactivados
          </label>
          <button
            onClick={() => handleOpenModal()}
            data-tour="admin-projects-create"
            className="bg-primary-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base w-full sm:w-auto"
          >
            + Añadir Proyecto
          </button>
        </div>
      </div>

      <div data-tour="admin-projects-list">
        {/* Vista móvil: Cards */}
        {isMobile ? (
          <ResponsiveGrid variant="wide" gap="md">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={handleOpenModal}
                onDelete={handleDeleteClick}
                onReactivate={handleReactivate}
                onAssign={handleOpenAssignModal}
                onGallery={(selected) => navigate(`/admin/project/${selected.id}/gallery`)}
              />
            ))}
          </ResponsiveGrid>
        ) : (
          /* Vista desktop: Tabla */
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-full leading-normal">
              <caption className="sr-only">Lista de proyectos</caption>
            <thead>
              <tr>
                <th scope="col" className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Nombre
                </th>
                <th scope="col" className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Cliente
                </th>
                <th scope="col" className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Estado
                </th>
                <th scope="col" className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id} className={!project.active || !project.client_active ? 'bg-gray-50 opacity-60' : ''}>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap">{project.name}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap">{project.client_name}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    {!project.active || !project.client_active ? (
                      <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">
                        {!project.client_active ? 'Cliente desact.' : 'Desactivado'}
                      </span>
                    ) : (
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                      >
                        {project.status === 'active' ? 'Activo' : 'Completado'}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm whitespace-nowrap">
                    {!project.active && project.client_active ? (
                      <>
                        <button
                          onClick={() => {
                            const formData = new FormData();
                            formData.append('intent', 'reactivate');
                            formData.append('id', String(project.id));
                            submit(formData, { method: 'post' });
                          }}
                          className="text-green-600 hover:text-green-900 mr-4"
                          aria-label={`Reactivar proyecto ${project.name}`}
                        >
                          Reactivar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => navigate(`/admin/project/${project.id}/gallery`)}
                          className="text-gray-400 hover:text-indigo-600 mr-4"
                          aria-label={`Ver galería del proyecto ${project.name}`}
                          title="Galería"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11a3 3 0 100 6 3 3 0 000-6z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleOpenAssignModal(project)}
                          data-tour="admin-projects-assign"
                          className="text-green-600 hover:text-green-900 mr-4"
                          aria-label={`Asignar andamios al proyecto ${project.name}`}
                        >
                          Asignar
                        </button>
                        <button
                          onClick={() => handleOpenModal(project)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                          aria-label={`Editar proyecto ${project.name}`}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteClick(project.id)}
                          className="text-red-600 hover:text-red-900"
                          aria-label={`Eliminar proyecto ${project.name}`}
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <h2 className="text-2xl font-bold mb-4">
          {selectedProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
        </h2>
        <ProjectForm
          project={selectedProject}
          clients={clients || []}
          supervisors={supervisors}
          clientUsers={clientUsers}
          onCancel={handleCloseModal}
        />
      </Modal>

      <Modal isOpen={isAssignModalOpen} onClose={handleCloseAssignModal}>
        <h2 className="text-2xl font-bold mb-4">Asignar Usuarios al Proyecto</h2>
        <AssignSupervisorsForm
          project={projectToAssign}
          onSubmit={handleAssignSubmit}
          onCancel={handleCloseAssignModal}
        />
      </Modal>

      <ConfirmationModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={() => {
          // Usar useSubmit de React Router
          const formData = new FormData();
          formData.append('intent', 'delete');
          formData.append('id', String(projectToDelete || ''));
          
          submit(formData, { method: 'post' });
          
          setIsConfirmDeleteOpen(false);
        }}
        title={scaffoldCount > 0 ? "Desactivar Proyecto" : "Eliminar Proyecto"}
        message={
          scaffoldCount > 0
            ? `Este proyecto tiene ${scaffoldCount} andamio${scaffoldCount === 1 ? '' : 's'} asociado${scaffoldCount === 1 ? '' : 's'}. Por seguridad, el proyecto será desactivado en lugar de eliminado. Podrá reactivarlo más adelante si lo necesita.`
            : "¿Está seguro de que desea eliminar este proyecto permanentemente? Esta acción no se puede deshacer."
        }
        confirmText={scaffoldCount > 0 ? "Desactivar" : "Eliminar"}
        variant={scaffoldCount > 0 ? "warning" : "danger"}
      />
    </div>
  );
};

export default ProjectsPage;
