import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useGet } from '../hooks/useGet';
import { usePost, usePut } from '../hooks/useMutate';
import { useFormErrors } from '../hooks/useFormErrors';
import { Client } from '../types/api';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

const ClientFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [specialty, setSpecialty] = useState('');

  const { data: client, isLoading } = useGet<Client>(`client-${id}`, `/clients/${id}`, {
    enabled: isEditing,
  });

  const createClient = usePost<Client, Omit<Client, 'id'>>('clients', '/clients');
  const updateClient = usePut<Client, Client>('clients', '/clients');
  
  const { generalError, handleApiError, clearErrors, getFieldError, clearFieldError } = useFormErrors();

  useEffect(() => {
    if (isEditing && client) {
      setName(client.name);
      setEmail(client.email || '');
      setPhone(client.phone || '');
      setAddress(client.address || '');
      setSpecialty(client.specialty || '');
    }
  }, [client, isEditing]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearErrors();
    
    const clientData = { name, email, phone, address, specialty };

    try {
      if (isEditing) {
        await updateClient.mutateAsync({ ...clientData, id: Number(id) });
        toast.success('Cliente actualizado con éxito.');
      } else {
        await createClient.mutateAsync(clientData);
        toast.success('Cliente creado con éxito.');
      }
      navigate('/admin/clients');
    } catch (error: any) {
      console.error('Failed to save client', error);
      handleApiError(error);
      
      if (!error?.response?.data?.fieldErrors && !error?.response?.data?.errors) {
        toast.error(error?.response?.data?.message || 'Error al guardar el cliente.');
      }
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
        {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
      </h1>

      <div className="bg-white p-8 rounded-lg shadow-md">
        {generalError && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="text-red-800 font-medium">{generalError}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-neutral-gray">
              Nombre del Cliente <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearFieldError('name');
                }}
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm ${
                  getFieldError('name') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
                required
              />
              <ErrorMessage message={getFieldError('name')} />
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
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError('email');
                }}
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm ${
                  getFieldError('email') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
              />
              <ErrorMessage message={getFieldError('email')} />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-neutral-gray">
              Teléfono
            </label>
            <div className="mt-1">
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  clearFieldError('phone');
                }}
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm ${
                  getFieldError('phone') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
                placeholder="+56 9 1234 5678"
              />
              <ErrorMessage message={getFieldError('phone')} />
            </div>
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-neutral-gray">
              Dirección
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  clearFieldError('address');
                }}
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm ${
                  getFieldError('address') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
              />
              <ErrorMessage message={getFieldError('address')} />
            </div>
          </div>

          <div>
            <label htmlFor="specialty" className="block text-sm font-medium text-neutral-gray">
              Especialidad
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="specialty"
                value={specialty}
                onChange={(e) => {
                  setSpecialty(e.target.value);
                  clearFieldError('specialty');
                }}
                placeholder="Ej: Montaje Industrial, Construcción, etc."
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm ${
                  getFieldError('specialty') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
              />
              <ErrorMessage message={getFieldError('specialty')} />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/clients')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue"
              disabled={createClient.isPending || updateClient.isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-blue hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-50"
              disabled={createClient.isPending || updateClient.isPending}
            >
              {createClient.isPending || updateClient.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientFormPage;
