import React, { useState } from 'react';
import { Scaffold } from '../types/api';
import { IMAGE_MAX_BYTES, IMAGE_MAX_LABEL } from '../config/imageLimits';

interface ScaffoldStatusToggleProps {
  scaffold: Scaffold;
  onCardStatusChange: (scaffoldId: number, newStatus: 'green' | 'red') => Promise<void>;
  onAssemblyStatusChange: (scaffoldId: number, newStatus: 'assembled' | 'disassembled', image?: File) => Promise<void>;
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
          scaffoldId={scaffold.id}
          onClose={() => setShowDisassembleModal(false)}
          onConfirm={async (image: File) => {
            setIsChangingAssembly(true);
            try {
              await onAssemblyStatusChange(scaffold.id, 'disassembled', image);
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
  scaffoldId: number;
  onClose: () => void;
  onConfirm: (image: File) => Promise<void>;
}

const DisassembleModal: React.FC<DisassembleModalProps> = ({ onClose, onConfirm }) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar formato
      const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedFormats.includes(file.type)) {
        alert('Formato de imagen no permitido. Use JPG, PNG, GIF o WebP');
        return;
      }

      // Validar tamaño (máx configurado)
      if (file.size > IMAGE_MAX_BYTES) {
        alert(`La imagen no puede exceder ${IMAGE_MAX_LABEL}`);
        return;
      }

      setSelectedImage(file);
      
      // Generar preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedImage) {
      alert('Debe seleccionar una imagen de desarmado');
      return;
    }

    setIsSubmitting(true);
    await onConfirm(selectedImage);
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
            accept="image/*"
            onChange={handleImageSelect}
            className="w-full border rounded p-2"
            disabled={isSubmitting}
          />
        </div>

        {preview && (
          <div className="mb-4">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-48 object-cover rounded"
            />
          </div>
        )}

        <div className="flex space-x-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedImage || isSubmitting}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {isSubmitting ? 'Desarmando...' : 'Confirmar Desarmado'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScaffoldStatusToggle;
