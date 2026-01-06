import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useGet } from '../hooks/useGet';
import { usePost, usePut } from '../hooks/useMutate';
import { useFormErrors } from '../hooks/useFormErrors';
import { Client } from '../types/api';
import Spinner from '../components/Spinner';

const clientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(255, 'Máximo 255 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().max(20, 'Máximo 20 caracteres').optional().or(z.literal('')),
  address: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
  specialty: z.string().max(255, 'Máximo 255 caracteres').optional().or(z.literal('')),
});

type ClientFormData = z.infer<typeof clientSchema>;

const ClientFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const { data: client, isLoading } = useGet<Client>(`client-${id}`, `/clients/${id}`, {
    enabled: isEditing,
  });

  const createClient = usePost<Client, Omit<Client, 'id'>>('clients', '/clients');
  const updateClient = usePut<Client, Client>('clients', '/clients');
  
  const { generalError, handleApiError, clearErrors } = useFormErrors();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      specialty: '',
    },
  });

  useEffect(() => {
    if (isEditing && client) {
      reset({
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        specialty: client.specialty || '',
      });
    }
  }, [client, isEditing, reset]);

  const onSubmit = async (data: ClientFormData) => {
    clearErrors();

    try {
      if (isEditing) {
        await updateClient.mutateAsync({ ...data, id: Number(id) } as Client);
        toast.success('Cliente actualizado con éxito.');
      } else {
        await createClient.mutateAsync(data);
        toast.success('Cliente creado con éxito.');
      }
      navigate('/admin/clients');
    } catch (error: unknown) {
      console.error('Failed to save client', error);
      handleApiError(error);
      
      const apiError = error as { response?: { data?: { fieldErrors?: unknown; errors?: unknown; message?: string } } };
      if (!apiError?.response?.data?.fieldErrors && !apiError?.response?.data?.errors) {
        toast.error(apiError?.response?.data?.message || 'Error al guardar el cliente.');
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
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-neutral-gray">
              Nombre del Cliente <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="name"
                {...register('name')}
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'name-error' : undefined}
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm ${
                  errors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && (
                <p id="name-error" className="text-red-600 text-sm mt-1" role="alert">
                  {errors.name.message}
                </p>
              )}
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
                {...register('email')}
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm ${
                  errors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && (
                <p id="email-error" className="text-red-600 text-sm mt-1" role="alert">
                  {errors.email.message}
                </p>
              )}
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
                {...register('phone')}
                aria-invalid={errors.phone ? 'true' : 'false'}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm ${
                  errors.phone ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
                placeholder="+56 9 1234 5678"
              />
              {errors.phone && (
                <p id="phone-error" className="text-red-600 text-sm mt-1" role="alert">
                  {errors.phone.message}
                </p>
              )}
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
                {...register('address')}
                aria-invalid={errors.address ? 'true' : 'false'}
                aria-describedby={errors.address ? 'address-error' : undefined}
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm ${
                  errors.address ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.address && (
                <p id="address-error" className="text-red-600 text-sm mt-1" role="alert">
                  {errors.address.message}
                </p>
              )}
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
                {...register('specialty')}
                aria-invalid={errors.specialty ? 'true' : 'false'}
                aria-describedby={errors.specialty ? 'specialty-error' : undefined}
                placeholder="Ej: Montaje Industrial, Construcción, etc."
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm ${
                  errors.specialty ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.specialty && (
                <p id="specialty-error" className="text-red-600 text-sm mt-1" role="alert">
                  {errors.specialty.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/clients')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-blue hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientFormPage;
