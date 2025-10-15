import React, { useState, useCallback, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePut, usePost } from '../hooks/useMutate';
import { User } from '../types/api';
import imageCompression from 'browser-image-compression';
import UserIcon from '../components/icons/UserIcon';

type UserUpdateResponse = { user: User; token: string };

const ProfilePage: React.FC = () => {
  const { user, refreshUserData } = useAuth();

  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    rut: user?.rut || '',
    phone_number: user?.phone_number || '',
    password: '',
    confirmPassword: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(user?.profile_picture_url || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateUser = usePut<UserUpdateResponse, Partial<User>>('user-update', '/users/me');
  const uploadPicture = usePost<UserUpdateResponse, FormData>('user-picture', '/users/me/picture');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  }, []);

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
      setError('Error al procesar la imagen.');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    // 1. Update textual data
    const updateData: Partial<User> = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      rut: formData.rut,
      phone_number: formData.phone_number,
    };

    if (formData.password) {
      updateData.password = formData.password;
    }

    try {
      const dataResponse = await updateUser.mutateAsync(updateData);
      refreshUserData(dataResponse.user, dataResponse.token);
      setSuccess('Datos actualizados con éxito.');

      // 2. If there's a new image, upload it
      if (imageFile) {
        const pictureFormData = new FormData();
        pictureFormData.append('profile_picture', imageFile);
        const pictureResponse = await uploadPicture.mutateAsync(pictureFormData);
        refreshUserData(pictureResponse.user, pictureResponse.token);
        setSuccess('¡Perfil completo actualizado con éxito!');
      }

      setFormData((prev) => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err) {
      setError('Error al actualizar el perfil. Por favor, intente de nuevo.');
      console.error(err);
    }
  };
  
  const isPending = updateUser.isPending || uploadPicture.isPending;

  return (
    <div>
      <h1 className="text-3xl font-bold text-dark-blue mb-6">Mi Perfil</h1>

      <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
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
                <label htmlFor="first_name" className="block text-sm font-bold text-gray-700">Nombre</label>
                <input type="text" id="first_name" value={formData.first_name} onChange={handleChange} className="form-input" required />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-bold text-gray-700">Apellido</label>
                <input type="text" id="last_name" value={formData.last_name} onChange={handleChange} className="form-input" required />
              </div>
            </div>
            <div className="mt-6">
              <label htmlFor="email" className="block text-sm font-bold text-gray-700">Email (no se puede cambiar)</label>
              <input type="email" id="email" value={user?.email || ''} disabled className="form-input bg-gray-100 cursor-not-allowed" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-gray-700">Nueva Contraseña</label>
                <input type="password" id="password" value={formData.password} onChange={handleChange} className="form-input" placeholder="Dejar en blanco para no cambiar" />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-bold text-gray-700">Confirmar Contraseña</label>
                <input type="password" id="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="form-input" />
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-dark-blue mb-4">Información Personal</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="rut" className="block text-sm font-bold text-gray-700">RUT</label>
                <input type="text" id="rut" value={formData.rut} onChange={handleChange} className="form-input" placeholder="Ej: 12.345.678-9" />
              </div>
              <div>
                <label htmlFor="phone_number" className="block text-sm font-bold text-gray-700">Teléfono</label>
                <input type="text" id="phone_number" value={formData.phone_number} onChange={handleChange} className="form-input" placeholder="Ej: +56 9 1234 5678" />
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-primary-blue hover:bg-blue-700 focus:outline-none disabled:bg-gray-400"
            >
              {isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
