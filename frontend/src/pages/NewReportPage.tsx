import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGet } from '../hooks/useGet';
import { usePost } from '../hooks/useMutate';
import { Project, Scaffold } from '../types/api';

const reportSchema = z.object({
  height: z.string()
    .min(1, 'La altura es requerida')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) <= 100, {
      message: 'La altura debe ser un número entre 0 y 100 metros',
    }),
  width: z.string()
    .min(1, 'El ancho es requerido')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) <= 100, {
      message: 'El ancho debe ser un número entre 0 y 100 metros',
    }),
  depth: z.string()
    .min(1, 'La profundidad es requerida')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) <= 100, {
      message: 'La profundidad debe ser un número entre 0 y 100 metros',
    }),
  progress: z.number().min(0).max(100),
  notes: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  image: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, 'La imagen es requerida')
    .refine(
      (files) => files?.[0]?.size <= 10 * 1024 * 1024,
      'El archivo no debe superar 10MB'
    )
    .refine(
      (files) => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(files?.[0]?.type),
      'Solo se permiten archivos JPG, PNG o WEBP'
    ),
});

type ReportFormData = z.infer<typeof reportSchema>;

const NewReportPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: project } = useGet<Project>('project', `/projects/${projectId}`);
  const createReport = usePost<Scaffold, FormData>('scaffolds', '/scaffolds');

  const [imagePreview, setImagePreview] = useState<string>('');
  const [cubicMeters, setCubicMeters] = useState<string>('0.00');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      height: '',
      width: '',
      depth: '',
      progress: 50,
      notes: '',
    },
  });

  const heightValue = watch('height');
  const widthValue = watch('width');
  const depthValue = watch('depth');
  const imageFiles = watch('image');

  useEffect(() => {
    const h = parseFloat(heightValue) || 0;
    const w = parseFloat(widthValue) || 0;
    const d = parseFloat(depthValue) || 0;
    setCubicMeters((h * w * d).toFixed(2));
  }, [heightValue, widthValue, depthValue]);

  useEffect(() => {
    if (imageFiles && imageFiles.length > 0) {
      const file = imageFiles[0];
      setImagePreview(URL.createObjectURL(file));
    }
  }, [imageFiles]);

  const onSubmit = async (data: ReportFormData) => {
    const formData = new FormData();
    formData.append('project_id', projectId!);
    formData.append('height', data.height);
    formData.append('width', data.width);
    formData.append('depth', data.depth);
    formData.append('progress_percentage', data.progress.toString());
    formData.append('notes', data.notes || '');
    formData.append('image', data.image[0]);

    try {
      await createReport.mutateAsync(formData);
      navigate(`/supervisor/project/${projectId}`);
    } catch (error) {
      console.error('Failed to create report', error);
      alert('Error al crear el reporte. Por favor, intenta de nuevo.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/supervisor/dashboard')}
              className="flex items-center gap-2 text-primary-blue"
            >
              <ChevronLeftIcon className="h-6 w-6" />
              <span className="text-sm font-medium">Proyectos</span>
            </button>
            <h1 className="text-lg font-bold text-dark-blue truncate">
              {project?.name || 'Nuevo Reporte'}
            </h1>
            <div className="w-16"></div> {/* Spacer */}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 pb-24">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-neutral-gray mb-2">
              Foto del Avance <span className="text-red-500">*</span>
            </label>
            {imagePreview ? (
              <div className="text-center">
                <img
                  src={imagePreview}
                  alt="Vista previa"
                  className="w-full rounded-lg shadow-md"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer mt-2 inline-block text-sm text-primary-blue hover:text-opacity-80"
                >
                  Cambiar foto
                </label>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  {...register('image')}
                  className="hidden"
                />
              </div>
            ) : (
              <label
                htmlFor="image-upload"
                className="cursor-pointer flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg bg-white hover:bg-gray-50"
              >
                <CameraIcon className="h-12 w-12 text-gray-400" />
                <span className="mt-2 text-sm text-neutral-gray">Toca para adjuntar una foto</span>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  {...register('image')}
                  className="hidden"
                  aria-invalid={errors.image ? 'true' : 'false'}
                  aria-describedby={errors.image ? 'image-error' : undefined}
                />
              </label>
            )}
            {errors.image && (
              <p id="image-error" className="text-red-500 text-sm mt-1" role="alert">{errors.image.message as string}</p>
            )}
          </div>

          {/* Dimensions */}
          <div>
            <label className="block text-sm font-medium text-neutral-gray">
              Dimensiones (en metros) <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Alto"
                  {...register('height')}
                  aria-label="Altura del andamio en metros"
                  aria-invalid={errors.height ? 'true' : 'false'}
                  aria-describedby={errors.height ? 'height-error' : undefined}
                  className={`appearance-none text-center block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm focus:ring-primary-blue focus:border-primary-blue ${
                    errors.height ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.height && (
                  <p id="height-error" className="text-red-500 text-xs mt-1" role="alert">{errors.height.message}</p>
                )}
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ancho"
                  {...register('width')}
                  aria-label="Ancho del andamio en metros"
                  aria-invalid={errors.width ? 'true' : 'false'}
                  aria-describedby={errors.width ? 'width-error' : undefined}
                  className={`appearance-none text-center block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm focus:ring-primary-blue focus:border-primary-blue ${
                    errors.width ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.width && (
                  <p id="width-error" className="text-red-500 text-xs mt-1" role="alert">{errors.width.message}</p>
                )}
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Prof."
                  {...register('depth')}
                  aria-label="Profundidad del andamio en metros"
                  aria-invalid={errors.depth ? 'true' : 'false'}
                  aria-describedby={errors.depth ? 'depth-error' : undefined}
                  className={`appearance-none text-center block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm focus:ring-primary-blue focus:border-primary-blue ${
                    errors.depth ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.depth && (
                  <p id="depth-error" className="text-red-500 text-xs mt-1" role="alert">{errors.depth.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Calculated Volume */}
          <div className="bg-white p-4 rounded-lg shadow-inner text-center">
            <p className="text-sm font-medium text-neutral-gray">Volumen Calculado</p>
            <p className="text-3xl font-bold text-dark-blue">
              {cubicMeters} <span className="text-lg font-medium">m³</span>
            </p>
          </div>

          {/* Progress */}
          <div>
            <label htmlFor="progress" className="block text-sm font-medium text-neutral-gray">
              Porcentaje de Avance: <span className="font-bold text-dark-blue">{watch('progress')}%</span>
            </label>
            <input
              id="progress"
              type="range"
              min="0"
              max="100"
              {...register('progress', { valueAsNumber: true })}
              aria-valuetext={`${watch('progress')} por ciento`}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-neutral-gray">
              Notas (Opcional)
            </label>
            <textarea
              id="notes"
              {...register('notes')}
              rows={4}
              aria-invalid={errors.notes ? 'true' : 'false'}
              aria-describedby={errors.notes ? 'notes-error' : undefined}
              className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm"
            ></textarea>
            {errors.notes && (
              <p id="notes-error" className="text-red-500 text-sm mt-1" role="alert">{errors.notes.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex justify-center py-3 px-4 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-primary-blue hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-50"
            >
              {isSubmitting ? 'Enviando...' : 'Crear Reporte'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

// Icons
const ChevronLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const CameraIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default NewReportPage;
