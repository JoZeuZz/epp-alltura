import { useEffect, FormEvent, useState } from 'react';
import { Project, Client, User } from '../types/api';
import { useForm } from '../hooks/useForm';
import Modal from './Modal';

// Define the initial state for a new project outside the component.
// This ensures the object reference is stable across renders.
const newProjectInitialState = {
  name: '',
  client_id: '',
  status: 'active',
  assigned_supervisor_id: '',
  assigned_client_id: '',
};
interface ProjectFormProps {
  project: Project | null;
  clients: Client[];
  supervisors: User[];
  clientUsers: User[];
  onSubmit: (projectData: Partial<Project>) => void;
  onCancel: () => void;
}

export default function ProjectForm({ project, clients, supervisors, clientUsers, onSubmit, onCancel }: ProjectFormProps) {
  const [showWarning, setShowWarning] = useState(false);
  
  const initialValues = project
    ? { 
        name: project.name, 
        client_id: project.client_id.toString(), 
        status: project.status,
        assigned_supervisor_id: project.assigned_supervisor_id?.toString() || '',
        assigned_client_id: project.assigned_client_id?.toString() || '',
      }
    : { 
        ...newProjectInitialState, 
        client_id: clients.length > 0 ? clients[0].id.toString() : '' 
      };

  const { values, handleChange, reset } = useForm(initialValues);

  useEffect(() => {
    reset();
    setShowWarning(false);
    // The `reset` and `clients` dependencies can be removed because the logic is now handled by `initialValues`
  }, [project]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!values.name || !values.client_id) {
      alert('El nombre y el cliente del proyecto son obligatorios.');
      return;
    }
    
    // Mostrar advertencia si no se asignaron usuarios al crear un proyecto nuevo
    if (!project && (!values.assigned_supervisor_id || !values.assigned_client_id)) {
      setShowWarning(true);
      return;
    }
    
    submitForm();
  };
  
  const submitForm = () => {
    onSubmit({
      name: values.name,
      client_id: parseInt(values.client_id),
      status: values.status as 'active' | 'inactive' | 'completed',
      assigned_supervisor_id: values.assigned_supervisor_id ? parseInt(values.assigned_supervisor_id) : undefined,
      assigned_client_id: values.assigned_client_id ? parseInt(values.assigned_client_id) : undefined,
    });
  };
  
  const handleContinueWithoutAssignment = () => {
    setShowWarning(false);
    submitForm();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
          Nombre del Proyecto
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={values.name}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
          required
        />
      </div>
      <div className="mb-4">
        <label htmlFor="client_id" className="block text-gray-700 text-sm font-bold mb-2">
          Cliente
        </label>
        <select
          id="client_id"
          name="client_id"
          value={values.client_id}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
          required
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
      </div>
      <div className="mb-6">
        <label htmlFor="status" className="block text-gray-700 text-sm font-bold mb-2">
          Estado
        </label>
        <select
          id="status"
          name="status"
          value={values.status}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
        >
          <option value="active">Activo</option>
          <option value="completed">Completado</option>
        </select>
      </div>
      
      {/* Asignación de Supervisor */}
      <div className="mb-4">
        <label htmlFor="assigned_supervisor_id" className="block text-gray-700 text-sm font-bold mb-2">
          Supervisor Asignado {!project && <span className="text-yellow-600 text-xs">(Opcional)</span>}
        </label>
        <select
          id="assigned_supervisor_id"
          name="assigned_supervisor_id"
          value={values.assigned_supervisor_id}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
        >
          <option value="">Sin asignar</option>
          {supervisors.map((supervisor) => (
            <option key={supervisor.id} value={supervisor.id}>
              {supervisor.first_name} {supervisor.last_name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Asignación de Usuario Cliente */}
      <div className="mb-6">
        <label htmlFor="assigned_client_id" className="block text-gray-700 text-sm font-bold mb-2">
          Usuario Cliente Asignado {!project && <span className="text-yellow-600 text-xs">(Opcional)</span>}
        </label>
        <select
          id="assigned_client_id"
          name="assigned_client_id"
          value={values.assigned_client_id}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
        >
          <option value="">Sin asignar</option>
          {clientUsers.map((client) => (
            <option key={client.id} value={client.id}>
              {client.first_name} {client.last_name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Modal de Advertencia */}
      <Modal isOpen={showWarning} onClose={() => setShowWarning(false)}>
        <div className="p-6">
          {/* Icono de advertencia */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <svg
              className="h-6 w-6 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          
          {/* Contenido */}
          <div className="mt-3 text-center sm:mt-5">
            <h3 className="text-lg font-semibold leading-6 text-gray-900">
              Usuarios sin asignar
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                No has asignado un supervisor o usuario cliente a este proyecto.
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Puedes asignarlos más adelante desde la gestión de proyectos.
              </p>
            </div>
          </div>
          
          {/* Botones */}
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowWarning(false)}
              className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1"
            >
              Volver a editar
            </button>
            <button
              type="button"
              onClick={handleContinueWithoutAssignment}
              className="inline-flex w-full justify-center rounded-md bg-yellow-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600 sm:col-start-2"
            >
              Continuar sin asignar
            </button>
          </div>
        </div>
      </Modal>
      
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 mr-2"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="bg-primary-blue text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700"
        >
          {project ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
}
