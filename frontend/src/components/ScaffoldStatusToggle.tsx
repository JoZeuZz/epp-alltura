import React, { useState, useRef } from 'react';
import { Scaffold } from '../types/api';
import UploadProgress, { UploadStage } from './UploadProgress';
import {
  processImageFile,
  formatBytes,
  ImageProcessingResult,
  ALLOWED_IMAGE_ACCEPT,
} from '../utils/imageProcessing';

interface ScaffoldStatusToggleProps {
  scaffold: Scaffold;
  onCardStatusChange: (scaffoldId: number, newStatus: 'green' | 'red') => Promise<void>;
  onAssemblyStatusChange: (
    scaffoldId: number,
    newStatus: 'assembled' | 'disassembled',
    image?: File,
    onProgress?: (percentage: number) => void,
    onStageChange?: (stage: UploadStage) => void,
    signal?: AbortSignal
  ) => Promise<void>;
  disabled?: boolean;
  userRole: 'admin' | 'supervisor' | 'client';
  isOwner: boolean;
}

/**
 * Componente de switches de estado para andamios
 * Permite cambiar el estado de tarjeta (verde/roja) y estado de armado
 */
export const ScaffoldStatusToggle: React.FC<ScaffoldStatusToggleProps> = ({
  scaffold,
  onCardStatusChange,
  onAssemblyStatusChange,
  disabled = false,
  userRole,
  isOwner,
}) => {
  const [isChangingCard, setIsChangingCard] = useState(false);
  const [isChangingAssembly, setIsChangingAssembly] = useState(false);
  const [showDisassembleModal, setShowDisassembleModal] = useState(false);

  // Solo admin o supervisor propietario pueden editar
  const canEdit = (userRole === 'admin' || (userRole === 'supervisor' && isOwner)) && !disabled;

  const handleCardToggle = async () => {
    if (!canEdit || isChangingCard) return;

    // No permitir cambiar a verde si está desarmado
    if (scaffold.assembly_status === 'disassembled' && scaffold.card_status === 'red') {
      alert('No puedes cambiar la tarjeta a verde mientras el andamio esté desarmado');
      return;
    }

    const newStatus = scaffold.card_status === 'green' ? 'red' : 'green';
    
    if (window.confirm(`¿Cambiar tarjeta a ${newStatus === 'green' ? 'VERDE' : 'ROJA'}?`)) {
      setIsChangingCard(true);
      try {
        await onCardStatusChange(scaffold.id, newStatus);
      } catch (error) {
        console.error('Error al cambiar estado de tarjeta:', error);
      } finally {
        setIsChangingCard(false);
      }
    }
  };

  const handleAssemblyToggle = async () => {
    if (!canEdit || isChangingAssembly) return;

    const newStatus = scaffold.assembly_status === 'assembled' ? 'disassembled' : 'assembled';

    // Si va a desarmar, mostrar modal para imagen
    if (newStatus === 'disassembled') {
      setShowDisassembleModal(true);
    } else {
      // Armar
      if (window.confirm('¿Marcar andamio como ARMADO?')) {
        setIsChangingAssembly(true);
        try {
          await onAssemblyStatusChange(scaffold.id, newStatus);
        } catch (error) {
          console.error('Error al cambiar estado de armado:', error);
        } finally {
          setIsChangingAssembly(false);
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Toggle de Tarjeta */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center space-x-3">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              scaffold.card_status === 'green'
                ? 'bg-green-500'
                : 'bg-red-500'
            }`}
          >
            <span className="text-white font-bold text-xl">
              {scaffold.card_status === 'green' ? '✓' : '✗'}
            </span>
          </div>
          <div>
            <h3 className="font-semibold">Estado de Tarjeta</h3>
            <p className="text-sm text-gray-600">
              {scaffold.card_status === 'green' ? 'Verde - Todo OK' : 'Roja - Hay problemas'}
            </p>
          </div>
        </div>

        {canEdit && (
          <button
            onClick={handleCardToggle}
            disabled={isChangingCard || scaffold.assembly_status === 'disassembled'}
            role="switch"
            aria-checked={scaffold.card_status === 'green'}
            aria-label={`Cambiar estado de tarjeta a ${scaffold.card_status === 'green' ? 'rojo' : 'verde'}`}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              scaffold.card_status === 'green'
                ? 'bg-green-500'
                : 'bg-red-500'
            } ${
              !canEdit || scaffold.assembly_status === 'disassembled'
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                scaffold.card_status === 'green' ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        )}
      </div>

      {/* Toggle de Armado */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex items-center space-x-3">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              scaffold.assembly_status === 'assembled'
                ? 'bg-blue-500'
                : 'bg-gray-400'
            }`}
          >
            <span className="text-white text-2xl">
              {scaffold.assembly_status === 'assembled' ? '🏗️' : '📦'}
            </span>
          </div>
          <div>
            <h3 className="font-semibold">Estado de Armado</h3>
            <p className="text-sm text-gray-600">
              {scaffold.assembly_status === 'assembled' ? 'Armado' : 'Desarmado'}
            </p>
          </div>
        </div>

        {canEdit && (
          <button
            onClick={handleAssemblyToggle}
            disabled={isChangingAssembly}
            role="switch"
            aria-checked={scaffold.assembly_status === 'assembled'}
            aria-label={`Cambiar estado de armado a ${scaffold.assembly_status === 'assembled' ? 'desarmado' : 'armado'}`}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              scaffold.assembly_status === 'assembled'
                ? 'bg-blue-500'
                : 'bg-gray-400'
            } ${
              !canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                scaffold.assembly_status === 'assembled' ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        )}
      </div>

      {/* Modal de Desarmado */}
      {showDisassembleModal && (
        <DisassembleModal
          onClose={() => setShowDisassembleModal(false)}
          onConfirm={async (image: File, onProgress, onStageChange, signal) => {
            setIsChangingAssembly(true);
            try {
              await onAssemblyStatusChange(
                scaffold.id,
                'disassembled',
                image,
                onProgress,
                onStageChange,
                signal
              );
              setShowDisassembleModal(false);
            } catch (error) {
              console.error('Error al desarmar:', error);
            } finally {
              setIsChangingAssembly(false);
            }
          }}
        />
      )}
    </div>
  );
};

interface DisassembleModalProps {
  onClose: () => void;
  onConfirm: (
    image: File,
    onProgress?: (percentage: number) => void,
    onStageChange?: (stage: UploadStage) => void,
    signal?: AbortSignal
  ) => Promise<void>;
}

const DisassembleModal: React.FC<DisassembleModalProps> = ({ onClose, onConfirm }) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<ImageProcessingResult | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadControllerRef = useRef<AbortController | null>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImage(true);
      const processed = await processImageFile(file);
      setSelectedImage(processed.file);
      setImageMeta(processed);
      setPreview(URL.createObjectURL(processed.file));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al procesar la imagen.';
      alert(message);
      setSelectedImage(null);
      setImageMeta(null);
      setPreview(null);
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedImage) {
      alert('Debe seleccionar una imagen de desarmado');
      return;
    }

    setIsSubmitting(true);
    try {
      const controller = new AbortController();
      uploadControllerRef.current = controller;
      setUploadProgress(0);
      setUploadStage('processing');
      await new Promise((resolve) => setTimeout(resolve, 0));
      setUploadStage('uploading');
      await onConfirm(selectedImage, setUploadProgress, setUploadStage, controller.signal);
      setUploadStage('finishing');
    } catch (error) {
      const cancelError = error as { code?: string; name?: string };
      if (cancelError?.code === 'ERR_CANCELED' || cancelError?.name === 'CanceledError') {
        alert('Subida cancelada');
        return;
      }
      console.error('Error al desarmar:', error);
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Desarmar Andamio</h2>
        
        <div className="mb-4">
          <p className="text-gray-700 mb-2">
            Al desarmar el andamio, la tarjeta cambiará automáticamente a ROJA.
            Debe proporcionar una imagen del andamio desarmado.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Imagen de Desarmado <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept={ALLOWED_IMAGE_ACCEPT}
            onChange={handleImageSelect}
            className="w-full border rounded p-2"
            disabled={isSubmitting || uploadStage !== 'idle' || isProcessingImage}
          />
        </div>

        {preview && (
          <div className="mb-4">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-48 object-cover rounded"
            />
            {imageMeta && (
              <p className="mt-2 text-xs text-gray-500">
                {imageMeta.wasCompressed
                  ? `Optimizada: ${formatBytes(imageMeta.originalBytes)} → ${formatBytes(imageMeta.processedBytes)}`
                  : `Tamaño: ${formatBytes(imageMeta.originalBytes)}`}
              </p>
            )}
          </div>
        )}
        {isProcessingImage && (
          <p className="mb-4 text-xs text-gray-500">Procesando imagen...</p>
        )}

        <div className="flex space-x-2">
          <button
            onClick={onClose}
            disabled={isSubmitting || uploadStage !== 'idle' || isProcessingImage}
            className="flex-1 px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedImage || isSubmitting || uploadStage !== 'idle' || isProcessingImage}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {isSubmitting || uploadStage !== 'idle' || isProcessingImage ? 'Desarmando...' : 'Confirmar Desarmado'}
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
    </div>
  );
};

export default ScaffoldStatusToggle;
