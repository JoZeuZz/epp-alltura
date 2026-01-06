import { Form, useNavigation } from 'react-router-dom';
import { Client } from '../types/api';

interface ClientFormProps {
  client: Client | null;
  onCancel: () => void;
}

export default function ClientForm({ client, onCancel }: ClientFormProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <Form method="post">
      {/* Intent field para discriminar entre create y update */}
      <input type="hidden" name="intent" value={client ? 'update' : 'create'} />
      {client && <input type="hidden" name="id" value={client.id} />}

      <div className="mb-4">
        <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
          Nombre del Cliente *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          defaultValue={client?.name || ''}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
          required
          disabled={isSubmitting}
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
          defaultValue={client?.email || ''}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
          disabled={isSubmitting}
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
          defaultValue={client?.phone || ''}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
          disabled={isSubmitting}
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
          defaultValue={client?.address || ''}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
          disabled={isSubmitting}
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
          defaultValue={client?.specialty || ''}
          placeholder="Ej: Montaje Industrial, Construcción, etc."
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
          disabled={isSubmitting}
        />
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
          {isSubmitting ? 'Guardando...' : (client ? 'Actualizar' : 'Crear')}
        </button>
      </div>
    </Form>
  );
}
