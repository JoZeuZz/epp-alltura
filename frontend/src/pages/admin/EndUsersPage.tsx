import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useGet } from '../../hooks/useGet';
import { usePost, usePut, useDelete } from '../../hooks/useMutate';
import { EndUser, Company } from '../../types/api';
import Modal from '../../components/Modal';
import ConfirmationModal from '../../components/ConfirmationModal';

const EndUsersPage: React.FC = () => {
  const { data: endUsers, isLoading, refetch } = useGet<EndUser[]>('end-users', '/end-users');
  const { data: companies } = useGet<Company[]>('companies', '/companies');
  const createEndUser = usePost<EndUser, Partial<EndUser>>('end-users', '/end-users');
  const updateEndUser = usePut<EndUser, Partial<EndUser>>('end-users', '/end-users');
  const deleteEndUser = useDelete('end-users', '/end-users');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEndUser, setEditingEndUser] = useState<EndUser | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<EndUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    company_id: '',
    email: '',
    phone: '',
    department: '',
  });

  const handleOpenModal = (endUser?: EndUser) => {
    if (endUser) {
      setEditingEndUser(endUser);
      setFormData({
        name: endUser.name,
        company_id: endUser.company_id?.toString() || '',
        email: endUser.email || '',
        phone: endUser.phone || '',
        department: endUser.department || '',
      });
    } else {
      setEditingEndUser(null);
      setFormData({
        name: '',
        company_id: '',
        email: '',
        phone: '',
        department: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEndUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSubmit = {
        ...formData,
        company_id: formData.company_id ? parseInt(formData.company_id) : undefined,
      };
      
      if (editingEndUser) {
        await updateEndUser.mutateAsync({ id: editingEndUser.id, ...dataToSubmit });
        toast.success('Usuario final actualizado correctamente');
      } else {
        await createEndUser.mutateAsync(dataToSubmit);
        toast.success('Usuario final creado correctamente');
      }
      handleCloseModal();
      refetch();
    } catch (error: any) {
      console.error('Error al guardar el usuario final:', error);
      const errorMsg = error?.response?.data?.error || 'Error al guardar el usuario final';
      toast.error(errorMsg);
    }
  };

  const handleDelete = async (endUser: EndUser) => {
    try {
      await deleteEndUser.mutateAsync(endUser.id);
      toast.success('Usuario final eliminado correctamente');
      setDeleteConfirmation(null);
      refetch();
    } catch (error) {
      console.error('Error al eliminar el usuario final:', error);
    }
  };

  const filteredEndUsers = endUsers?.filter((endUser) =>
    endUser.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    endUser.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    endUser.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-dark-blue">Gestión de Usuarios Finales</h1>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Nuevo Usuario Final
        </button>
      </div>

      <p className="text-gray-600 mb-4">
        Equipos o departamentos de las empresas que solicitan los andamios
      </p>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre, empresa o departamento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Empresa
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Departamento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEndUsers?.map((endUser) => (
              <tr key={endUser.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{endUser.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{endUser.company_name || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{endUser.department || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{endUser.email || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{endUser.phone || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleOpenModal(endUser)}
                    className="text-primary-blue hover:text-blue-700 mr-4"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setDeleteConfirmation(endUser)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredEndUsers?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No se encontraron usuarios finales
          </div>
        )}
      </div>

      {/* Modal de formulario */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <h2 className="text-2xl font-bold mb-4">
          {editingEndUser ? 'Editar Usuario Final' : 'Nuevo Usuario Final'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Equipo/Departamento *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
              placeholder="Ej: Equipo de Mantención, Área de Producción"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Empresa
            </label>
            <select
              value={formData.company_id}
              onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
            >
              <option value="">Seleccionar empresa...</option>
              {companies?.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departamento
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
              placeholder="Ej: Mantención Industrial, Producción"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
            />
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-700"
              disabled={createEndUser.isPending || updateEndUser.isPending}
            >
              {editingEndUser ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <ConfirmationModal
        isOpen={!!deleteConfirmation}
        title="Eliminar Usuario Final"
        message={`¿Está seguro de que desea eliminar a "${deleteConfirmation?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={() => deleteConfirmation && handleDelete(deleteConfirmation)}
        onClose={() => setDeleteConfirmation(null)}
      />
    </div>
  );
};

export default EndUsersPage;
