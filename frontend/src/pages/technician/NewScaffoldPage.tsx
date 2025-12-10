import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePost } from '../../hooks/useMutate';
import { useGet } from '../../hooks/useGet';
import { useFormErrors } from '../../hooks/useFormErrors';
import { Scaffold, Company, Supervisor, EndUser } from '../../types/api';
import ImageUploadIcon from '../../components/icons/ImageUploadIcon';
import LoadingOverlay from '../../components/LoadingOverlay';

const NewScaffoldPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [scaffoldNumber, setScaffoldNumber] = useState('');
  const [area, setArea] = useState('');
  const [tag, setTag] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [endUserId, setEndUserId] = useState('');
  const [dimensions, setDimensions] = useState({ height: '', width: '', depth: '' });
  const [cubicMeters, setCubicMeters] = useState<number>(0);
  const [progress, setProgress] = useState(100);
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createScaffold = usePost<Scaffold, FormData>('scaffolds', '/scaffolds');
  
  const { handleApiError, clearErrors } = useFormErrors();
  
  // Cargar catálogos
  const { data: companies } = useGet<Company[]>('companies', '/companies');
  const { data: supervisors } = useGet<Supervisor[]>('supervisors', '/supervisors');
  const { data: endUsers } = useGet<EndUser[]>('end-users', '/end-users');

  useEffect(() => {
    const { height, width, depth } = dimensions;
    if (height && width && depth) {
      const vol = parseFloat(height) * parseFloat(width) * parseFloat(depth);
      setCubicMeters(vol);
    } else {
      setCubicMeters(0);
    }
  }, [dimensions]);

  const handleDimensionChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDimensions((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearErrors();
    
    if (!image || !dimensions.height || !dimensions.width || !dimensions.depth) {
      const errorMsg = 'Por favor, complete todos los campos de dimensiones y adjunte una imagen.';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setError('');

    const formData = new FormData();
    formData.append('project_id', projectId!);
    formData.append('scaffold_number', scaffoldNumber);
    formData.append('area', area);
    formData.append('tag', tag);
    if (companyId) formData.append('company_id', companyId);
    if (supervisorId) formData.append('supervisor_id', supervisorId);
    if (endUserId) formData.append('end_user_id', endUserId);
    formData.append('height', dimensions.height);
    formData.append('width', dimensions.width);
    formData.append('depth', dimensions.depth);
    formData.append('progress_percentage', progress.toString());
    formData.append('assembly_notes', notes);
    if (image) {
      formData.append('assembly_image', image);
    }

    try {
      await createScaffold.mutateAsync(formData);
      toast.success('¡Reporte de montaje creado exitosamente!');
      navigate(`/tech/project/${projectId}`);
    } catch (err: any) {
      console.error(err);
      handleApiError(err);
      const errorMsg = err?.response?.data?.message || 'Error al enviar el reporte. Intente de nuevo.';
      setError(errorMsg);
      
      if (!err?.response?.data?.fieldErrors && !err?.response?.data?.errors) {
        toast.error(errorMsg);
      }
    }
  };

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-3 md:mb-4 text-primary-blue hover:underline text-sm md:text-base">
        &larr; Volver al Proyecto
      </button>
      <h1 className="text-2xl md:text-3xl font-bold text-dark-blue mb-4 md:mb-6">Nuevo Reporte de Montaje</h1>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-md">
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Foto del Montaje</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-400 border-dashed rounded-lg bg-gray-50 hover:border-primary-blue hover:bg-blue-50 transition-colors">
            <div className="space-y-1 text-center">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Vista previa"
                  className="mx-auto h-48 w-auto rounded-md"
                />
              ) : (
                <ImageUploadIcon />
              )}
              <div className="flex text-sm text-gray-600 justify-center">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-primary-blue hover:text-blue-700 focus-within:outline-none"
                >
                  <span>{image ? 'Cambiar foto' : 'Adjuntar una foto'}</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageChange}
                    ref={fileInputRef}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 10MB</p>
            </div>
          </div>
        </div>

        {/* Scaffold Info - Grid responsive: 1 col en móvil, 2 en tablet, 3 en desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <div>
            <label htmlFor="scaffoldNumber" className="block text-sm font-bold text-gray-700 mb-2">Nº de Andamio</label>
            <input
              type="text"
              id="scaffoldNumber"
              value={scaffoldNumber}
              onChange={(e) => setScaffoldNumber(e.target.value)}
              className="mt-1 block w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue bg-white hover:border-gray-400 transition-colors placeholder:text-xs placeholder:text-gray-400"
              placeholder="Ej: 123-A"
            />
          </div>
          <div>
            <label htmlFor="area" className="block text-sm font-bold text-gray-700 mb-2">Área</label>
            <input
              type="text"
              id="area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="mt-1 block w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue bg-white hover:border-gray-400 transition-colors placeholder:text-xs placeholder:text-gray-400"
              placeholder="Ej: Sector B"
            />
          </div>
          <div>
            <label htmlFor="tag" className="block text-sm font-bold text-gray-700 mb-2">TAG</label>
            <input
              type="text"
              id="tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="mt-1 block w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue bg-white hover:border-gray-400 transition-colors placeholder:text-xs placeholder:text-gray-400"
              placeholder="Ej: T-456"
            />
          </div>
          <div>
            <label htmlFor="companyId" className="block text-sm font-bold text-gray-700 mb-2">Solicitante</label>
            <select
              id="companyId"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="mt-1 block w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue bg-white hover:border-gray-400 transition-colors"
            >
              <option value="">Seleccionar empresa...</option>
              {companies?.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="endUserId" className="block text-sm font-bold text-gray-700 mb-2">Usuario</label>
            <select
              id="endUserId"
              value={endUserId}
              onChange={(e) => setEndUserId(e.target.value)}
              className="mt-1 block w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue bg-white hover:border-gray-400 transition-colors"
            >
              <option value="">Seleccionar usuario...</option>
              {endUsers?.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="supervisorId" className="block text-sm font-bold text-gray-700 mb-2">Supervisor</label>
            <select
              id="supervisorId"
              value={supervisorId}
              onChange={(e) => setSupervisorId(e.target.value)}
              className="mt-1 block w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue bg-white hover:border-gray-400 transition-colors"
            >
              <option value="">Seleccionar supervisor...</option>
              {supervisors?.map((sup) => (
                <option key={sup.id} value={sup.id}>{sup.first_name} {sup.last_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dimensions */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Dimensiones (metros)</label>
          <div className="grid grid-cols-3 gap-4">
            <input
              type="number"
              name="height"
              placeholder="Alto"
              value={dimensions.height}
              onChange={handleDimensionChange}
              className="mt-1 block w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue bg-white hover:border-gray-400 transition-colors"
              step="0.01"
              required
            />
            <input
              type="number"
              name="width"
              placeholder="Ancho"
              value={dimensions.width}
              onChange={handleDimensionChange}
              className="mt-1 block w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue bg-white hover:border-gray-400 transition-colors"
              step="0.01"
              required
            />
            <input
              type="number"
              name="depth"
              placeholder="Prof."
              value={dimensions.depth}
              onChange={handleDimensionChange}
              className="mt-1 block w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue bg-white hover:border-gray-400 transition-colors"
              step="0.01"
              required
            />
          </div>
        </div>

        {/* Cubic Meters */}
        <div className="p-4 bg-light-gray-bg rounded-lg text-center">
          <p className="text-lg text-neutral-gray">Volumen Calculado</p>
          <p className="text-3xl font-bold text-dark-blue">{cubicMeters.toFixed(2)} m³</p>
        </div>

        {/* Progress */}
        <div>
          <label htmlFor="progress" className="block text-sm font-bold text-gray-700 mb-2">
            Progreso de Montaje: {progress}%
          </label>
          <input
            id="progress"
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary-blue"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-bold text-gray-700 mb-2">
            Notas (Opcional)
          </label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 block w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-primary-blue bg-white hover:border-gray-400 transition-colors resize-none"
          ></textarea>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Submit */}
        <div className="pt-5">
          <button
            type="submit"
            disabled={createScaffold.isPending}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-primary-blue hover:bg-blue-700 focus:outline-none disabled:bg-gray-400"
          >
            {createScaffold.isPending ? 'Enviando...' : 'Enviar Reporte'}
          </button>
        </div>
      </form>

      <LoadingOverlay 
        isOpen={createScaffold.isPending} 
        message="Subiendo reporte de montaje..."
        subMessage="Procesando imagen y guardando datos del andamio"
      />
    </div>
  );
};

export default NewScaffoldPage;
