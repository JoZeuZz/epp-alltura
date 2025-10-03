import { useEffect, FormEvent } from 'react';
import { Client } from '../types/api';
import { useForm } from '../hooks/useForm';

interface ClientFormProps {
  client: Client | null;
  onSubmit: (clientData: Partial<Client>) => void;
  onCancel: () => void;
}

export default function ClientForm({ client, onSubmit, onCancel }: ClientFormProps): JSX.Element {
  const { values, handleChange, reset } = useForm({
    name: client?.name || '',
    contact_info: client?.contact_info || '',
  });

  useEffect(() => {
    reset();
  }, [client, reset]);

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
          Nombre del Cliente
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
      <div className="mb-6">
        <label htmlFor="contact_info" className="block text-gray-700 text-sm font-bold mb-2">
          Información de Contacto (Email, Teléfono, etc.)
        </label>
        <textarea
          id="contact_info"
          name="contact_info"
          value={values.contact_info}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
          rows={3}
        ></textarea>
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
          Guardar
          {client ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
}
