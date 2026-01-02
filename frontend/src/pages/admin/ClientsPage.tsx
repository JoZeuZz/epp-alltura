import React, { useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useGet } from '../../hooks/useGet';
import { usePost, usePut, useDelete } from '../../hooks/useMutate';
import { Client } from '../../types/api';
import ClientForm from '../../components/ClientForm';
import Modal from '../../components/Modal';
import ConfirmationModal from '../../components/ConfirmationModal';

const ClientsPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [clientToReactivate, setClientToReactivate] = useState<Client | null>(null);

  const { data: clients, isLoading, error, refetch } = useGet<Client[]>('clients', '/clients');
  const createClient = usePost<Client, Omit<Client, 'id'>>('clients', '/clients');
  const updateClient = usePut<Client, Client>('clients', '/clients');
  const deleteClient = useDelete<Client>('clients', '/clients');

  const handleOpenModal = (client: Client | null = null) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
  };

  const handleSubmit = async (clientData: Partial<Client>) => {
    try {
      if (selectedClient?.id) {
        const updateData: Client = {
          id: selectedClient.id,
          name: clientData.name || selectedClient.name,
          email: clientData.email,
          phone: clientData.phone,
          address: clientData.address,
          specialty: clientData.specialty,
        };
        await updateClient.mutateAsync(updateData);
        toast.success('Cliente actualizado correctamente');
      } else {
        await createClient.mutateAsync(clientData as Omit<Client, 'id'>);
        toast.success('Cliente creado correctamente');
      }
      handleCloseModal();
    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.response?.data?.error || 'Error al guardar el cliente';
      toast.error(errorMsg);
    }
  };

  const handleDelete = async (client: Client) => {
    setClientToDelete(client);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    try {
      const response = await deleteClient.mutateAsync(clientToDelete.id) as any;
      
      // Verificar si fue desactivado o eliminado
      if (response?.deactivated) {
        toast.success('Cliente desactivado correctamente (tiene proyectos vinculados)', {
          icon: '⚠️',
        });
      } else {
        toast.success('Cliente eliminado correctamente');
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || 'Error al eliminar el cliente';
      toast.error(errorMsg);
    }
    setClientToDelete(null);
  };

  const handleReactivate = (client: Client) => {
    setClientToReactivate(client);
    setIsReactivateModalOpen(true);
  };

  const confirmReactivate = async () => {
    if (!clientToReactivate) return;

    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(`/api/clients/${clientToReactivate.id}/reactivate`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success('Cliente reactivado correctamente');
      refetch(); // Refrescar lista de clientes
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || 'Error al reactivar el cliente';
      toast.error(errorMsg);
    }
    setClientToReactivate(null);
  };

  if (isLoading) {
    return <p>Cargando clientes...</p>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-dark-blue">Gestión de Clientes</h1>
        <button
          onClick={() => handleOpenModal()}
          className="bg-primary-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Añadir Cliente
        </button>
      </div>

      {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg mb-4">{error.message}</p>}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Email
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Dirección
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Especialidad
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {clients?.map((client) => (
              <tr key={client.id} className={!client.active ? 'bg-gray-50 opacity-60' : ''}>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  {client.active ? (
                    <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
                      Activo
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full">
                      Desactivado
                    </span>
                  )}
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">{client.name}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900">{client.email || '-'}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">{client.phone || '-'}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900">{client.address || '-'}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900">{client.specialty || '-'}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <button
                    onClick={() => handleOpenModal(client)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                    disabled={!client.active}
                  >
                    Editar
                  </button>
                  {client.active ? (
                    <button
                      onClick={() => handleDelete(client)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Eliminar
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(client)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Reactivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <h2 className="text-2xl font-bold mb-4">
          {selectedClient ? 'Editar Cliente' : 'Nuevo Cliente'}
        </h2>
        <ClientForm client={selectedClient} onSubmit={handleSubmit} onCancel={handleCloseModal} />
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Cliente"
        message={`¿Está seguro de que desea eliminar el cliente "${clientToDelete?.name}"? Si tiene proyectos asociados, será desactivado en lugar de eliminado.`}
        confirmText="Eliminar"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={isReactivateModalOpen}
        onClose={() => setIsReactivateModalOpen(false)}
        onConfirm={confirmReactivate}
        title="Reactivar Cliente"
        message={`¿Está seguro de que desea reactivar el cliente "${clientToReactivate?.name}"? Esto también reactivará todos sus proyectos.`}
        confirmText="Reactivar"
        variant="info"
      />
    </div>
  );
};

export default ClientsPage;
