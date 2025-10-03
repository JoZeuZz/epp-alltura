import { useEffect, FormEvent } from 'react';
import { Project, Client } from '../types/api';
import { useForm } from '../hooks/useForm';

interface ProjectFormProps {
  project: Project | null;
  clients: Client[];
  onSubmit: (projectData: Partial<Project>) => void;
  onCancel: () => void;
}

export default function ProjectForm({ project, clients, onSubmit, onCancel }: ProjectFormProps) {
  const { values, handleChange, reset } = useForm({
    name: project?.name || '',
    client_id:
      project?.client_id.toString() || (clients.length > 0 ? clients[0].id.toString() : ''),
    status: project?.status || 'active',
  });

  useEffect(() => {
    reset();
  }, [project, clients, reset]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!values.name || !values.client_id) {
      alert('El nombre y el cliente del proyecto son obligatorios.');
      return;
    }
    onSubmit({
      name: values.name,
      client_id: parseInt(values.client_id),
      status: values.status as 'active' | 'inactive' | 'completed',
    });
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
