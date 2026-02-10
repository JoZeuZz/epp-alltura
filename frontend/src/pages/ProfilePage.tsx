import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { usePut } from '../hooks/useMutate';
import { useFormErrors } from '../hooks/useFormErrors';
import { User } from '../types/api';
import UserIcon from '../components/icons/UserIcon';
import UploadProgress, { UploadStage } from '../components/UploadProgress';
import { uploadWithProgress } from '../services/apiService';
import {
  processImageFile,
  formatBytes,
  ImageProcessingResult,
  ALLOWED_IMAGE_ACCEPT,
} from '../utils/imageProcessing';

type UserUpdateResponse = { user: User; token: string };

const profileSchema = z.object({
  first_name: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
  last_name: z.string().min(1, 'El apellido es requerido').max(100, 'Máximo 100 caracteres'),
  rut: z.string().max(20, 'Máximo 20 caracteres').optional().or(z.literal('')),
  phone_number: z.string().max(20, 'Máximo 20 caracteres').optional().or(z.literal('')),
  password: z.string()
    .min(12, 'Mínimo 12 caracteres')
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
  const [imageMeta, setImageMeta] = useState<ImageProcessingResult | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadControllerRef = useRef<AbortController | null>(null);

  const updateUser = usePut<UserUpdateResponse, Partial<User>>('user-update', '/users/me');
  
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
      setIsProcessingImage(true);
      const processed = await processImageFile(file, { maxSizeMB: 1, maxWidthOrHeight: 1024 });
      setImageFile(processed.file);
      setImageMeta(processed);
      setImagePreview(URL.createObjectURL(processed.file));
    } catch (error) {
      console.error('Error compressing image:', error);
      toast.error('Error al procesar la imagen.');
      setImageFile(null);
      setImageMeta(null);
      setImagePreview(user?.profile_picture_url || '');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
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

      if (imageFile) {
        const pictureFormData = new FormData();
        pictureFormData.append('profile_picture', imageFile);
        const controller = new AbortController();
        uploadControllerRef.current = controller;
        setUploadProgress(0);
        setUploadStage('processing');
        await new Promise((resolve) => setTimeout(resolve, 0));
        setUploadStage('uploading');
        const pictureResponse = await uploadWithProgress<UserUpdateResponse>(
          'post',
          '/users/me/picture',
          pictureFormData,
          setUploadProgress,
          controller.signal
        );
        setUploadStage('finishing');
        refreshUserData(pictureResponse.user, pictureResponse.token);
        toast.success('¡Perfil actualizado exitosamente!');
      } else {
        toast.success('Datos actualizados con éxito');
      }

      reset((prev) => ({ ...prev, password: '', confirmPassword: '' }));
      setUploadStage('idle');
      setUploadProgress(0);
    } catch (err: unknown) {
      setUploadStage('idle');
      setUploadProgress(0);
      const cancelError = err as { code?: string; name?: string };
      if (cancelError?.code === 'ERR_CANCELED' || cancelError?.name === 'CanceledError') {
        toast('Subida cancelada', { icon: '🛑' });
        return;
      }
      console.error(err);
      handleApiError(err);
      const apiError = err as { response?: { data?: { message?: string; error?: string } } };
      const errorMsg = apiError?.response?.data?.message || apiError?.response?.data?.error || 'Error al actualizar el perfil';
      toast.error(errorMsg);
    } finally {
      uploadControllerRef.current = null;
    }
  };

  const isLocked = isSubmitting || uploadStage !== 'idle' || isProcessingImage;

  const handleCancelUpload = () => {
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = null;
    setUploadStage('idle');
    setUploadProgress(0);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Mi Perfil</h1>

      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 max-w-3xl">
        {generalError && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded" role="alert">
            <p className="text-red-800 text-sm font-medium">{generalError}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Picture */}
          <div className="flex flex-col items-center space-y-3 pb-6 border-b border-gray-200" data-tour="profile-picture">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden ring-4 ring-gray-100">
              {imagePreview ? (
                <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
              )}
            </div>
            <label
              htmlFor="profile-picture-upload"
              className="cursor-pointer bg-white py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cambiar Foto
            </label>
            <input 
              id="profile-picture-upload" 
              name="profile-picture" 
              type="file" 
              className="sr-only" 
              accept={ALLOWED_IMAGE_ACCEPT}
              onChange={handleImageChange} 
              disabled={isLocked}
            />
            {imageMeta && (
              <p className="text-xs text-gray-500">
                {imageMeta.wasCompressed
                  ? `Optimizada: ${formatBytes(imageMeta.originalBytes)} → ${formatBytes(imageMeta.processedBytes)}`
                  : `Tamaño: ${formatBytes(imageMeta.originalBytes)}`}
              </p>
            )}
            {isProcessingImage && (
              <p className="text-xs text-gray-500">Procesando imagen...</p>
            )}
          </div>

          {/* Account Data */}
          <div data-tour="profile-account">
            <h2 className="text-base sm:text-lg font-semibold text-dark-blue mb-3 sm:mb-4">Datos de la Cuenta</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  id="first_name" 
                  {...register('first_name')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.first_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.first_name && (
                  <p className="text-red-600 text-xs mt-1">{errors.first_name.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Apellido <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  id="last_name" 
                  {...register('last_name')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.last_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.last_name && (
                  <p className="text-red-600 text-xs mt-1">{errors.last_name.message}</p>
                )}
              </div>
            </div>
            
            <div className="mt-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email (no se puede cambiar)
              </label>
              <input 
                type="email" 
                id="email" 
                value={user?.email || ''} 
                disabled 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed" 
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva Contraseña
                </label>
                <input 
                  type="password" 
                  id="password" 
                  {...register('password')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Dejar en blanco para no cambiar" 
                />
                {errors.password && (
                  <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Contraseña
                </label>
                <input 
                  type="password" 
                  id="confirmPassword" 
                  {...register('confirmPassword')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.confirmPassword && (
                  <p className="text-red-600 text-xs mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="pt-6 border-t border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-dark-blue mb-3 sm:mb-4">Información Personal</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="rut" className="block text-sm font-medium text-gray-700 mb-1">
                  RUT
                </label>
                <input 
                  type="text" 
                  id="rut" 
                  {...register('rut')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.rut ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: 12.345.678-9" 
                />
                {errors.rut && (
                  <p className="text-red-600 text-xs mt-1">{errors.rut.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input 
                  type="text" 
                  id="phone_number" 
                  {...register('phone_number')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.phone_number ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: +56 9 1234 5678" 
                />
                {errors.phone_number && (
                  <p className="text-red-600 text-xs mt-1">{errors.phone_number.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4" data-tour="profile-save">
            <button
              type="submit"
              disabled={isLocked}
              className="w-full py-2.5 px-4 bg-primary-blue text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {isLocked ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <UploadProgress
              stage={uploadStage}
              progress={uploadProgress}
              className="mt-3 space-y-2"
            />
            {uploadStage !== 'idle' && (
              <button
                type="button"
                onClick={handleCancelUpload}
                className="text-xs text-gray-500 hover:text-gray-700 mt-2"
              >
                Cancelar subida
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
