import { useEffect, FormEvent } from 'react';
import { Client } from '../types/api';
import { useForm } from '../hooks/useForm';

// Define the initial state for a new client outside the component.
// This ensures the object reference is stable across renders.
const newClientInitialState: Omit<Client, 'id'> = {
  name: '',
  email: '',
  phone: '',
  address: '',
  specialty: '',
};

interface ClientFormProps {
  client: Client | null;
  onSubmit: (clientData: Partial<Client>) => void;
  onCancel: () => void;
}

export default function ClientForm({ client, onSubmit, onCancel }: ClientFormProps): JSX.Element {
  // Use the stable initial state object when creating a new client.
  const { values, handleChange, reset } = useForm(client || newClientInitialState);

  useEffect(() => {
    // This effect now correctly resets the form only when the client prop changes,
    // or when switching between creating and editing.
    reset();
  }, [client]); // The `reset` function is now stable thanks to the fix in `useForm`.

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!values.name) {
      alert('El nombre del cliente es obligatorio.');
      return;
    }
    const submissionData: Partial<Client> = { ...values };
    if (client) {
      submissionData.id = client.id;
    }
    onSubmit(submissionData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
          Nombre del Cliente *
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
        <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={values.email || ''}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="phone" className="block text-gray-700 text-sm font-bold mb-2">
          Teléfono
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={values.phone || ''}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="address" className="block text-gray-700 text-sm font-bold mb-2">
          Dirección
        </label>
        <input
          type="text"
          id="address"
          name="address"
          value={values.address || ''}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
        />
      </div>

      <div className="mb-6">
        <label htmlFor="specialty" className="block text-gray-700 text-sm font-bold mb-2">
          Especialidad
        </label>
        <input
          type="text"
          id="specialty"
          name="specialty"
          value={values.specialty || ''}
          onChange={handleChange}
          placeholder="Ej: Montaje Industrial, Construcción, etc."
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
        />
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
          {client ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
}
