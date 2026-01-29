import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import ImageUploadIcon from '../../components/icons/ImageUploadIcon';
import LoadingOverlay from '../../components/LoadingOverlay';
import UploadProgress, { UploadStage } from '../../components/UploadProgress';
import { uploadWithProgress } from '../../services/apiService';
import {
  processImageFile,
  formatBytes,
  ImageProcessingResult,
  ALLOWED_IMAGE_ACCEPT,
} from '../../utils/imageProcessing';

const disassembleSchema = z.object({
  disassembly_notes: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
  disassembly_image: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, 'La imagen es requerida'),
});

type DisassembleFormData = z.infer<typeof disassembleSchema>;

const DisassembleScaffoldPage: React.FC = () => {
  const { scaffoldId } = useParams<{ scaffoldId: string }>();
  const navigate = useNavigate();
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const [processedImage, setProcessedImage] = useState<File | null>(null);
  const [imageMeta, setImageMeta] = useState<ImageProcessingResult | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadControllerRef = useRef<AbortController | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DisassembleFormData>({
    resolver: zodResolver(disassembleSchema),
    defaultValues: {
      disassembly_notes: '',
    },
  });
  const disassemblyImageRegister = register('disassembly_image');
  const isLocked = isSubmitting || uploadStage !== 'idle' || isProcessingImage;

  const handleImageSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setProcessedImage(null);
      setImageMeta(null);
      setImagePreview('');
      return;
    }

    try {
      setIsProcessingImage(true);
      const processed = await processImageFile(file);
      setProcessedImage(processed.file);
      setImageMeta(processed);
      setImagePreview(URL.createObjectURL(processed.file));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al procesar la imagen.';
      setProcessedImage(null);
      setImageMeta(null);
      setImagePreview('');
      setError(message);
      toast.error(message);
    } finally {
      setIsProcessingImage(false);
    }
  };

  const onSubmit = async (data: DisassembleFormData) => {
    if (!window.confirm('¿Está seguro de que desea marcar este andamio como desarmado?')) {
      return;
    }

    setError('');

    const imageToUpload = processedImage ?? data.disassembly_image?.[0];
    if (!imageToUpload) {
      toast.error('La imagen es requerida');
      return;
    }

    const formData = new FormData();
    formData.append('disassembly_notes', data.disassembly_notes || '');
    formData.append('disassembly_image', imageToUpload);

    try {
      const controller = new AbortController();
      uploadControllerRef.current = controller;

      setUploadProgress(0);
      setUploadStage('processing');
      await new Promise((resolve) => setTimeout(resolve, 0));
      setUploadStage('uploading');
      await uploadWithProgress(
        'put',
        `/scaffolds/${scaffoldId}/disassemble`,
        formData,
        setUploadProgress,
        controller.signal
      );
      setUploadStage('finishing');
      toast.success('¡Andamio desmontado exitosamente!');
      navigate(-1);
    } catch (err: unknown) {
      setUploadStage('idle');
      setUploadProgress(0);
      const cancelError = err as { code?: string; name?: string };
      if (cancelError?.code === 'ERR_CANCELED' || cancelError?.name === 'CanceledError') {
        toast('Subida cancelada', { icon: '🛑' });
        return;
      }
      const apiError = err as { response?: { data?: { message?: string } } };
      const errorMsg = apiError?.response?.data?.message || 'Error al enviar el reporte de desmontaje. Intente de nuevo.';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error(err);
    } finally {
      uploadControllerRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = null;
    setUploadStage('idle');
    setUploadProgress(0);
  };

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-4 text-primary-blue hover:underline">
        &larr; Volver al Proyecto
      </button>
      <h1 className="text-3xl font-bold text-dark-blue mb-6">Marcar Andamio como Desarmado</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Foto de Prueba del Desmontaje <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              {imagePreview ? (
                <div className="space-y-2">
                  <img
                    src={imagePreview}
                    alt="Vista previa"
                    className="mx-auto h-48 w-auto rounded-md"
                  />
                  {imageMeta && (
                    <p className="text-xs text-gray-500">
                      {imageMeta.wasCompressed
                        ? `Optimizada: ${formatBytes(imageMeta.originalBytes)} → ${formatBytes(imageMeta.processedBytes)}`
                        : `Tamaño: ${formatBytes(imageMeta.originalBytes)}`}
                    </p>
                  )}
                </div>
              ) : (
                <ImageUploadIcon />
              )}
              <div className="flex text-sm text-gray-600 justify-center">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-primary-blue hover:text-blue-700 focus-within:outline-none"
                >
                  <span>{imagePreview ? 'Cambiar foto' : 'Adjuntar una foto'}</span>
                  <input
                    id="file-upload"
                    type="file"
                    className="sr-only"
                    accept={ALLOWED_IMAGE_ACCEPT}
                    capture="environment"
                    {...disassemblyImageRegister}
                    onChange={(event) => {
                      disassemblyImageRegister.onChange(event);
                      handleImageSelection(event);
                    }}
                    aria-invalid={errors.disassembly_image ? 'true' : 'false'}
                    aria-describedby={errors.disassembly_image ? 'disassembly_image-error' : undefined}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500">Foto del área despejada</p>
              {isProcessingImage && (
                <p className="mt-2 text-xs text-gray-500">Procesando imagen...</p>
              )}
              {errors.disassembly_image && (
                <p id="disassembly_image-error" className="text-red-500 text-sm mt-1" role="alert">{errors.disassembly_image.message as string}</p>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-bold text-gray-700">
            Notas de Desmontaje (Opcional)
          </label>
          <textarea
            id="notes"
            rows={3}
            {...register('disassembly_notes')}
            className="form-input"
            aria-invalid={errors.disassembly_notes ? 'true' : 'false'}
            aria-describedby={errors.disassembly_notes ? 'disassembly_notes-error' : undefined}
          ></textarea>
          {errors.disassembly_notes && (
            <p id="disassembly_notes-error" className="text-red-500 text-sm mt-1" role="alert">{errors.disassembly_notes.message}</p>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Submit */}
        <div className="pt-5">
          <button
            type="submit"
            disabled={isLocked}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-primary-blue hover:bg-blue-700 focus:outline-none disabled:bg-gray-400"
          >
            {isLocked ? 'Confirmando...' : 'Confirmar Desmontaje'}
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

      <LoadingOverlay 
        isOpen={isLocked} 
        message="Registrando desmontaje del andamio..."
        subMessage="Procesando imagen y actualizando estado"
      />
    </div>
  );
};

export default DisassembleScaffoldPage;
