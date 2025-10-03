import React, { useState } from 'react';
import { useGet } from '../../hooks/useGet';
import { usePost, usePut, useDelete } from '../../hooks/useMutate';
import { Client, Project } from '../../types/api';
import ProjectForm from '../../components/ProjectForm';
import Modal from '../../components/Modal';
import AssignTechniciansForm from '../../components/AssignTechniciansForm';
import ConfirmationModal from '../../components/ConfirmationModal';

const ProjectsPage: React.FC = () => {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [projectToAssign, setProjectToAssign] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);

  const { data: projects, isLoading: projectsLoading } = useGet<Project[]>('projects', '/projects');
  const { data: clients, isLoading: clientsLoading } = useGet<Client[]>('clients', '/clients');

  const createProject = usePost<Project, Partial<Project>>('projects', '/projects');
  const updateProject = usePut<Project, Project>('projects', '/projects');
  const deleteProject = useDelete<Project>('projects', '/projects');
  const assignUsers = usePost<unknown, { projectId: number; userIds: number[] }>(
    'project-users',
    '/projects/assign-users',
  );

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

  const handleSubmit = async (projectData: Partial<Project>) => {
    try {
      if (selectedProject) {
        await updateProject.mutateAsync({ ...selectedProject, ...projectData });
      } else {
        await createProject.mutateAsync(projectData);
      }
      handleCloseModal();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignSubmit = async ({
    projectId,
    userIds,
  }: {
    projectId: number;
    userIds: number[];
  }) => {
    try {
      await assignUsers.mutateAsync({ projectId, userIds });
      handleCloseAssignModal();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClick = (projectId: number) => {
    setProjectToDelete(projectId);
    setIsConfirmDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProject.mutateAsync(projectToDelete);
    } catch (err) {
      console.error(err);
    }
    setProjectToDelete(null);
    setIsConfirmDeleteOpen(false);
  };

  const isLoading = projectsLoading || clientsLoading;

  if (isLoading) {
    return <p>Cargando proyectos...</p>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-dark-blue">Gestión de Proyectos</h1>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Añadir Proyecto
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Nombre del Proyecto
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {projects?.map((project) => (
              <tr key={project.id}>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">{project.name}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">{project.client_name}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                  >
                    {project.status === 'active' ? 'Activo' : 'Completado'}
                  </span>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm whitespace-nowrap">
                  <button
                    onClick={() => handleOpenAssignModal(project)}
                    className="text-green-600 hover:text-green-900 mr-4"
                  >
                    Asignar
                  </button>
                  <button
                    onClick={() => handleOpenModal(project)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteClick(project.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <h2 className="text-2xl font-bold mb-4">
          {selectedProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
        </h2>
        <ProjectForm
          project={selectedProject}
          clients={clients || []}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Modal>

      <Modal isOpen={isAssignModalOpen} onClose={handleCloseAssignModal}>
        <h2 className="text-2xl font-bold mb-4">Asignar Técnicos</h2>
        <AssignTechniciansForm
          project={projectToAssign}
          onSubmit={handleAssignSubmit}
          onCancel={handleCloseAssignModal}
        />
      </Modal>

      <ConfirmationModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Proyecto"
        message="¿Está seguro de que desea eliminar este proyecto? Esta acción no se puede deshacer."
      />
    </div>
  );
};

export default ProjectsPage;
