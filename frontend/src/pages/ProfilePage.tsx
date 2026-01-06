import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { usePut, usePost } from '../hooks/useMutate';
import { useFormErrors } from '../hooks/useFormErrors';
import { User } from '../types/api';
import imageCompression from 'browser-image-compression';
import UserIcon from '../components/icons/UserIcon';

type UserUpdateResponse = { user: User; token: string };

const profileSchema = z.object({
  first_name: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
  last_name: z.string().min(1, 'El apellido es requerido').max(100, 'Máximo 100 caracteres'),
  rut: z.string().max(20, 'Máximo 20 caracteres').optional().or(z.literal('')),
  phone_number: z.string().max(20, 'Máximo 20 caracteres').optional().or(z.literal('')),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .optional()
    .or(z.literal('')),
  confirmPassword: z.string().optional(),
}).refine((data) => !data.password || data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;

const ProfilePage: React.FC = () => {
  const { user, refreshUserData } = useAuth();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(user?.profile_picture_url || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateUser = usePut<UserUpdateResponse, Partial<User>>('user-update', '/users/me');
  const uploadPicture = usePost<UserUpdateResponse, FormData>('user-picture', '/users/me/picture');
  
  const { generalError, handleApiError, clearErrors } = useFormErrors();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      rut: user?.rut || '',
      phone_number: user?.phone_number || '',
      password: '',
      confirmPassword: '',
    },
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      setImageFile(compressedFile);
      setImagePreview(URL.createObjectURL(compressedFile));
    } catch (error) {
      console.error('Error compressing image:', error);
      const errorMsg = 'Error al procesar la imagen.';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setError('');
    setSuccess('');
    clearErrors();

    const updateData: Partial<User> = {
      first_name: data.first_name,
      last_name: data.last_name,
      rut: data.rut,
      phone_number: data.phone_number,
    };

    if (data.password) {
      updateData.password = data.password;
    }

    try {
      const dataResponse = await updateUser.mutateAsync(updateData);
      refreshUserData(dataResponse.user, dataResponse.token);
      setSuccess('Datos actualizados con éxito.');

      if (imageFile) {
        const pictureFormData = new FormData();
        pictureFormData.append('profile_picture', imageFile);
        const pictureResponse = await uploadPicture.mutateAsync(pictureFormData);
        refreshUserData(pictureResponse.user, pictureResponse.token);
        setSuccess('¡Perfil completo actualizado con éxito!');
        toast.success('¡Perfil actualizado exitosamente!');
      } else {
        toast.success('Datos actualizados con éxito');
      }

      reset((prev) => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err: unknown) {
      console.error(err);
      handleApiError(err);
      const apiError = err as { response?: { data?: { message?: string; error?: string; fieldErrors?: unknown; errors?: unknown } } };
      const errorMsg = apiError?.response?.data?.message || apiError?.response?.data?.error || 'Error al actualizar el perfil. Por favor, intente de nuevo.';
      setError(errorMsg);
      
      if (!apiError?.response?.data?.fieldErrors && !apiError?.response?.data?.errors) {
        toast.error(errorMsg);
      }
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-dark-blue mb-6">Mi Perfil</h1>

      <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto">
        {generalError && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded" role="alert">
            <p className="text-red-800 font-medium">{generalError}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Picture */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {imagePreview ? (
                <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-20 h-20 text-gray-400" />
              )}
            </div>
            <label
              htmlFor="profile-picture-upload"
              className="cursor-pointer bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cambiar Foto
            </label>
            <input id="profile-picture-upload" name="profile-picture" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
          </div>

          {/* Account Data */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-dark-blue mb-4">Datos de la Cuenta</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="first_name" className="block text-sm font-bold text-gray-700">Nombre <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  id="first_name" 
                  {...register('first_name')}
                  aria-invalid={errors.first_name ? 'true' : 'false'}
                  aria-describedby={errors.first_name ? 'first_name-error' : undefined}
                  className={`form-input ${
                    errors.first_name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                  }`}
                />
                {errors.first_name && (
                  <p id="first_name-error" className="text-red-600 text-sm mt-1" role="alert">{errors.first_name.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-bold text-gray-700">Apellido <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  id="last_name" 
                  {...register('last_name')}
                  aria-invalid={errors.last_name ? 'true' : 'false'}
                  aria-describedby={errors.last_name ? 'last_name-error' : undefined}
                  className={`form-input ${
                    errors.last_name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                  }`}
                />
                {errors.last_name && (
                  <p id="last_name-error" className="text-red-600 text-sm mt-1" role="alert">{errors.last_name.message}</p>
                )}
              </div>
            </div>
            <div className="mt-6">
              <label htmlFor="email" className="block text-sm font-bold text-gray-700">Email (no se puede cambiar)</label>
              <input type="email" id="email" value={user?.email || ''} disabled className="form-input bg-gray-100 cursor-not-allowed" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-gray-700">Nueva Contraseña</label>
                <input 
                  type="password" 
                  id="password" 
                  {...register('password')}
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={`form-input ${
                    errors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                  }`}
                  placeholder="Dejar en blanco para no cambiar" 
                />
                {errors.password && (
                  <p id="password-error" className="text-red-600 text-sm mt-1" role="alert">{errors.password.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-bold text-gray-700">Confirmar Contraseña</label>
                <input 
                  type="password" 
                  id="confirmPassword" 
                  {...register('confirmPassword')}
                  aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                  aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
                  className={`form-input ${
                    errors.confirmPassword ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                  }`}
                />
                {errors.confirmPassword && (
                  <p id="confirmPassword-error" className="text-red-600 text-sm mt-1" role="alert">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-dark-blue mb-4">Información Personal</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="rut" className="block text-sm font-bold text-gray-700">RUT</label>
                <input 
                  type="text" 
                  id="rut" 
                  {...register('rut')}
                  aria-invalid={errors.rut ? 'true' : 'false'}
                  aria-describedby={errors.rut ? 'rut-error' : undefined}
                  className={`form-input ${
                    errors.rut ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                  }`}
                  placeholder="Ej: 12.345.678-9" 
                />
                {errors.rut && (
                  <p id="rut-error" className="text-red-600 text-sm mt-1" role="alert">{errors.rut.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="phone_number" className="block text-sm font-bold text-gray-700">Teléfono</label>
                <input 
                  type="text" 
                  id="phone_number" 
                  {...register('phone_number')}
                  aria-invalid={errors.phone_number ? 'true' : 'false'}
                  aria-describedby={errors.phone_number ? 'phone_number-error' : undefined}
                  className={`form-input ${
                    errors.phone_number ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                  }`}
                  placeholder="Ej: +56 9 1234 5678" 
                />
                {errors.phone_number && (
                  <p id="phone_number-error" className="text-red-600 text-sm mt-1" role="alert">{errors.phone_number.message}</p>
                )}
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-primary-blue hover:bg-blue-700 focus:outline-none disabled:bg-gray-400"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
