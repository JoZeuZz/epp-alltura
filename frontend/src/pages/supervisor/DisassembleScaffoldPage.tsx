import React, { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ImageUploadIcon from '../../components/icons/ImageUploadIcon';
import LoadingOverlay from '../../components/LoadingOverlay';

const DisassembleScaffoldPage: React.FC = () => {
  const { scaffoldId } = useParams<{ scaffoldId: string }>();
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!image) {
      setError('Por favor, adjunte una foto de prueba del desmontaje.');
      return;
    }

    if (!window.confirm('¿Está seguro de que desea marcar este andamio como desarmado?')) {
      return;
    }

    setError('');
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('disassembly_notes', notes);
    formData.append('disassembly_image', image);

    try {
      // Usar api.put directamente para enviar FormData correctamente
      const { put } = await import('../../services/apiService');
      await put(`/scaffolds/${scaffoldId}/disassemble`, formData);
      toast.success('¡Andamio desmontado exitosamente!');
      // Navegar de vuelta usando el historial del navegador
      navigate(-1);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error al enviar el reporte de desmontaje. Intente de nuevo.';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-4 text-primary-blue hover:underline">
        &larr; Volver al Proyecto
      </button>
      <h1 className="text-3xl font-bold text-dark-blue mb-6">Marcar Andamio como Desarmado</h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Foto de Prueba del Desmontaje
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
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
                    required
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500">Foto del área despejada</p>
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
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="form-input"
          ></textarea>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Submit */}
        <div className="pt-5">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-primary-blue hover:bg-blue-700 focus:outline-none disabled:bg-gray-400"
          >
            {isSubmitting ? 'Confirmando...' : 'Confirmar Desmontaje'}
          </button>
        </div>
      </form>

      <LoadingOverlay 
        isOpen={isSubmitting} 
        message="Registrando desmontaje del andamio..."
        subMessage="Procesando imagen y actualizando estado"
      />
    </div>
  );
};

export default DisassembleScaffoldPage;
