import React, { useState, useEffect } from 'react';
import { useLoaderData, useActionData, useSubmit } from 'react-router';
import toast from 'react-hot-toast';
import { Client } from '../../types/api';
import ClientForm from '../../components/ClientForm';
import Modal from '../../components/Modal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { ClientCard } from '../../components/cards';
import { ResponsiveGrid } from '../../components/layout';
import { useBreakpoints } from '../../hooks';

const ClientsPage: React.FC = () => {
  const { clients } = useLoaderData() as { clients: Client[] };
  const actionData = useActionData() as { success?: boolean; message?: string; warning?: boolean } | undefined;
  const submit = useSubmit();
  const { isMobile } = useBreakpoints();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [clientToReactivate, setClientToReactivate] = useState<Client | null>(null);

  // Manejar respuestas de la action
  useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        if (actionData.warning) {
          toast.success(actionData.message || 'Operación completada', { icon: '⚠️' });
        } else {
          toast.success(actionData.message || 'Operación exitosa');
        }
        // Cerrar modales después de éxito
        setIsModalOpen(false);
        setIsDeleteModalOpen(false);
        setIsReactivateModalOpen(false);
        setSelectedClient(null);
        setClientToDelete(null);
        setClientToReactivate(null);
      } else {
        toast.error(actionData.message || 'Error en la operación');
      }
    }
  }, [actionData]);

  const handleOpenModal = (client: Client | null = null) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
  };

  const handleDelete = async (client: Client) => {
    setClientToDelete(client);
    setIsDeleteModalOpen(true);
  };

  const handleReactivate = (client: Client) => {
    setClientToReactivate(client);
    setIsReactivateModalOpen(true);
  };

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

      {/* Vista móvil: Cards */}
      {isMobile ? (
        <ResponsiveGrid variant="wide" gap="md">
          {clients?.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onEdit={handleOpenModal}
              onDelete={handleDelete}
              onReactivate={handleReactivate}
            />
          ))}
        </ResponsiveGrid>
      ) : (
        /* Vista desktop: Tabla */
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
          <table className="min-w-full leading-normal">
            <caption className="sr-only">Lista de clientes</caption>
          <thead>
            <tr>
              <th scope="col" className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Nombre
              </th>
              <th scope="col" className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Teléfono
              </th>
              <th scope="col" className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Dirección
              </th>
              <th scope="col" className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Especialidad
              </th>
              <th scope="col" className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
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
                    aria-label={`Editar cliente ${client.name}`}
                  >
                    Editar
                  </button>
                  {client.active ? (
                    <button
                      onClick={() => handleDelete(client)}
                      className="text-red-600 hover:text-red-900"
                      aria-label={`Eliminar cliente ${client.name}`}
                    >
                      Eliminar
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(client)}
                      className="text-green-600 hover:text-green-900"
                      aria-label={`Reactivar cliente ${client.name}`}
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
      </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <h2 className="text-2xl font-bold mb-4">
          {selectedClient ? 'Editar Cliente' : 'Nuevo Cliente'}
        </h2>
        <ClientForm client={selectedClient} onCancel={handleCloseModal} />
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          // Usar useSubmit de React Router
          const formData = new FormData();
          formData.append('intent', 'delete');
          formData.append('id', String(clientToDelete?.id || ''));
          
          submit(formData, { method: 'post' });
          
          setIsDeleteModalOpen(false);
        }}
        title="Eliminar Cliente"
        message={`¿Está seguro de que desea eliminar el cliente "${clientToDelete?.name}"? Si tiene proyectos asociados, será desactivado en lugar de eliminado.`}
        confirmText="Eliminar"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={isReactivateModalOpen}
        onClose={() => setIsReactivateModalOpen(false)}
        onConfirm={() => {
          // Usar useSubmit de React Router
          const formData = new FormData();
          formData.append('intent', 'reactivate');
          formData.append('id', String(clientToReactivate?.id || ''));
          
          submit(formData, { method: 'post' });
          
          setIsReactivateModalOpen(false);
        }}
        title="Reactivar Cliente"
        message={`¿Está seguro de que desea reactivar el cliente "${clientToReactivate?.name}"? Esto también reactivará todos sus proyectos.`}
        confirmText="Reactivar"
        variant="info"
      />
    </div>
  );
};

export default ClientsPage;
