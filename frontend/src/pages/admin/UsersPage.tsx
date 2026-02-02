import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLoaderData, Form, useActionData, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User } from '../../types/api';
import UserForm from '../../components/UserForm';
import Modal from '../../components/Modal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { UserCard } from '../../components/cards';
import { ResponsiveGrid } from '../../components/layout';
import { useBreakpoints } from '../../hooks';
import { formatNameParts } from '../../utils/name';

const UsersPage: React.FC = () => {
  const { users } = useLoaderData() as { users: User[] };
  const actionData = useActionData() as { success?: boolean; message?: string; fieldErrors?: Record<string, string> } | undefined;
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile } = useBreakpoints();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [defaultRole, setDefaultRole] = useState<User['role'] | null>(null);
  const [defaultClientId, setDefaultClientId] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Manejar respuestas de la action
  useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        toast.success(actionData.message || 'Operación exitosa');
        setIsModalOpen(false);
        setIsDeleteModalOpen(false);
        setSelectedUser(null);
        setUserToDelete(null);
        setDefaultRole(null);
        setDefaultClientId(null);
      } else {
        // Solo mostrar toast si no hay errores de campo específicos (errores de validación inline)
        const hasFieldErrors = actionData.fieldErrors && Object.keys(actionData.fieldErrors).length > 0;
        if (!hasFieldErrors) {
          toast.error(actionData.message || 'Error en la operación');
        }
        // Los errores de campo se muestran inline en el formulario
      }
    }
  }, [actionData]);

  const handleOpenModal = useCallback((user: User | null = null, defaults?: { role?: User['role']; clientId?: number }) => {
    setSelectedUser(user);
    setDefaultRole(defaults?.role ?? null);
    setDefaultClientId(defaults?.clientId ?? null);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setDefaultRole(null);
    setDefaultClientId(null);
  }, []);

  useEffect(() => {
    const state = location.state as { openCreateUser?: boolean; clientId?: number } | null;
    const searchParams = new URLSearchParams(location.search);
    const queryClientId = searchParams.get('clientId');
    const shouldOpen =
      state?.openCreateUser === true || searchParams.get('openCreateUser') === '1';

    if (shouldOpen) {
      const clientId = state?.clientId ?? (queryClientId ? parseInt(queryClientId, 10) : undefined);
      handleOpenModal(null, { role: 'client', clientId: clientId || undefined });
      navigate('/admin/users', { replace: true, state: null });
    }
  }, [handleOpenModal, location.search, location.state, navigate]);

  const handleDelete = useCallback((user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  }, []);

  const handleHistory = useCallback((userId: number) => {
    navigate(`/admin/users/${userId}/history`);
  }, [navigate]);

  // Filtrar usuarios por rol con useMemo
  const filteredUsers = useMemo(() => 
    users?.filter(user => 
      roleFilter === 'all' ? true : user.role === roleFilter
    ) || [], 
    [users, roleFilter]
  );

  // Conteos de usuarios por rol memoizados
  const userCounts = useMemo(() => ({
    admin: users?.filter(u => u.role === 'admin').length || 0,
    supervisor: users?.filter(u => u.role === 'supervisor').length || 0,
    client: users?.filter(u => u.role === 'client').length || 0,
  }), [users]);

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
      <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
        <button
          onClick={() => setRoleFilter('all')}
          className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
            roleFilter === 'all'
              ? 'bg-primary-blue text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Todos ({users?.length || 0})
        </button>
        <button
          onClick={() => setRoleFilter('admin')}
          className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
            roleFilter === 'admin'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Admins ({userCounts.admin})
        </button>
        <button
          onClick={() => setRoleFilter('supervisor')}
          className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
            roleFilter === 'supervisor'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Supervisores ({userCounts.supervisor})
        </button>
        <button
          onClick={() => setRoleFilter('client')}
          className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
            roleFilter === 'client'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Clientes ({userCounts.client})
        </button>
      </div>

      {/* Vista móvil: Cards */}
      {isMobile ? (
        <ResponsiveGrid variant="wide" gap="md">
          {filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={handleOpenModal}
              onDelete={(userId) => {
                const user = users.find(u => u.id === userId);
                if (user) handleDelete(user);
              }}
              onHistory={handleHistory}
              currentUserRole={user.role}
            />
          ))}
        </ResponsiveGrid>
      ) : (
        /* Vista desktop: Tabla */
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-full leading-normal">
            <caption className="sr-only">Lista de usuarios del sistema</caption>
          <thead>
            <tr>
              <th scope="col" className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Nombre
              </th>
              <th scope="col" className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Rol
              </th>
              <th scope="col" className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">
                    {formatNameParts(user.first_name, user.last_name)}
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
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm whitespace-nowrap">
                  {(user.role === 'admin' || user.role === 'supervisor') && (
                    <button
                      onClick={() => navigate(`/admin/users/${user.id}/history`)}
                      className="text-purple-600 hover:text-purple-900 mr-4"
                      title="Ver historial de cambios"
                      aria-label={`Ver historial de ${formatNameParts(user.first_name, user.last_name)}`}
                    >
                      Historial
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenModal(user)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                    aria-label={`Editar usuario ${formatNameParts(user.first_name, user.last_name)}`}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    className="text-red-600 hover:text-red-900"
                    aria-label={`Eliminar usuario ${formatNameParts(user.first_name, user.last_name)}`}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      )}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <h2 className="text-2xl font-bold mb-4">
          {selectedUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        </h2>
        <UserForm
          user={selectedUser}
          onCancel={handleCloseModal}
          defaultRole={defaultRole || undefined}
          defaultClientId={defaultClientId || undefined}
        />
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {}}
        title="Eliminar Usuario"
        message={`¿Está seguro de que desea eliminar el usuario "${formatNameParts(userToDelete?.first_name, userToDelete?.last_name)}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      >
        <Form method="post" onSubmit={() => setIsDeleteModalOpen(false)}>
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="id" value={userToDelete?.id || ''} />
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Eliminar
            </button>
          </div>
        </Form>
      </ConfirmationModal>
    </div>
  );
};

export default UsersPage;
