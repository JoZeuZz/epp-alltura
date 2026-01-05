import React, { useState } from 'react';
import { Scaffold } from '../types/api';
import ConfirmationModal from './ConfirmationModal';
import ScaffoldTimeline from './ScaffoldTimeline';
import { put } from '../services/apiService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ScaffoldDetailsModalProps {
  scaffold: Scaffold;
  onDelete?: (scaffoldId: number) => void;
  onUpdate?: () => void;
  canEdit?: boolean;
  projectId?: number;
}

const ScaffoldDetailsModal: React.FC<ScaffoldDetailsModalProps> = ({ 
  scaffold, 
  onDelete,
  onUpdate,
  canEdit = false,
  projectId
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showDisassembleConfirm, setShowDisassembleConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [assemblyStatus, setAssemblyStatus] = useState(scaffold.assembly_status);
  const [cardStatus, setCardStatus] = useState(scaffold.card_status);
  const [progressPercentage, setProgressPercentage] = useState(scaffold.progress_percentage);
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [tempProgress, setTempProgress] = useState(scaffold.progress_percentage);
  const [isUpdating, setIsUpdating] = useState(false);

  const getImageUrl = (url: string | null | undefined) => {
    if (!url) return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo imagen%3C/text%3E%3C/svg%3E';
    return url.startsWith('http') ? url : `http://localhost:5000${url}`;
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo imagen%3C/text%3E%3C/svg%3E';
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(scaffold.id);
    }
    setShowDeleteConfirm(false);
  };

  const handleConfirmDisassemble = () => {
    setShowDisassembleConfirm(false);
    // Redirigir a la página de desarmado para cargar pruebas
    navigate(`/supervisor/scaffold/${scaffold.id}/disassemble${projectId ? `?projectId=${projectId}` : ''}`);
  };

  const handleAssemble = async () => {
    setIsUpdating(true);
    try {
      await put(`/scaffolds/${scaffold.id}`, {
        assembly_status: 'assembled'
      });
      setAssemblyStatus('assembled');
      setProgressPercentage(100); // Sincronización automática
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating assembly status:', error);
      alert('Error al actualizar el estado de armado');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleAssemblyStatus = () => {
    if (!canEdit || isUpdating) return;
    // Este botón solo se muestra cuando NO está armado
    // Al presionarlo, marca como armado (100%)
    handleAssemble();
  };

  const handleToggleCardStatus = async () => {
    if (!canEdit || isUpdating) return;
    
    // Validación: No permitir tarjeta verde si está desarmado
    if (assemblyStatus === 'disassembled' && cardStatus === 'red') {
      alert('Un andamio desarmado no puede tener tarjeta verde. Primero debes armarlo.');
      return;
    }
    
    const newStatus = cardStatus === 'green' ? 'red' : 'green';
    setIsUpdating(true);
    
    try {
      await put(`/scaffolds/${scaffold.id}`, {
        card_status: newStatus
      });
      setCardStatus(newStatus);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating card status:', error);
      alert('Error al actualizar el estado de la tarjeta');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateProgress = async () => {
    if (!canEdit || isUpdating) return;
    
    // Validar rango
    if (tempProgress < 0 || tempProgress > 100) {
      alert('El porcentaje debe estar entre 0 y 100');
      return;
    }

    // Si no cambió, solo cerrar la edición
    if (tempProgress === progressPercentage) {
      setIsEditingProgress(false);
      return;
    }
    
    setIsUpdating(true);
    
    try {
      await put(`/scaffolds/${scaffold.id}`, {
        progress_percentage: tempProgress
      });
      setProgressPercentage(tempProgress);
      setIsEditingProgress(false);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error('Error updating progress percentage:', error);
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || 'Error al actualizar el porcentaje de avance';
      alert(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelProgressEdit = () => {
    setTempProgress(progressPercentage);
    setIsEditingProgress(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Modal de confirmación para desarmar */}
      <ConfirmationModal
        isOpen={showDisassembleConfirm}
        onClose={() => setShowDisassembleConfirm(false)}
        onConfirm={handleConfirmDisassemble}
        title="Confirmar desarmado"
        message={`¿Estás seguro de que deseas desarmar el andamio #${scaffold.scaffold_number || scaffold.id}? Serás redirigido a un formulario para cargar las pruebas del desarmado (foto y notas).`}
      />

      {/* Modal de confirmación para eliminar */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmar eliminación"
        message={`¿Estás seguro de que deseas ELIMINAR permanentemente el andamio #${scaffold.scaffold_number || scaffold.id}? Esta acción no se puede deshacer.`}
      />
      
      {/* Controles de Estado - Solo para supervisores que pueden editar */}
      {canEdit && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 md:p-6 rounded-lg mb-4 md:mb-6 border-2 border-blue-200">
          <h3 className="font-bold text-dark-blue mb-4 text-base md:text-lg">Control de Estados</h3>
          
          {/* Indicador de Estado Actual */}
          <div className={`mb-4 p-4 bg-white rounded-lg shadow-sm border-l-4 ${assemblyStatus === 'assembled' ? 'border-green-500' : assemblyStatus === 'in_progress' ? 'border-yellow-500' : 'border-gray-500'}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-600 block">Estado Actual:</span>
                <span className={`text-lg font-bold ${
                  assemblyStatus === 'assembled' ? 'text-green-700' : 
                  assemblyStatus === 'in_progress' ? 'text-yellow-700' : 
                  'text-gray-700'
                }`}>
                  {assemblyStatus === 'assembled' ? '✅ Armado (100%)' : 
                   assemblyStatus === 'in_progress' ? `🔄 En Proceso (${progressPercentage}%)` : 
                   '⚫ Desarmado (0%)'}
                </span>
              </div>
              <div className="text-3xl">
                {assemblyStatus === 'assembled' ? '✅' : 
                 assemblyStatus === 'in_progress' ? '🔄' : 
                 '⚫'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            
            {/* Switch: Activar Armado (solo si está desarmado o en proceso) */}
            {assemblyStatus !== 'assembled' && (
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex-1">
                    <span className="font-semibold text-gray-700 block mb-1">Marcar como Armado</span>
                    <span className="text-sm text-gray-500">
                      {assemblyStatus === 'in_progress' 
                        ? `Completar armado (de ${progressPercentage}% a 100%)`
                        : 'Activar andamio (0% a 100%)'}
                    </span>
                  </div>
                  <div className="relative ml-4">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={handleToggleAssemblyStatus}
                      disabled={isUpdating}
                      className="sr-only peer"
                    />
                    <div className={`w-14 h-7 rounded-full transition-all duration-300 bg-gray-300 ${isUpdating ? 'opacity-50' : ''}`}></div>
                    <div className="absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-300"></div>
                  </div>
                </label>
              </div>
            )}

            {/* Switch: Desarmar (solo si está armado o en proceso) */}
            {assemblyStatus !== 'disassembled' && (
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex-1">
                    <span className="font-semibold text-gray-700 block mb-1">Desarmar Andamio</span>
                    <span className="text-sm text-gray-500">
                      Requiere foto y notas de desarmado
                    </span>
                  </div>
                  <button
                    onClick={() => setShowDisassembleConfirm(true)}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors disabled:bg-gray-400 text-sm font-semibold"
                  >
                    Desarmar
                  </button>
                </label>
              </div>
            )}

            {/* Switch Estado de Tarjeta - Solo disponible si está armado */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <label className={`flex items-center justify-between ${assemblyStatus !== 'assembled' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                <div className="flex-1">
                  <span className="font-semibold text-gray-700 block mb-1">Estado de Tarjeta</span>
                  <span className="text-sm text-gray-500">
                    {cardStatus === 'green' ? 'Tarjeta Verde ✓' : 'Tarjeta Roja ✗'}
                  </span>
                  {assemblyStatus !== 'assembled' && (
                    <span className="block text-xs text-red-600 mt-1">
                      * Solo disponible cuando esté armado al 100%
                    </span>
                  )}
                </div>
                <div className="relative ml-4">
                  <input
                    type="checkbox"
                    checked={cardStatus === 'green'}
                    onChange={handleToggleCardStatus}
                    disabled={isUpdating || assemblyStatus !== 'assembled'}
                    className="sr-only peer"
                  />
                  <div className={`w-14 h-7 rounded-full transition-all duration-300 ${
                    cardStatus === 'green' 
                      ? 'bg-green-500' 
                      : 'bg-red-500'
                  } ${(isUpdating || assemblyStatus !== 'assembled') ? 'opacity-50' : ''}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 ${
                    cardStatus === 'green' ? 'translate-x-7' : 'translate-x-0'
                  }`}></div>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}
      
      {/* Imagen de Montaje */}
      <div className="mb-4 md:mb-6">
        <div className="bg-gray-50 rounded-lg p-3 md:p-4">
          <img
            src={getImageUrl(scaffold.assembly_image_url)}
            alt="Foto de montaje"
            className="rounded-lg w-full object-contain max-h-[250px] sm:max-h-[350px] md:max-h-[400px] mx-auto shadow-lg"
            onError={handleImageError}
          />
        </div>
      </div>

      {/* Información Principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="bg-blue-50 p-3 md:p-4 rounded-lg">
          <h3 className="font-bold text-primary-blue mb-2 md:mb-3 text-base md:text-lg">Información del Proyecto</h3>
          <div className="space-y-2">
            {scaffold.project_name && (
              <div>
                <span className="text-gray-600 text-sm">Proyecto:</span>
                <p className="font-semibold text-dark-blue">{scaffold.project_name}</p>
              </div>
            )}
            {scaffold.scaffold_number && (
              <div>
                <span className="text-gray-600 text-sm">N° de Andamio:</span>
                <p className="font-semibold">{scaffold.scaffold_number}</p>
              </div>
            )}
            {scaffold.area && (
              <div>
                <span className="text-gray-600 text-sm">Área:</span>
                <p className="font-semibold">{scaffold.area}</p>
              </div>
            )}
            {scaffold.tag && (
              <div>
                <span className="text-gray-600 text-sm">TAG:</span>
                <p className="font-semibold">{scaffold.tag}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-green-50 p-3 md:p-4 rounded-lg">
          <h3 className="font-bold text-green-700 mb-2 md:mb-3 text-base md:text-lg">Ubicación</h3>
          <div className="space-y-2">
            {scaffold.location && (
              <div>
                <span className="text-gray-600 text-sm">Ubicación:</span>
                <p className="font-semibold">{scaffold.location}</p>
              </div>
            )}
            {scaffold.observations && (
              <div>
                <span className="text-gray-600 text-sm">Observaciones:</span>
                <p className="font-semibold">{scaffold.observations}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Especificaciones Técnicas */}
      <div className="bg-gray-50 p-3 md:p-4 rounded-lg mb-4 md:mb-6">
        <h3 className="font-bold text-dark-blue mb-2 md:mb-3 text-base md:text-lg">Especificaciones Técnicas</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
          <div className="text-center p-2 md:p-3 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600 text-xs md:text-sm">Alto</p>
            <p className="text-xl md:text-2xl font-bold text-primary-blue">{scaffold.height}m</p>
          </div>
          <div className="text-center p-2 md:p-3 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600 text-xs md:text-sm">Ancho</p>
            <p className="text-xl md:text-2xl font-bold text-primary-blue">{scaffold.width}m</p>
          </div>
          <div className="text-center p-2 md:p-3 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600 text-xs md:text-sm">Largo</p>
            <p className="text-xl md:text-2xl font-bold text-primary-blue">{scaffold.length}m</p>
          </div>
          <div className="text-center p-2 md:p-3 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600 text-xs md:text-sm">Volumen</p>
            <p className="text-xl md:text-2xl font-bold text-primary-blue">{scaffold.cubic_meters} m³</p>
          </div>
        </div>
      </div>

      {/* Porcentaje de Avance */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 md:p-6 rounded-lg mb-4 md:mb-6 border-2 border-purple-200">
        <h3 className="font-bold text-dark-blue mb-3 text-base md:text-lg flex items-center gap-2">
          <span className="text-2xl">📊</span>
          Porcentaje de Avance
        </h3>
        
        {canEdit && !isEditingProgress ? (
          <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-purple-600">{progressPercentage}%</div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsEditingProgress(true)}
              disabled={isUpdating}
              className="ml-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-gray-400"
            >
              ✏️ Editar
            </button>
          </div>
        ) : canEdit && isEditingProgress ? (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center gap-4 mb-3">
              <label className="font-semibold text-gray-700">Nuevo porcentaje:</label>
              <input
                type="number"
                min="0"
                max="100"
                value={tempProgress}
                onChange={(e) => setTempProgress(Number(e.target.value))}
                className="border-2 border-purple-300 rounded-lg px-4 py-2 w-24 text-center text-xl font-bold focus:outline-none focus:border-purple-500"
                disabled={isUpdating}
              />
              <span className="text-xl font-bold text-gray-600">%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-4 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, tempProgress))}%` }}
              ></div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUpdateProgress}
                disabled={isUpdating}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-gray-400 font-semibold"
              >
                {isUpdating ? 'Guardando...' : '✓ Guardar'}
              </button>
              <button
                onClick={handleCancelProgressEdit}
                disabled={isUpdating}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-gray-400 font-semibold"
              >
                ✗ Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
            <div className="text-4xl font-bold text-purple-600">{progressPercentage}%</div>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Información de Montaje */}
      <div className="bg-white border-2 border-green-200 p-3 md:p-4 rounded-lg mb-4 md:mb-6">
        <h3 className="font-bold text-green-700 mb-2 md:mb-3 text-base md:text-lg flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
          Información de Montaje
        </h3>
        <div className="space-y-2">
          <div>
            <span className="text-gray-600 text-sm">Fecha de Montaje:</span>
            <p className="font-semibold">{new Date(scaffold.assembly_created_at).toLocaleString('es-CL', {
              dateStyle: 'full',
              timeStyle: 'short'
            })}</p>
          </div>
          <div>
            <span className="text-gray-600 text-sm">Estado:</span>
            <span className={`ml-2 px-3 py-1 text-sm font-semibold rounded-full ${
              assemblyStatus === 'assembled' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {assemblyStatus === 'assembled' ? 'Armado' : 'Desarmado'}
            </span>
          </div>
          <div>
            <span className="text-gray-600 text-sm">Estado de Tarjeta:</span>
            <span className={`ml-2 px-3 py-1 text-sm font-semibold rounded-full ${
              cardStatus === 'green' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {cardStatus === 'green' ? 'Tarjeta Verde ✓' : 'Tarjeta Roja ✗'}
            </span>
          </div>
          {scaffold.assembly_notes && (
            <div className="mt-3 p-3 bg-gray-50 rounded border-l-4 border-green-500">
              <span className="text-gray-600 text-sm font-semibold">Notas de Montaje:</span>
              <p className="mt-1 text-gray-800">{scaffold.assembly_notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Información de Desmontaje */}
      {assemblyStatus === 'disassembled' && (
        <div className="bg-white border-2 border-yellow-200 p-4 rounded-lg">
          <h3 className="font-bold text-yellow-700 mb-3 text-lg flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
            Información de Desmontaje
          </h3>
          {scaffold.disassembly_image_url && (
            <div className="mb-4 bg-gray-50 rounded-lg p-4">
              <img
                src={getImageUrl(scaffold.disassembly_image_url)}
                alt="Foto de desmontaje"
                className="rounded-lg w-full object-contain max-h-[400px] mx-auto shadow-lg"
                onError={handleImageError}
              />
            </div>
          )}
          <div className="space-y-2">
            {scaffold.disassembled_at && (
              <div>
                <span className="text-gray-600 text-sm">Fecha de Desmontaje:</span>
                <p className="font-semibold">{new Date(scaffold.disassembled_at).toLocaleString('es-CL', {
                  dateStyle: 'full',
                  timeStyle: 'short'
                })}</p>
              </div>
            )}
            {scaffold.disassembly_notes && (
              <div className="mt-3 p-3 bg-gray-50 rounded border-l-4 border-yellow-500">
                <span className="text-gray-600 text-sm font-semibold">Notas de Desmontaje:</span>
                <p className="mt-1 text-gray-800">{scaffold.disassembly_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Línea de Tiempo - Visible para todos, especialmente útil para clientes */}
      {user?.role === 'client' && (
        <div className="mt-6 pt-6 border-t-2 border-gray-200">
          <ScaffoldTimeline scaffoldId={scaffold.id} />
        </div>
      )}

      {/* Botón de Eliminar - Solo para Administradores */}
      {onDelete && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleDeleteClick}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Eliminar Andamio
          </button>
        </div>
      )}
    </div>
  );
};

export default ScaffoldDetailsModal;
