import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useGet } from '../../hooks/useGet';
import { usePost, usePut, useDelete } from '../../hooks/useMutate';
import { useFormErrors } from '../../hooks/useFormErrors';
import { Supervisor } from '../../types/api';
import Modal from '../../components/Modal';
import ConfirmationModal from '../../components/ConfirmationModal';

const SupervisorsPage: React.FC = () => {
  const { data: supervisors, isLoading, refetch } = useGet<Supervisor[]>('supervisors', '/supervisors');
  const createSupervisor = usePost<Supervisor, Partial<Supervisor>>('supervisors', '/supervisors');
  const updateSupervisor = usePut<Supervisor, Partial<Supervisor>>('supervisors', '/supervisors');
  const deleteSupervisor = useDelete('supervisors', '/supervisors');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<Supervisor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { handleApiError, clearErrors } = useFormErrors();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    rut: '',
  });

  const handleOpenModal = (supervisor?: Supervisor) => {
    if (supervisor) {
      setEditingSupervisor(supervisor);
      setFormData({
        first_name: supervisor.first_name,
        last_name: supervisor.last_name,
        email: supervisor.email || '',
        phone: supervisor.phone || '',
        rut: supervisor.rut || '',
      });
    } else {
      setEditingSupervisor(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        rut: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupervisor(null);
    clearErrors();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    
    try {
      if (editingSupervisor) {
        await updateSupervisor.mutateAsync({ id: editingSupervisor.id, ...formData });
        toast.success('Supervisor actualizado correctamente');
      } else {
        await createSupervisor.mutateAsync(formData);
        toast.success('Supervisor creado correctamente');
      }
      handleCloseModal();
      refetch();
    } catch (error: any) {
      console.error('Error al guardar el supervisor:', error);
      handleApiError(error);
      
      if (!error?.response?.data?.fieldErrors && !error?.response?.data?.errors) {
        const errorMsg = error?.response?.data?.message || error?.response?.data?.error || 'Error al guardar el supervisor';
        toast.error(errorMsg);
      }
    }
  };

  const handleDelete = async (supervisor: Supervisor) => {
    try {
      await deleteSupervisor.mutateAsync(supervisor.id);
      toast.success('Supervisor eliminado correctamente');
      setDeleteConfirmation(null);
      refetch();
    } catch (error: any) {
      console.error('Error al eliminar el supervisor:', error);
      const errorMsg = error?.response?.data?.error || 'Error al eliminar el supervisor';
      toast.error(errorMsg);
    }
  };

  const filteredSupervisors = supervisors?.filter((supervisor) =>
    supervisor.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supervisor.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supervisor.rut?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <h1 className="text-3xl font-bold text-dark-blue">Gestión de Supervisores</h1>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Nuevo Supervisor
        </button>
      </div>

      <p className="text-gray-600 mb-4">
        Supervisores encargados de los trabajos en terreno
      </p>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre o RUT..."
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
                RUT
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
            {filteredSupervisors?.map((supervisor) => (
              <tr key={supervisor.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {supervisor.first_name} {supervisor.last_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{supervisor.rut || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{supervisor.email || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{supervisor.phone || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleOpenModal(supervisor)}
                    className="text-primary-blue hover:text-blue-700 mr-4"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setDeleteConfirmation(supervisor)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredSupervisors?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No se encontraron supervisores
          </div>
        )}
      </div>

      {/* Modal de formulario */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <h2 className="text-2xl font-bold mb-4">
          {editingSupervisor ? 'Editar Supervisor' : 'Nuevo Supervisor'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Apellido *
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
            <input
              type="text"
              value={formData.rut}
              onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
              placeholder="12.345.678-9"
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
              placeholder="+56 9 1234 5678"
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
              disabled={createSupervisor.isPending || updateSupervisor.isPending}
            >
              {editingSupervisor ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <ConfirmationModal
        isOpen={!!deleteConfirmation}
        title="Eliminar Supervisor"
        message={`¿Está seguro de que desea eliminar al supervisor "${deleteConfirmation?.first_name} ${deleteConfirmation?.last_name}"? Esta acción no se puede deshacer.`}
        onConfirm={() => deleteConfirmation && handleDelete(deleteConfirmation)}
        onClose={() => setDeleteConfirmation(null)}
      />
    </div>
  );
};

export default SupervisorsPage;
