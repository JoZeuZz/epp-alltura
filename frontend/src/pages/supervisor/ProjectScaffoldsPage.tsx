import React, { useState, useRef } from 'react';
import { useParams, useNavigate, useLoaderData, useRevalidator } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Project, Scaffold } from '../../types/api';
import Modal from '../../components/Modal';
import ScaffoldGrid from '../../components/ScaffoldGrid';
import ScaffoldDetailsModal from '../../components/ScaffoldDetailsModal';
import UploadProgress, { UploadStage } from '../../components/UploadProgress';
import { apiService, uploadWithProgress } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import {
  processImageFile,
  formatBytes,
  ImageProcessingResult,
  ALLOWED_IMAGE_ACCEPT,
} from '../../utils/imageProcessing';

interface LoaderData {
  project: Project;
  scaffolds: Scaffold[];
}

const ProjectScaffoldsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const revalidator = useRevalidator();
  const { project, scaffolds: initialScaffolds } = useLoaderData() as LoaderData;
  const [scaffolds, setScaffolds] = useState<Scaffold[]>(initialScaffolds);
  const [selectedScaffold, setSelectedScaffold] = useState<Scaffold | null>(null);
  const [scaffoldToDisassemble, setScaffoldToDisassemble] = useState<number | null>(null);
  const [disassembleImage, setDisassembleImage] = useState<File | null>(null);
  const [imageMeta, setImageMeta] = useState<ImageProcessingResult | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [disassembleNotes, setDisassembleNotes] = useState('');
  const [isDisassembling, setIsDisassembling] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadControllerRef = useRef<AbortController | null>(null);

  const handleToggleCard = async (scaffoldId: number, currentStatus: 'green' | 'red') => {
    try {
      const newStatus = currentStatus === 'green' ? 'red' : 'green';
      
      await apiService.patch(`/scaffolds/${scaffoldId}/card-status`, { card_status: newStatus });
      
      toast.success(`Tarjeta cambiada a ${newStatus === 'green' ? 'verde' : 'roja'}`);
      
      // Actualizar estado local
      setScaffolds(scaffolds.map(s => 
        s.id === scaffoldId ? { ...s, card_status: newStatus } : s
      ));
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      const errorMsg = apiError?.response?.data?.message || 'Error al cambiar la tarjeta';
      toast.error(errorMsg);
      console.error(err);
    }
  };

  const handleDisassemble = (scaffoldId: number) => {
    setScaffoldToDisassemble(scaffoldId);
    setDisassembleImage(null);
    setImageMeta(null);
    setDisassembleNotes('');
  };

  const handleDisassembleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImage(true);
      const processed = await processImageFile(file);
      setDisassembleImage(processed.file);
      setImageMeta(processed);
    } catch (error) {
      console.error('Error compressing image:', error);
      const message = error instanceof Error ? error.message : 'Error al procesar la imagen';
      toast.error(message);
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleConfirmDisassemble = async () => {
    if (!scaffoldToDisassemble || !disassembleImage) {
      toast.error('Por favor, selecciona una imagen del desarmado');
      return;
    }

    setIsDisassembling(true);
    try {
      const controller = new AbortController();
      uploadControllerRef.current = controller;

      const formData = new FormData();
      formData.append('disassembly_image', disassembleImage);
      if (disassembleNotes) {
        formData.append('disassembly_notes', disassembleNotes);
      }

      setUploadProgress(0);
      setUploadStage('processing');
      await new Promise((resolve) => setTimeout(resolve, 0));
      setUploadStage('uploading');
      await uploadWithProgress(
        'put',
        `/scaffolds/${scaffoldToDisassemble}/disassemble`,
        formData,
        setUploadProgress,
        controller.signal
      );
      setUploadStage('finishing');

      toast.success('Andamio desarmado correctamente');
      
      // Actualizar estado local
      setScaffolds(scaffolds.map(s => 
        s.id === scaffoldToDisassemble 
          ? { ...s, assembly_status: 'disassembled', card_status: 'red', progress_percentage: 0 } 
          : s
      ));
      
      setScaffoldToDisassemble(null);
      setDisassembleImage(null);
      setDisassembleNotes('');
    } catch (err: unknown) {
      setUploadStage('idle');
      setUploadProgress(0);
      const cancelError = err as { code?: string; name?: string };
      if (cancelError?.code === 'ERR_CANCELED' || cancelError?.name === 'CanceledError') {
        toast('Subida cancelada', { icon: '🛑' });
        return;
      }
      const apiError = err as { response?: { data?: { message?: string } } };
      const errorMsg = apiError?.response?.data?.message || 'Error al desarmar el andamio';
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setIsDisassembling(false);
      setUploadStage('idle');
      setUploadProgress(0);
      uploadControllerRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = null;
    setUploadStage('idle');
    setUploadProgress(0);
  };

  const refetchScaffolds = async () => {
    revalidator.revalidate();
  };

  return (
    <div>
      <button
        onClick={() => navigate('/supervisor/dashboard')}
        className="mb-4 text-primary-blue hover:underline"
      >
        &larr; Volver a Mis Proyectos
      </button>

      {/* Alerta si proyecto desactivado */}
      {project && (!project.active || !project.client_active) && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Proyecto en modo solo lectura</h3>
              <p className="mt-1 text-sm text-yellow-700">
                {!project.client_active
                  ? 'El cliente empresa está desactivado. No se pueden crear ni editar andamios.'
                  : 'Este proyecto está desactivado. No se pueden crear ni editar andamios.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header responsive: vertical en móvil, horizontal en desktop */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">{project?.name}</h1>
          <p className="text-sm sm:text-base text-neutral-gray">Cliente: {project?.client_name}</p>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2">
          {/* Botón Crear */}
          <button
            onClick={() => navigate(`/supervisor/project/${projectId}/create-scaffold`)}
            disabled={!project?.active || !project?.client_active}
            className="bg-primary-blue text-white px-4 py-2.5 rounded-lg font-bold hover:bg-700 transition-colors shadow-lg text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Reportar
          </button>
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-dark-blue mb-4">
        Andamios Reportados
      </h2>
      {scaffolds?.length === 0 ? (
        <p className="text-neutral-gray">
          Aún no se han reportado andamios para este proyecto.
        </p>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <ScaffoldGrid
            scaffolds={scaffolds}
            onScaffoldSelect={setSelectedScaffold}
            onToggleCard={handleToggleCard}
            onDisassemble={handleDisassemble}
            projectAssignedSupervisorId={project?.assigned_supervisor_id}
          />
        </div>
      )}

      {/* Modal de desarmado */}
      <Modal 
        isOpen={!!scaffoldToDisassemble} 
        onClose={() => {
          setScaffoldToDisassemble(null);
          setDisassembleImage(null);
          setDisassembleNotes('');
        }}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-dark-blue mb-4">Desarmar Andamio</h2>
          <p className="text-gray-600 mb-6">
            Por favor, proporciona una imagen del andamio desarmado y notas opcionales.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagen del desarmado <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept={ALLOWED_IMAGE_ACCEPT}
                onChange={handleDisassembleImageChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isDisassembling || uploadStage !== 'idle' || isProcessingImage}
              />
              {disassembleImage && (
                <p className="mt-2 text-sm text-green-600">
                  ✓ Imagen seleccionada: {disassembleImage.name}
                </p>
              )}
              {imageMeta && (
                <p className="mt-1 text-xs text-gray-500">
                  {imageMeta.wasCompressed
                    ? `Optimizada: ${formatBytes(imageMeta.originalBytes)} → ${formatBytes(imageMeta.processedBytes)}`
                    : `Tamaño: ${formatBytes(imageMeta.originalBytes)}`}
                </p>
              )}
              {isProcessingImage && (
                <p className="mt-2 text-xs text-gray-500">Procesando imagen...</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas del desarmado (opcional)
              </label>
              <textarea
                value={disassembleNotes}
                onChange={(e) => setDisassembleNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ingresa observaciones sobre el desarmado..."
              />
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                setScaffoldToDisassemble(null);
                setDisassembleImage(null);
                setDisassembleNotes('');
              }}
              disabled={isDisassembling || uploadStage !== 'idle' || isProcessingImage}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmDisassemble}
              disabled={!disassembleImage || isDisassembling || uploadStage !== 'idle' || isProcessingImage}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isDisassembling || uploadStage !== 'idle' || isProcessingImage ? 'Desarmando...' : 'Confirmar Desarmado'}
            </button>
          </div>
          <UploadProgress
            stage={uploadStage}
            progress={uploadProgress}
            className="mt-4 space-y-2"
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
      </Modal>

      {/* Details Modal */}
      <Modal isOpen={!!selectedScaffold} onClose={() => setSelectedScaffold(null)}>
        {selectedScaffold && (
          <ScaffoldDetailsModal 
            scaffold={selectedScaffold} 
            canEdit={user?.role === 'supervisor'}
            projectId={Number(projectId)}
            onUpdate={() => {
              refetchScaffolds();
              setSelectedScaffold(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default ProjectScaffoldsPage;
