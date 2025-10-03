import React, { useState, useCallback, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePut } from '../hooks/useMutate';
import { User } from '../types/api';

type UserUpdateResponse = User & { token?: string };

const ProfilePage: React.FC = () => {
  const { user, refreshUserToken } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateUser = usePut<UserUpdateResponse, any>('user', '/users/me');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    const updateData: Partial<User> = { name: formData.name };
    if (formData.password) {
      updateData.password = formData.password;
    }

    try {
      const response = await updateUser.mutateAsync(updateData);
      if (response.token) {
        refreshUserToken(response.token);
      }
      setSuccess('¡Perfil actualizado con éxito!');
      setFormData((prev) => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err) {
      setError('Error al actualizar el perfil. Por favor, intente de nuevo.');
      console.error(err);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-dark-blue mb-6">Mi Perfil</h1>

      <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-gray-700">
              Email (no se puede cambiar)
            </label>
            <input
              type="email"
              id="email"
              value={user?.email || ''}
              disabled
              className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-bold text-gray-700">
              Nombre Completo
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-blue focus:border-primary-blue"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-gray-700">
              Nueva Contraseña (dejar en blanco para no cambiar)
            </label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-blue focus:border-primary-blue"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-bold text-gray-700">
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-blue focus:border-primary-blue"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={updateUser.isPending}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-primary-blue hover:bg-blue-700 focus:outline-none disabled:bg-gray-400"
            >
              {updateUser.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
