import { Form, useNavigation } from 'react-router-dom';
import { useState } from 'react';
import { User } from '../types/api';
import PasswordStrength from './PasswordStrength';

interface UserFormProps {
  user: User | null;
  onCancel: () => void;
}

export default function UserForm({ user, onCancel }: UserFormProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const isEditing = !!user;
  const [password, setPassword] = useState('');

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
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
          required
          disabled={isSubmitting}
        />
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
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
          required
          disabled={isSubmitting}
        />
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
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
          required
          disabled={isSubmitting}
        />
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
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
          required={!isEditing}
          minLength={isEditing ? 0 : 8}
          disabled={isSubmitting}
        />
        {!isEditing && password && (
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
          defaultValue={user?.role || 'supervisor'}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
          disabled={isSubmitting}
        >
          <option value="supervisor">Supervisor</option>
          <option value="admin">Administrador</option>
          <option value="client">Usuario Cliente</option>
        </select>
        <p className="mt-2 text-sm text-gray-600">
          ℹ️ {user?.role === 'client' || 'El Usuario Cliente solo puede visualizar andamios de proyectos asignados.'}
        </p>
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
          {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
        </button>
      </div>
    </Form>
  );
}
