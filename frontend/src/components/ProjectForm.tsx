import { Form, useNavigation, useActionData } from 'react-router-dom';
import { useState } from 'react';
import { Project, Client, User } from '../types/api';
import { formatNameParts } from '../utils/name';
import Modal from './Modal';

interface ProjectFormProps {
  project: Project | null;
  clients: Client[];
  supervisors: User[];
  clientUsers: User[];
  onCancel: () => void;
}

export default function ProjectForm({ project, clients, supervisors, clientUsers, onCancel }: ProjectFormProps) {
  const navigation = useNavigation();
  const actionData = useActionData() as { success?: boolean; fieldErrors?: Record<string, string> } | undefined;
  const isSubmitting = navigation.state === 'submitting';
  const [showWarning, setShowWarning] = useState(false);
  const [forceSubmit, setForceSubmit] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    project?.client_id || (clients.length > 0 ? clients[0].id : null)
  );

  // Obtener errores de validación
  const errors = actionData?.fieldErrors || {};

  // Filtrar usuarios cliente según la empresa seleccionada
  const filteredClientUsers = clientUsers.filter(
    (user) => user.client_id === selectedClientId
  );

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Si el usuario confirmó, permitir submit
    if (forceSubmit) {
      return;
    }

    const formData = new FormData(e.currentTarget);
    const assigned_supervisor_id = formData.get('assigned_supervisor_id');
    const assigned_client_id = formData.get('assigned_client_id');

    // Mostrar advertencia si no se asignaron usuarios al crear un proyecto nuevo
    if (!project && (!assigned_supervisor_id || !assigned_client_id)) {
      e.preventDefault();
      setShowWarning(true);
      return;
    }
  };

  const handleContinueWithoutAssignment = () => {
    setShowWarning(false);
    setForceSubmit(true);
    
    // Submit el form después de actualizar el estado
    setTimeout(() => {
      const form = document.getElementById('project-form') as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }, 0);
  };

  return (
    <>
      <Form method="post" id="project-form" onSubmit={handleFormSubmit}>
        {/* Intent field */}
        <input type="hidden" name="intent" value={project ? 'update' : 'create'} />
        {project && <input type="hidden" name="id" value={project.id} />}

        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
            Nombre del Proyecto *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            defaultValue={project?.name || ''}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
              errors.name ? 'border-red-500 focus:border-red-500' : 'focus:border-primary-blue'
            }`}
            required
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="text-red-500 text-xs italic mt-1">{errors.name}</p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="client_id" className="block text-gray-700 text-sm font-bold mb-2">
            Cliente *
          </label>
          <select
            id="client_id"
            name="client_id"
            value={selectedClientId || ''}
            onChange={(e) => setSelectedClientId(Number(e.target.value))}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
              errors.client_id ? 'border-red-500 focus:border-red-500' : 'focus:border-primary-blue'
            }`}
            required
            disabled={isSubmitting}
          >
            <option value="" disabled>
              Seleccione un cliente
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          {errors.client_id && (
            <p className="text-red-500 text-xs italic mt-1">{errors.client_id}</p>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="status" className="block text-gray-700 text-sm font-bold mb-2">
            Estado
          </label>
          <select
            id="status"
            name="status"
            defaultValue={project?.status || 'active'}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
            disabled={isSubmitting}
          >
            <option value="active">Activo</option>
            <option value="completed">Completado</option>
          </select>
          <p className="mt-2 text-sm text-gray-600">
            ℹ️ Para desactivar un proyecto, usa el botón "Eliminar" en la lista de proyectos
          </p>
        </div>

        <div className="mb-4">
          <label htmlFor="assigned_supervisor_id" className="block text-gray-700 text-sm font-bold mb-2">
            Supervisor Asignado
          </label>
          <select
            id="assigned_supervisor_id"
            name="assigned_supervisor_id"
            defaultValue={project?.assigned_supervisor_id?.toString() || ''}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
            disabled={isSubmitting}
          >
            <option value="">Sin asignar</option>
            {supervisors.map((supervisor) => (
              <option key={supervisor.id} value={supervisor.id}>
                {formatNameParts(supervisor.first_name, supervisor.last_name)}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label htmlFor="assigned_client_id" className="block text-gray-700 text-sm font-bold mb-2">
            Usuario Cliente Asignado
          </label>
          <select
            id="assigned_client_id"
            name="assigned_client_id"
            defaultValue={project?.assigned_client_id?.toString() || ''}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
            disabled={isSubmitting}
          >
            <option value="">Sin asignar</option>
            {filteredClientUsers.map((clientUser) => (
              <option key={clientUser.id} value={clientUser.id}>
                {formatNameParts(clientUser.first_name, clientUser.last_name)}
              </option>
            ))}
          </select>
          {filteredClientUsers.length === 0 && selectedClientId && (
            <p className="mt-2 text-sm text-yellow-600">
              ⚠️ No hay usuarios cliente registrados para esta empresa
            </p>
          )}
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 mr-2 disabled:opacity-50"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-primary-blue text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : (project ? 'Actualizar' : 'Crear')}
          </button>
        </div>
      </Form>

      {/* Warning Modal para asignaciones faltantes */}
      <Modal isOpen={showWarning} onClose={() => setShowWarning(false)}>
        <div className="p-4">
          <h3 className="text-xl font-bold mb-4 text-yellow-600">⚠️ Advertencia</h3>
          <p className="mb-4">
            No has asignado un supervisor o un usuario cliente al proyecto. 
            ¿Deseas continuar sin asignar usuarios?
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowWarning(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleContinueWithoutAssignment}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
            >
              Continuar sin asignar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
