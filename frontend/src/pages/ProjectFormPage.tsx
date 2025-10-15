import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useGet } from '../hooks/useGet';
import { usePost, usePut } from '../hooks/useMutate';
import { Client, Project, User } from '../types/api';
import Spinner from '../components/Spinner';
import { post } from '../services/apiService';

const ProjectFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  // Definir el tipo exacto de los estados que admite Project['status']
  type ProjectStatus = Project['status']; // "active" | "inactive" | "completed" | undefined
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [assignedTechnicians, setAssignedTechnicians] = useState<number[]>([]);

  const { data: clients, isLoading: clientsLoading } = useGet<Client[]>('clients', '/clients');
  const { data: technicians, isLoading: techniciansLoading } = useGet<User[]>(
    'technicians',
    '/users?role=technician',
  );
  const { data: project, isLoading: projectLoading } = useGet<Project>(
    `project-${id}`,
    `/projects/${id}`,
    { enabled: isEditing },
  );
  const { data: assignedUsers, isLoading: assignedUsersLoading } = useGet<number[]>(
    `project-users-${id}`,
    `/projects/${id}/users`,
    { enabled: isEditing },
  );

  // Definir el tipo de datos que se envían para crear/actualizar un proyecto.
  // No incluye propiedades generadas por el servidor como `id`, `created_at`, `client_name`.
  type ProjectPayload = Omit<Project, 'id' | 'created_at' | 'client_name'>;

  // Ajustar los hooks de mutación con los tipos correctos del payload.
  const createProject = usePost<Project, ProjectPayload>('projects', '/projects');
  const updateProject = usePut<Project, ProjectPayload & { id: number }>(
    'projects',
    `/projects/${id}`,
  );
  const assignUsers = usePost<unknown, { userIds: number[] }>(
    `project-users-${id}`,
    `/projects/${id}/users`,
  );

  // Estado local para indicar que se está guardando
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditing && project) {
      setName(project.name);
      setClientId(project.client_id.toString());
      setStatus(project.status);
    }
    if (isEditing && assignedUsers) {
      setAssignedTechnicians(assignedUsers);
    }
  }, [project, assignedUsers, isEditing]);

  const handleTechnicianToggle = (technicianId: number) => {
    setAssignedTechnicians((prev) =>
      prev.includes(technicianId)
        ? prev.filter((id) => id !== technicianId)
        : [...prev, technicianId],
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const projectData = { name, client_id: parseInt(clientId, 10), status };

    try {
      setIsSaving(true);
      if (isEditing) {
        // `updateProject` espera el payload con el `id`
        await updateProject.mutateAsync({ ...projectData, id: Number(id) });
        await assignUsers.mutateAsync({ userIds: assignedTechnicians });
        toast.success('Proyecto actualizado con éxito.');
      } else {
        // `createProject` espera los datos sin `id`
        const projectResponse = await createProject.mutateAsync(projectData);
        await post(`/projects/${projectResponse.id}/users`, { userIds: assignedTechnicians });
        toast.success('Proyecto creado con éxito.');
      }

      navigate('/admin/projects');
    } catch (error) {
      console.error('Failed to save project', error);
      toast.error('Error al guardar el proyecto.');
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading =
    clientsLoading || techniciansLoading || (isEditing && (projectLoading || assignedUsersLoading));

  if (isLoading) {
    return (
      <div className="p-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-dark-blue mb-8">
        {isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto'}
      </h1>

      <div className="bg-white p-8 rounded-lg shadow-md">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Project Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-neutral-gray">
                Nombre del Proyecto
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="client" className="block text-sm font-medium text-neutral-gray">
                Cliente
              </label>
              <select
                id="client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm"
                required
              >
                <option value="" disabled>
                  Selecciona un cliente
                </option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-neutral-gray">
                Estado
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm"
              >
                <option value="active">Activo</option>
                <option value="completed">Completado</option>
              </select>
            </div>
          </div>

          {/* Technician Assignment Section */}
          <div>
            <h3 className="text-lg font-medium text-dark-blue">Asignar Técnicos</h3>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 border-t pt-4">
              {technicians && technicians.length > 0 ? (
                technicians.map((tech) => (
                  <div key={tech.id} className="flex items-center">
                    <input
                      id={`tech-${tech.id}`}
                      type="checkbox"
                      className="h-4 w-4 text-primary-blue border-gray-300 rounded focus:ring-primary-blue"
                      checked={assignedTechnicians.includes(tech.id)}
                      onChange={() => handleTechnicianToggle(tech.id)}
                    />
                    <label htmlFor={`tech-${tech.id}`} className="ml-3 block text-sm text-gray-700">
                      {`${tech.first_name} ${tech.last_name}`}
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-neutral-gray">No hay técnicos disponibles.</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t mt-8">
            <button
              type="button"
              onClick={() => navigate('/admin/projects')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-blue hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar Proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectFormPage;
