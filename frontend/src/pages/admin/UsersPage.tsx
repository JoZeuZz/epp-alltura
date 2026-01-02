import React, { useState } from 'react';
import { useGet } from '../../hooks/useGet';
import { usePost, usePut, useDelete } from '../../hooks/useMutate';
import { User } from '../../types/api';
import UserForm from '../../components/UserForm';
import Modal from '../../components/Modal';
import ConfirmationModal from '../../components/ConfirmationModal';

const UsersPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const { data: users, isLoading, error } = useGet<User[]>('users', '/users');
  const createUser = usePost<User, Partial<User>>('users', '/users');
  const updateUser = usePut<User, Partial<User> & { id: number }>('users', '/users');
  const deleteUser = useDelete<User>('users', '/users');

  const handleOpenModal = (user: User | null = null) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleSubmit = async (userData: Partial<User>) => {
    try {
      if (selectedUser) {
        if (userData.password === '') {
          delete userData.password;
        }
        await updateUser.mutateAsync({ ...userData, id: selectedUser.id });
      } else {
        await createUser.mutateAsync(userData);
      }
      handleCloseModal();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser.mutateAsync(userToDelete.id);
    } catch (err) {
      console.error(err);
    }
    setUserToDelete(null);
  };

  if (isLoading) {
    return <p>Cargando usuarios...</p>;
  }

  // Filtrar usuarios por rol
  const filteredUsers = users?.filter(user => 
    roleFilter === 'all' ? true : user.role === roleFilter
  ) || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-dark-blue">Gestión de Usuarios</h1>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Añadir Usuario
        </button>
      </div>

      {/* Filtro por rol */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setRoleFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            roleFilter === 'all'
              ? 'bg-primary-blue text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Todos ({users?.length || 0})
        </button>
        <button
          onClick={() => setRoleFilter('admin')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            roleFilter === 'admin'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Administradores ({users?.filter(u => u.role === 'admin').length || 0})
        </button>
        <button
          onClick={() => setRoleFilter('supervisor')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            roleFilter === 'supervisor'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Supervisores ({users?.filter(u => u.role === 'supervisor').length || 0})
        </button>
        <button
          onClick={() => setRoleFilter('client')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            roleFilter === 'client'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Usuarios Cliente ({users?.filter(u => u.role === 'client').length || 0})
        </button>
      </div>

      {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg mb-4">{error.message}</p>}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Email
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">
                    {`${user.first_name} ${user.last_name}`}
                  </p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">{user.email}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <span
                    className={`capitalize px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' 
                        ? 'bg-red-100 text-red-800' 
                        : user.role === 'supervisor' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {user.role === 'admin' && 'Administrador'}
                    {user.role === 'supervisor' && 'Supervisor'}
                    {user.role === 'client' && 'Usuario Cliente'}
                  </span>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <button
                    onClick={() => handleOpenModal(user)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <h2 className="text-2xl font-bold mb-4">
          {selectedUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        </h2>
        <UserForm user={selectedUser} onSubmit={handleSubmit} onCancel={handleCloseModal} />
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Usuario"
        message={`¿Está seguro de que desea eliminar el usuario "${userToDelete?.first_name} ${userToDelete?.last_name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
};

export default UsersPage;
