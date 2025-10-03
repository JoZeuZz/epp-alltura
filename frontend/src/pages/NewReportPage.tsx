import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGet } from '../hooks/useGet';
import { usePost } from '../hooks/useMutate';
import { Project, Scaffold } from '../types/api';

const NewReportPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: project } = useGet<Project>('project', `/projects/${projectId}`);

  const [height, setHeight] = useState<string>('');
  const [width, setWidth] = useState<string>('');
  const [depth, setDepth] = useState<string>('');
  const [progress, setProgress] = useState<number>(50);
  const [notes, setNotes] = useState<string>('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [cubicMeters, setCubicMeters] = useState<string>('0.00');

  const createReport = usePost<Scaffold, FormData>('scaffolds', '/scaffolds');

  useEffect(() => {
    const h = parseFloat(height) || 0;
    const w = parseFloat(width) || 0;
    const d = parseFloat(depth) || 0;
    setCubicMeters((h * w * d).toFixed(2));
  }, [height, width, depth]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!image) {
      alert('Por favor, adjunta una imagen.');
      return;
    }

    const formData = new FormData();
    formData.append('project_id', projectId!);
    formData.append('height', height);
    formData.append('width', width);
    formData.append('depth', depth);
    formData.append('progress_percentage', progress.toString());
    formData.append('notes', notes);
    formData.append('image', image);

    try {
      await createReport.mutateAsync(formData);
      navigate('/tech');
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
              onClick={() => navigate('/tech')}
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
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-neutral-gray mb-2">
              Foto del Avance
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
                  onChange={handleImageChange}
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
                  onChange={handleImageChange}
                  className="hidden"
                  required
                />
              </label>
            )}
          </div>

          {/* Dimensions */}
          <div>
            <label className="block text-sm font-medium text-neutral-gray">
              Dimensiones (en metros)
            </label>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <input
                  type="number"
                  placeholder="Alto"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="appearance-none text-center block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm focus:ring-primary-blue focus:border-primary-blue"
                  required
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Ancho"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="appearance-none text-center block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm focus:ring-primary-blue focus:border-primary-blue"
                  required
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Prof."
                  value={depth}
                  onChange={(e) => setDepth(e.target.value)}
                  className="appearance-none text-center block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm focus:ring-primary-blue focus:border-primary-blue"
                  required
                />
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
              Porcentaje de Avance: <span className="font-bold text-dark-blue">{progress}%</span>
            </label>
            <input
              id="progress"
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
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
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-blue focus:border-primary-blue sm:text-sm"
            ></textarea>
          </div>

          {/* Submit Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
            <button
              type="submit"
              disabled={createReport.isPending}
              className="w-full inline-flex justify-center py-3 px-4 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-primary-blue hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue disabled:opacity-50"
            >
              {createReport.isPending ? 'Enviando...' : 'Enviar Reporte'}
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
