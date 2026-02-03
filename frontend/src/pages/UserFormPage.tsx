import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useGet } from '../hooks/useGet';
import { usePost, usePut } from '../hooks/useMutate';
import { useFormErrors } from '../hooks/useFormErrors';
import { User } from '../types/api';
import Spinner from '../components/Spinner';

const userSchema = z.object({
  first_name: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
  last_name: z.string().min(1, 'El apellido es requerido').max(100, 'Máximo 100 caracteres'),
  email: z.string().email('Email inválido').max(255, 'Máximo 255 caracteres'),
  role: z.enum(['admin', 'supervisor', 'client']),
  password: z.string()
    .min(12, 'Mínimo 12 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .optional()
    .or(z.literal('')),
});

type UserFormData = z.infer<typeof userSchema>;

const UserFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const { data: user, isLoading } = useGet<User>(`user-${id}`, `/users/${id}`, {
    enabled: isEditing,
  });

  const createUser = usePost<User, Partial<User>>('users', '/users');
  const updateUser = usePut<User, Partial<User> & { id: number }>('users', '/users');
  
  const { generalError, handleApiError, clearErrors } = useFormErrors();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      role: 'supervisor',
      password: '',
    },
  });

  useEffect(() => {
    if (isEditing && user) {
      reset({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        password: '',
      });
    }
  }, [user, isEditing, reset]);

  const onSubmit = async (data: UserFormData) => {
    clearErrors();

    const userData: Partial<User> = { 
      first_name: data.first_name, 
      last_name: data.last_name, 
      email: data.email, 
      role: data.role 
    };
    
    if (data.password) {
      userData.password = data.password;
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
    } catch (error: unknown) {
      console.error('Failed to save user', error);
      handleApiError(error);
      
      const apiError = error as { response?: { data?: { fieldErrors?: unknown; errors?: unknown; message?: string } } };
      if (!apiError?.response?.data?.fieldErrors && !apiError?.response?.data?.errors) {
        toast.error(apiError?.response?.data?.message || 'Error al guardar el usuario.');
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
        {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
      </h1>

      <div className="bg-white p-8 rounded-lg shadow-md">
        {generalError && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="text-red-800 font-medium">{generalError}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div data-tour="admin-userform-role">
            <label htmlFor="first_name" className="block text-sm font-medium text-neutral-gray">
              Nombre <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="first_name"
                {...register('first_name')}
                aria-invalid={errors.first_name ? 'true' : 'false'}
                aria-describedby={errors.first_name ? 'first_name-error' : undefined}
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm ${
                  errors.first_name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.first_name && (
                <p id="first_name-error" className="text-red-600 text-sm mt-1" role="alert">
                  {errors.first_name.message}
                </p>
              )}
            </div>
          </div>

          <div data-tour="admin-userform-password">
            <label htmlFor="last_name" className="block text-sm font-medium text-neutral-gray">
              Apellido <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="last_name"
                {...register('last_name')}
                aria-invalid={errors.last_name ? 'true' : 'false'}
                aria-describedby={errors.last_name ? 'last_name-error' : undefined}
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm ${
                  errors.last_name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.last_name && (
                <p id="last_name-error" className="text-red-600 text-sm mt-1" role="alert">
                  {errors.last_name.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-gray">
              Email <span className="text-red-500">*</span>
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
            <label htmlFor="role" className="block text-sm font-medium text-neutral-gray">
              Rol <span className="text-red-500">*</span>
            </label>
            <div className="mt-1">
              <select
                id="role"
                {...register('role')}
                aria-invalid={errors.role ? 'true' : 'false'}
                aria-describedby={errors.role ? 'role-error' : undefined}
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm ${
                  errors.role ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="supervisor">Supervisor</option>
                <option value="admin">Administrador</option>
                <option value="client">Cliente</option>
              </select>
              {errors.role && (
                <p id="role-error" className="text-red-600 text-sm mt-1" role="alert">
                  {errors.role.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-gray">
              Contraseña {!isEditing && <span className="text-red-500">*</span>}
            </label>
            <div className="mt-1">
              <input
                type="password"
                id="password"
                {...register('password')}
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : (!isEditing ? 'password-hint' : undefined)}
                className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm ${
                  errors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
                placeholder={isEditing ? 'Dejar en blanco para no cambiar' : 'Mínimo 12 caracteres, 1 mayúscula, 1 minúscula, 1 número'}
              />
              {errors.password && (
                <p id="password-error" className="text-red-600 text-sm mt-1" role="alert">
                  {errors.password.message}
                </p>
              )}
              {!isEditing && !errors.password && (
                <p id="password-hint" className="text-xs text-gray-500 mt-1">
                  La contraseña debe tener al menos 12 caracteres, una mayúscula, una minúscula y un número.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4" data-tour="admin-userform-actions">
            <button
              type="button"
              onClick={() => navigate('/admin/users')}
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

export default UserFormPage;
