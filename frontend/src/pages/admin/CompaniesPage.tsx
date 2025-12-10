import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useGet } from '../../hooks/useGet';
import { usePost, usePut, useDelete } from '../../hooks/useMutate';
import { useFormErrors } from '../../hooks/useFormErrors';
import { Company } from '../../types/api';
import Modal from '../../components/Modal';
import ConfirmationModal from '../../components/ConfirmationModal';

const CompaniesPage: React.FC = () => {
  const { data: companies, isLoading, refetch } = useGet<Company[]>('companies', '/companies');
  const createCompany = usePost<Company, Partial<Company>>('companies', '/companies');
  const updateCompany = usePut<Company, Partial<Company>>('companies', '/companies');
  const deleteCompany = useDelete('companies', '/companies');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { handleApiError, clearErrors } = useFormErrors();

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
  });

  const handleOpenModal = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        name: company.name,
        contact_person: company.contact_person || '',
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || '',
      });
    } else {
      setEditingCompany(null);
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
    clearErrors();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    
    try {
      if (editingCompany) {
        await updateCompany.mutateAsync({ id: editingCompany.id, ...formData });
        toast.success('Empresa actualizada correctamente');
      } else {
        await createCompany.mutateAsync(formData);
        toast.success('Empresa creada correctamente');
      }
      handleCloseModal();
      refetch();
    } catch (error: any) {
      console.error('Error al guardar la empresa:', error);
      handleApiError(error);
      
      if (!error?.response?.data?.fieldErrors && !error?.response?.data?.errors) {
        const errorMsg = error?.response?.data?.message || error?.response?.data?.error || 'Error al guardar la empresa';
        toast.error(errorMsg);
      }
    }
  };

  const handleDelete = async (company: Company) => {
    try {
      await deleteCompany.mutateAsync(company.id);
      toast.success('Empresa eliminada correctamente');
      setDeleteConfirmation(null);
      refetch();
    } catch (error: any) {
      console.error('Error al eliminar la empresa:', error);
      const errorMsg = error?.response?.data?.error || 'Error al eliminar la empresa';
      toast.error(errorMsg);
    }
  };

  const filteredCompanies = companies?.filter((company) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <h1 className="text-3xl font-bold text-dark-blue">Gestión de Empresas</h1>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Nueva Empresa
        </button>
      </div>

      <p className="text-gray-600 mb-4">
        Empresas dueñas de las plantas donde se realizan los trabajos (ej: CMPC, Arauco, etc.)
      </p>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre o persona de contacto..."
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
                Persona de Contacto
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
            {filteredCompanies?.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{company.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{company.contact_person || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{company.email || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{company.phone || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleOpenModal(company)}
                    className="text-primary-blue hover:text-blue-700 mr-4"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setDeleteConfirmation(company)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCompanies?.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No se encontraron empresas
          </div>
        )}
      </div>

      {/* Modal de formulario */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <h2 className="text-2xl font-bold mb-4">
          {editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la Empresa *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Persona de Contacto
            </label>
            <input
              type="text"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue"
              rows={3}
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
              disabled={createCompany.isPending || updateCompany.isPending}
            >
              {editingCompany ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <ConfirmationModal
        isOpen={!!deleteConfirmation}
        title="Eliminar Empresa"
        message={`¿Está seguro de que desea eliminar la empresa "${deleteConfirmation?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={() => deleteConfirmation && handleDelete(deleteConfirmation)}
        onClose={() => setDeleteConfirmation(null)}
      />
    </div>
  );
};

export default CompaniesPage;
