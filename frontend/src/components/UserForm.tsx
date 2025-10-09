import { useEffect, FormEvent, useState } from 'react';
import { User } from '../types/api';
import { useForm } from '../hooks/useForm';
import PasswordStrength from './PasswordStrength.tsx';

// Define the initial state for a new user outside the component.
// This ensures the object reference is stable across renders.
const newUserInitialState = {
  name: '',
  email: '',
  password: '',
  role: 'technician',
};
interface Props {
  user: User | null;
  onSubmit: (user: Partial<User>) => void;
  onCancel: () => void;
}

export default function UserForm({ user, onSubmit, onCancel }: Props) {
  const initialValues = user
    ? { name: user.name, email: user.email, password: '', role: user.role }
    : newUserInitialState;

  const { values, handleChange, reset } = useForm(initialValues);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = !!user;

  useEffect(() => {
    reset();
  }, [user]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null); // Limpiar errores previos

    if (!values.name || !values.email || (!isEditing && !values.password)) {
      setFormError('Por favor, complete todos los campos obligatorios.');
      return;
    }
    if (!isEditing && values.password.length < 8) {
      setFormError('La contraseña no cumple con los requisitos.');
      return;
    }
    const userData: Partial<User> = {
      name: values.name,
      email: values.email,
      role: values.role as 'admin' | 'technician',
    };
    if (values.password) {
      userData.password = values.password;
    }
    onSubmit(userData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {formError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {formError}
        </div>
      )}
      <div className="mb-4">
        <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
          Nombre Completo
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
          value={values.email}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
          required
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
          value={values.password}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
          required={!isEditing}
        />
        {!isEditing && (
          <PasswordStrength password={values.password} />
        )}
      </div>
      <div className="mb-6">
        <label htmlFor="role" className="block text-gray-700 text-sm font-bold mb-2">
          Rol
        </label>
        <select
          id="role"
          name="role"
          value={values.role}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-primary-blue"
        >
          <option value="technician">Técnico</option>
          <option value="admin">Administrador</option>
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
          {isEditing ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
}
