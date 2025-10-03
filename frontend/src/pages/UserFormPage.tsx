import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useGet } from '../hooks/useGet';
import { usePost, usePut } from '../hooks/useMutate';
import { User } from '../types/api';
import Spinner from '../components/Spinner';

const UserFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('technician');
  const [password, setPassword] = useState('');

  const { data: user, isLoading } = useGet<User>(`user-${id}`, `/users/${id}`, {
    enabled: isEditing,
  });

  const createUser = usePost<User, Partial<User>>('users', '/users');
  const updateUser = usePut<User, Partial<User> & { id: number }>('users', '/users');

  useEffect(() => {
    if (isEditing && user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
    }
  }, [user, isEditing]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const userData: Partial<User> = { name, email, role: role as 'admin' | 'technician' };
    if (password) {
      userData.password = password;
    }

    try {
      if (isEditing) {
        await updateUser.mutateAsync({ ...userData, id: Number(id) });
        toast.success('Usuario actualizado con éxito.');
      } else {
        await createUser.mutateAsync(userData);
        toast.success('Usuario creado con éxito.');
      }
      navigate('/admin/users');
    } catch (error) {
      console.error('Failed to save user', error);
      toast.error('Error al guardar el usuario.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-dark-blue mb-8">
        {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
      </h1>

      <div className="bg-white p-8 rounded-lg shadow-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-neutral-gray">
              Nombre
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-gray">
              Email
            </label>
            <div className="mt-1">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-neutral-gray">
              Rol
            </label>
            <div className="mt-1">
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm"
              >
                <option value="technician">Técnico</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-gray">
              Contraseña
            </label>
            <div className="mt-1">
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm"
                placeholder={isEditing ? 'Dejar en blanco para no cambiar' : ''}
                required={!isEditing}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue"
              disabled={createUser.isPending || updateUser.isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-blue hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-50"
              disabled={createUser.isPending || updateUser.isPending}
            >
              {createUser.isPending || updateUser.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormPage;
