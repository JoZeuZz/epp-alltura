import React, { useState, useEffect } from 'react';
import { Scaffold } from '../types/api';

interface ScaffoldFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  scaffold?: Scaffold | null;
  projectId?: number;
}

/**
 * Modal para crear o editar un andamio
 * Incluye validaciones de dimensiones, imagen inicial obligatoria y porcentaje de progreso
 */
export const ScaffoldFormModal: React.FC<ScaffoldFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  scaffold = null,
  projectId,
}) => {
  const isEditMode = !!scaffold;
  
  const [formData, setFormData] = useState({
    project_id: projectId || scaffold?.project_id || '',
    width: scaffold?.width || '',
    length: scaffold?.length || '',
    height: scaffold?.height || '',
    progress_percentage: scaffold?.progress_percentage || '0',
    location: scaffold?.location || '',
    observations: scaffold?.observations || '',
  });

  const [initialImage, setInitialImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    scaffold?.initial_image || null
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && scaffold) {
      setFormData({
        project_id: scaffold.project_id || '',
        width: scaffold.width || '',
        length: scaffold.length || '',
        height: scaffold.height || '',
        progress_percentage: scaffold.progress_percentage || '0',
        location: scaffold.location || '',
        observations: scaffold.observations || '',
      });
      setImagePreview(scaffold.initial_image || null);
    }
  }, [isOpen, scaffold]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        initial_image: 'Solo se permiten imágenes JPG, PNG o WEBP',
      }));
      return;
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({
        ...prev,
        initial_image: 'La imagen no puede superar los 5MB',
      }));
      return;
    }

    setInitialImage(file);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.initial_image;
      return newErrors;
    });

    // Vista previa
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar imagen inicial solo en creación
    if (!isEditMode && !initialImage) {
      newErrors.initial_image = 'La imagen inicial es obligatoria';
    }

    // Validar dimensiones
    const width = parseFloat(formData.width as string);
    const length = parseFloat(formData.length as string);
    const height = parseFloat(formData.height as string);

    if (!width || width <= 0 || width > 100) {
      newErrors.width = 'El ancho debe estar entre 0 y 100 metros';
    }
    if (!length || length <= 0 || length > 100) {
      newErrors.length = 'El largo debe estar entre 0 y 100 metros';
    }
    if (!height || height <= 0 || height > 100) {
      newErrors.height = 'La altura debe estar entre 0 y 100 metros';
    }

    // Validar porcentaje de progreso
    const progress = parseFloat(formData.progress_percentage as string);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      newErrors.progress_percentage = 'El progreso debe estar entre 0 y 100';
    }

    // Validar IDs requeridos
    if (!formData.project_id) {
      newErrors.project_id = 'El proyecto es obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();

      // Agregar todos los campos
      Object.entries(formData).forEach(([key, value]) => {
        submitData.append(key, value.toString());
      });

      // Agregar imagen si existe
      if (initialImage) {
        submitData.append('initial_image', initialImage);
      }

      await onSubmit(submitData);
      handleClose();
    } catch (error) {
      console.error('Error al enviar formulario:', error);
      setErrors(prev => ({
        ...prev,
        submit: error instanceof Error ? error.message : 'Error al guardar el andamio',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      project_id: projectId || '',
      width: '',
      length: '',
      height: '',
      progress_percentage: '0',
      location: '',
      observations: '',
    });
    setInitialImage(null);
    setImagePreview(null);
    setErrors({});
    onClose();
  };

  const calculateCubicMeters = () => {
    const width = parseFloat(formData.width as string);
    const length = parseFloat(formData.length as string);
    const height = parseFloat(formData.height as string);

    if (width > 0 && length > 0 && height > 0) {
      return (width * length * height).toFixed(2);
    }
    return '0.00';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            {isEditMode ? 'Editar Andamio' : 'Crear Nuevo Andamio'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error General */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{errors.submit}</p>
            </div>
          )}

          {/* Imagen Inicial */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imagen Inicial {!isEditMode && <span className="text-red-500">*</span>}
            </label>
            <div className="flex items-start space-x-4">
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Vista previa"
                  className="w-24 h-24 object-cover rounded border"
                />
              )}
            </div>
            {errors.initial_image && (
              <p className="mt-1 text-sm text-red-600">{errors.initial_image}</p>
            )}
          </div>

          {/* Dimensiones */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ancho (m) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="width"
                value={formData.width}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                max="100"
                className={`w-full px-3 py-2 border rounded-lg ${
                  errors.width ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {errors.width && (
                <p className="mt-1 text-sm text-red-600">{errors.width}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Largo (m) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="length"
                value={formData.length}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                max="100"
                className={`w-full px-3 py-2 border rounded-lg ${
                  errors.length ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {errors.length && (
                <p className="mt-1 text-sm text-red-600">{errors.length}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Altura (m) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                max="100"
                className={`w-full px-3 py-2 border rounded-lg ${
                  errors.height ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {errors.height && (
                <p className="mt-1 text-sm text-red-600">{errors.height}</p>
              )}
            </div>
          </div>

          {/* Metros Cúbicos Calculados */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800">
              Metros Cúbicos: <span className="text-2xl font-bold">{calculateCubicMeters()} m³</span>
            </p>
          </div>

          {/* Progreso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Porcentaje de Progreso <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="progress_percentage"
              value={formData.progress_percentage}
              onChange={handleInputChange}
              min="0"
              max="100"
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.progress_percentage ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.progress_percentage && (
              <p className="mt-1 text-sm text-red-600">{errors.progress_percentage}</p>
            )}
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, parseFloat(formData.progress_percentage as string) || 0))}%` }}
              />
            </div>
          </div>

          {/* Ubicación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ubicación
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Ej: Sector Norte, Piso 3"
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              name="observations"
              value={formData.observations}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Notas adicionales sobre el andamio..."
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : isEditMode ? 'Guardar Cambios' : 'Crear Andamio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScaffoldFormModal;
