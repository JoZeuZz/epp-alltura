import { Form, useNavigation, useLoaderData, useActionData } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { User, Client } from '../types/api';
import PasswordStrength from './PasswordStrength';

interface UserFormProps {
  user: User | null;
  onCancel: () => void;
  defaultRole?: User['role'];
  defaultClientId?: number;
}

export default function UserForm({ user, onCancel, defaultRole, defaultClientId }: UserFormProps) {
  const navigation = useNavigation();
  const loaderData = useLoaderData() as { users: User[]; clients?: Client[] };
  const actionData = useActionData() as { success?: boolean; fieldErrors?: Record<string, string> } | undefined;
  const clients = loaderData?.clients || [];
  
  const isSubmitting = navigation.state === 'submitting';
  const isEditing = !!user;
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>(user?.role || defaultRole || 'supervisor');
  const [selectedClientId, setSelectedClientId] = useState<string>(
    user?.client_id ? user.client_id.toString() : defaultClientId ? defaultClientId.toString() : ''
  );
  
  // Obtener errores de validación
  const errors = actionData?.fieldErrors || {};

  useEffect(() => {
    setSelectedRole(user?.role || defaultRole || 'supervisor');
  }, [user, defaultRole]);

  useEffect(() => {
    if (user?.client_id) {
      setSelectedClientId(user.client_id.toString());
      return;
    }
    if (!isEditing) {
      setSelectedClientId(defaultClientId ? defaultClientId.toString() : '');
    }
  }, [defaultClientId, isEditing, user]);

  return (
    <Form method="post">
      {/* Intent field para discriminar entre create y update */}
      <input type="hidden" name="intent" value={user ? 'update' : 'create'} />
      {user && <input type="hidden" name="id" value={user.id} />}

      <div className="mb-4">
        <label htmlFor="first_name" className="block text-gray-700 text-sm font-bold mb-2">
          Nombre *
        </label>
        <input
          type="text"
          id="first_name"
          name="first_name"
          defaultValue={user?.first_name || ''}
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
            errors.first_name ? 'border-red-500 focus:border-red-500' : 'focus:border-primary-blue'
          }`}
          required
          disabled={isSubmitting}
        />
        {errors.first_name && (
          <p className="text-red-500 text-xs italic mt-1">{errors.first_name}</p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="last_name" className="block text-gray-700 text-sm font-bold mb-2">
          Apellido *
        </label>
        <input
          type="text"
          id="last_name"
          name="last_name"
          defaultValue={user?.last_name || ''}
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
            errors.last_name ? 'border-red-500 focus:border-red-500' : 'focus:border-primary-blue'
          }`}
          required
          disabled={isSubmitting}
        />
        {errors.last_name && (
          <p className="text-red-500 text-xs italic mt-1">{errors.last_name}</p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
          Email *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          defaultValue={user?.email || ''}
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
            errors.email ? 'border-red-500 focus:border-red-500' : 'focus:border-primary-blue'
          }`}
          required
          disabled={isSubmitting}
        />
        {errors.email && (
          <p className="text-red-500 text-xs italic mt-1">{errors.email}</p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
          Contraseña {isEditing && '(Dejar en blanco para no cambiar)'}
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
            errors.password ? 'border-red-500 focus:border-red-500' : 'focus:border-primary-blue'
          }`}
          required={!isEditing}
          minLength={isEditing ? 0 : 12}
          disabled={isSubmitting}
        />
        {errors.password && (
          <p className="text-red-500 text-xs italic mt-1">{errors.password}</p>
        )}
        {!isEditing && password && !errors.password && (
          <PasswordStrength password={password} />
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="role" className="block text-gray-700 text-sm font-bold mb-2">
          Rol *
        </label>
        <select
          id="role"
          name="role"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
          disabled={isSubmitting}
        >
          <option value="supervisor">Supervisor</option>
          <option value="admin">Administrador</option>
          <option value="client">Usuario Cliente</option>
        </select>
        <p className="mt-2 text-sm text-gray-600">
          ℹ️ El Usuario Cliente solo puede visualizar andamios de proyectos asignados.
        </p>
      </div>

      {/* Campo condicional: Empresa Cliente (solo para rol client) */}
      {selectedRole === 'client' && (
        <div className="mb-6">
          <label htmlFor="client_id" className="block text-gray-700 text-sm font-bold mb-2">
            Empresa Cliente *
          </label>
          <select
            id="client_id"
            name="client_id"
            value={selectedClientId}
            onChange={(event) => setSelectedClientId(event.target.value)}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
              errors.client_id ? 'border-red-500 focus:border-red-500' : 'focus:border-primary-blue'
            }`}
            required
            disabled={isSubmitting}
          >
            <option value="">Seleccione una empresa</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
            {!isEditing && (
              <option value="__new__">➕ Crear nueva empresa</option>
            )}
          </select>
          {errors.client_id && (
            <p className="text-red-500 text-xs italic mt-1">{errors.client_id}</p>
          )}
          {!errors.client_id && selectedClientId !== '__new__' && (
            <p className="mt-2 text-sm text-gray-600">
              Este usuario solo podrá acceder a proyectos de esta empresa.
            </p>
          )}
        </div>
      )}

      {selectedRole === 'client' && selectedClientId === '__new__' && !isEditing && (
        <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900 mb-3">Nueva empresa cliente</p>
          <div className="mb-4">
            <label htmlFor="client_create_name" className="block text-gray-700 text-sm font-bold mb-2">
              Nombre de la empresa *
            </label>
            <input
              type="text"
              id="client_create_name"
              name="client_create_name"
              className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                errors.client_create_name ? 'border-red-500 focus:border-red-500' : 'focus:border-primary-blue'
              }`}
              required
              disabled={isSubmitting}
            />
            {errors.client_create_name && (
              <p className="text-red-500 text-xs italic mt-1">{errors.client_create_name}</p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="client_create_email" className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              id="client_create_email"
              name="client_create_email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
              disabled={isSubmitting}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="client_create_phone" className="block text-gray-700 text-sm font-bold mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              id="client_create_phone"
              name="client_create_phone"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
              disabled={isSubmitting}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="client_create_address" className="block text-gray-700 text-sm font-bold mb-2">
              Dirección
            </label>
            <input
              type="text"
              id="client_create_address"
              name="client_create_address"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="client_create_specialty" className="block text-gray-700 text-sm font-bold mb-2">
              Especialidad
            </label>
            <input
              type="text"
              id="client_create_specialty"
              name="client_create_specialty"
              placeholder="Ej: Montaje Industrial, Construcción, etc."
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
              disabled={isSubmitting}
            />
          </div>
        </div>
      )}

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
          {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
        </button>
      </div>
    </Form>
  );
}
