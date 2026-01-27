import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useParams, useNavigate, useLocation, useLoaderData, Form, useActionData, useNavigation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Project } from '../../types/api';
import { IMAGE_MAX_BYTES, IMAGE_MAX_LABEL } from '../../config/imageLimits';

/**
 * Página para crear un nuevo andamio
 * Incluye todos los campos necesarios: dimensiones, área, TAG, ubicación, etc.
 * Funciona tanto para supervisor como para admin
 */
const CreateScaffoldPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { project } = useLoaderData() as { project: Project };
  const actionData = useActionData() as { success?: boolean; message?: string } | undefined;
  const navigation = useNavigation();
  
  // Detectar si es admin o supervisor basado en la ruta
  const isAdmin = routeLocation.pathname.startsWith('/admin');
  const projectLoading = false;
  const isSubmitting = navigation.state === 'submitting';

  // Manejar respuestas de la action
  useEffect(() => {
    if (actionData) {
      if (actionData.success) {
        toast.success(actionData.message || 'Andamio creado exitosamente');
      } else {
        toast.error(actionData.message || 'Error al crear andamio');
      }
    }
  }, [actionData]);

  // Estados del formulario
  const [scaffoldNumber, setScaffoldNumber] = useState<string>('');
  const [area, setArea] = useState<string>('');
  const [tag, setTag] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [width, setWidth] = useState<string>('');
  const [length, setLength] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState<number>(100);
  const [location, setLocation] = useState<string>('');
  const [observations, setObservations] = useState<string>('');
  const [assemblyNotes, setAssemblyNotes] = useState<string>('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [cubicMeters, setCubicMeters] = useState<string>('0.00');

  // Calcular metros cúbicos automáticamente
  useEffect(() => {
    const h = parseFloat(height) || 0;
    const w = parseFloat(width) || 0;
    const l = parseFloat(length) || 0;
    setCubicMeters((h * w * l).toFixed(2));
  }, [height, width, length]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar tipo de archivo
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Solo se permiten imágenes JPG, PNG o WEBP');
        return;
      }

      // Validar tamaño (máx configurado)
      if (file.size > IMAGE_MAX_BYTES) {
        toast.error(`La imagen no puede superar los ${IMAGE_MAX_LABEL}`);
        return;
      }

      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleFormValidation = (e: FormEvent<HTMLFormElement>) => {
    if (!image) {
      e.preventDefault();
      toast.error('Por favor, adjunta una imagen del andamio.');
      return;
    }

    // Validar dimensiones
    const h = parseFloat(height);
    const w = parseFloat(width);
    const l = parseFloat(length);

    if (!h || h <= 0 || h > 100) {
      e.preventDefault();
      toast.error('La altura debe estar entre 0 y 100 metros');
      return;
    }
    if (!w || w <= 0 || w > 100) {
      e.preventDefault();
      toast.error('El ancho debe estar entre 0 y 100 metros');
      return;
    }
    if (!l || l <= 0 || l > 100) {
      e.preventDefault();
      toast.error('El largo debe estar entre 0 y 100 metros');
      return;
    }
  };

  if (projectLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  // Verificar si el proyecto está desactivado
  if (project && (!project.active || !project.client_active)) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
          <h2 className="text-xl font-bold mb-2">Proyecto Desactivado</h2>
          <p className="mb-4">
            {!project.client_active 
              ? 'El cliente empresa está desactivado. No se pueden crear andamios.' 
              : 'Este proyecto está desactivado. No se pueden crear andamios.'}
          </p>
          <button
            onClick={() => navigate(isAdmin ? '/admin/scaffolds' : '/supervisor')}
            className="bg-primary-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => {
                if (isAdmin) {
                  navigate(`/admin/scaffolds?projectId=${projectId}`);
                } else {
                  navigate(`/supervisor/project/${projectId}`);
                }
              }}
              className="flex items-center gap-2 text-primary-blue hover:text-blue-700"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Volver</span>
            </button>
            <h1 className="text-lg font-bold text-dark-blue truncate">
              Crear Nuevo Andamio
            </h1>
            <div className="w-16"></div> {/* Spacer */}
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-dark-blue mb-2">
              {project?.name || 'Proyecto'}
            </h2>
            <p className="text-sm text-gray-600">
              Cliente: {project?.client_name}
            </p>
          </div>

          <Form method="post" encType="multipart/form-data" onSubmit={handleFormValidation} className="space-y-6">
            {/* Hidden fields para el router action */}
            <input type="hidden" name="project_id" value={projectId || ''} />
            <input type="hidden" name="progress_percentage" value={progressPercentage} />
            
            {/* Input file único (siempre presente, solo oculto) */}
            <input
              id="image-upload"
              name="assembly_image"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              className="hidden"
              required
            />
            
            {/* Imagen Inicial */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto del Andamio <span className="text-red-500">*</span>
              </label>
              {imagePreview ? (
                <div className="text-center">
                  <img
                    src={imagePreview}
                    alt="Vista previa"
                    className="w-full rounded-lg shadow-md max-h-64 object-cover"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer mt-3 inline-block text-sm text-primary-blue hover:text-blue-700 font-medium"
                  >
                    Cambiar foto
                  </label>
                </div>
              ) : (
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="mt-2 text-sm text-gray-600">Toca para tomar o seleccionar una foto</span>
                </label>
              )}
            </div>

            {/* Información del Andamio */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="scaffoldNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  N° de Andamio
                </label>
                <input
                  type="text"
                  id="scaffoldNumber"
                  name="scaffold_number"
                  value={scaffoldNumber}
                  onChange={(e) => setScaffoldNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                  placeholder="Ej: A-001"
                />
              </div>

              <div>
                <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
                  Área
                </label>
                <input
                  type="text"
                  id="area"
                  name="area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                  placeholder="Ej: Zona Norte"
                />
              </div>

              <div>
                <label htmlFor="tag" className="block text-sm font-medium text-gray-700 mb-1">
                  TAG
                </label>
                <input
                  type="text"
                  id="tag"
                  name="tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                  placeholder="Ej: TAG-123"
                />
              </div>
            </div>

            {/* Dimensiones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dimensiones (metros) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="height" className="block text-xs text-gray-600 mb-1">
                    Alto
                  </label>
                  <input
                    type="number"
                    id="height"
                    name="height"
                    step="0.01"
                    min="0"
                    max="100"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="width" className="block text-xs text-gray-600 mb-1">
                    Ancho
                  </label>
                  <input
                    type="number"
                    id="width"
                    name="width"
                    step="0.01"
                    min="0"
                    max="100"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="length" className="block text-xs text-gray-600 mb-1">
                    Largo
                  </label>
                  <input
                    type="number"
                    id="length"
                    name="length"
                    step="0.01"
                    min="0"
                    max="100"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Metros Cúbicos Calculados */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Volumen Calculado</p>
                  <p className="text-xs text-blue-600">Alto × Ancho × Largo</p>
                </div>
                <p className="text-3xl font-bold text-blue-800">
                  {cubicMeters} <span className="text-lg font-medium">m³</span>
                </p>
              </div>
            </div>

            {/* Porcentaje de Progreso */}
            <div>
              <label htmlFor="progress" className="block text-sm font-medium text-gray-700 mb-2">
                Porcentaje de Progreso: <span className="font-bold text-primary-blue">{progressPercentage}%</span>
              </label>
              <input
                id="progress"
                type="range"
                min="0"
                max="100"
                value={progressPercentage}
                onChange={(e) => setProgressPercentage(Number(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-blue"
              />
              <div className="mt-2 w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-primary-blue h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Ubicación */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Ubicación
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                placeholder="Ej: Sector Norte, Piso 3"
              />
            </div>

            {/* Observaciones */}
            <div>
              <label htmlFor="observations" className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones
              </label>
              <textarea
                id="observations"
                name="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                placeholder="Detalles adicionales sobre el andamio..."
              />
            </div>

            {/* Notas de Montaje */}
            <div>
              <label htmlFor="assemblyNotes" className="block text-sm font-medium text-gray-700 mb-1">
                Notas de Montaje
              </label>
              <textarea
                id="assemblyNotes"
                name="assembly_notes"
                value={assemblyNotes}
                onChange={(e) => setAssemblyNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                placeholder="Notas sobre el proceso de montaje..."
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => navigate(`/supervisor/project/${projectId}`)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Crear Andamio'}
              </button>
            </div>
          </Form>
        </div>
      </main>
    </div>
  );
};

export default CreateScaffoldPage;
