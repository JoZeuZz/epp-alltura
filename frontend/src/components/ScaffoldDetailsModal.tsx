import React, { useEffect, useState } from 'react';
import { Scaffold } from '../types/api';
import ConfirmationModal from './ConfirmationModal';
import ScaffoldTimeline from './ScaffoldTimeline';
import AddModificationModal from './AddModificationModal';
import ModificationsList from './ModificationsList';
import ClientNotesList from './ClientNotesList';
import { useScaffoldModifications } from '../hooks/useScaffoldModifications';
import { useClientNotes } from '../hooks/useClientNotes';
import { put } from '../services/apiService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ImageWithFallback from './ImageWithFallback';
import { buildImageUrl } from '../utils/image';

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
  const [showAddModificationModal, setShowAddModificationModal] = useState(false);
  const [activeImageKey, setActiveImageKey] = useState<'assembly' | 'disassembly' | null>(
    scaffold.assembly_image_url ? 'assembly' : scaffold.disassembly_image_url ? 'disassembly' : null
  );

  // Hook para gestionar modificaciones
  const {
    modifications,
    loading: modsLoading,
    error: modsError,
    createModification,
    approve,
    reject,
    deleteModif,
    pendingCount,
    totalAdditionalCubicMeters,
  } = useScaffoldModifications({
    scaffoldId: scaffold.id,
    autoFetch: true,
  });
  // Hook para gestionar notas de cliente
  const {
    notes: clientNotes,
    loading: notesLoading,
    createNote,
    updateNote: updateNoteHook,
    resolveNote: resolveNoteHook,
    reopenNote,
    deleteNote
  } = useClientNotes({
    scaffoldId: scaffold.id
  });

  // Wrappers para adaptar las firmas de callbacks
  const handleUpdateNote = async (noteId: number, noteText: string) => {
    await updateNoteHook(noteId, { note_text: noteText });
  };

  const handleResolveNote = async (noteId: number, resolutionNotes?: string) => {
    await resolveNoteHook(noteId, resolutionNotes ? { resolution_notes: resolutionNotes } : undefined);
  };
  const getImageUrl = (url: string | null | undefined, size: 'thumb' | 'medium' | 'full' = 'full') =>
    buildImageUrl(url || '', size);

  const hasAssemblyImage = Boolean(scaffold.assembly_image_url);
  const hasDisassemblyImage = Boolean(scaffold.disassembly_image_url);
  const galleryItems = [
    { key: 'assembly' as const, label: 'Montaje', url: scaffold.assembly_image_url },
    { key: 'disassembly' as const, label: 'Desarmado', url: scaffold.disassembly_image_url },
  ].filter((item) => item.url);
  const activeImage =
    galleryItems.find((item) => item.key === activeImageKey) || galleryItems[0] || null;

  useEffect(() => {
    if (!hasAssemblyImage && !hasDisassemblyImage) {
      setActiveImageKey(null);
      return;
    }

    if (activeImageKey === 'assembly' && !hasAssemblyImage) {
      setActiveImageKey(hasDisassemblyImage ? 'disassembly' : null);
    } else if (activeImageKey === 'disassembly' && !hasDisassemblyImage) {
      setActiveImageKey(hasAssemblyImage ? 'assembly' : null);
    } else if (!activeImageKey) {
      setActiveImageKey(hasAssemblyImage ? 'assembly' : 'disassembly');
    }

  }, [
    scaffold.id,
    hasAssemblyImage,
    hasDisassemblyImage,
    activeImageKey,
  ]);

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
    
    // Validación: No permitir cambiar porcentaje de andamios desarmados
    if (assemblyStatus === 'disassembled') {
      alert('No puedes cambiar el porcentaje de un andamio desarmado. Los andamios desarmados permanecen en 0% como registro histórico.');
      handleCancelProgressEdit();
      return;
    }
    
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
    } catch (error: unknown) {
      console.error('Error updating progress percentage:', error);
      const apiError = error as { response?: { data?: { error?: string; message?: string } } };
      const errorMessage = apiError?.response?.data?.error || apiError?.response?.data?.message || 'Error al actualizar el porcentaje de avance';
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
            
            {/* Switch: Activar Armado (solo si está en proceso) */}
            {assemblyStatus === 'in_progress' && (
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex-1">
                    <span className="font-semibold text-gray-700 block mb-1">Completar Armado</span>
                    <span className="text-sm text-gray-500">
                      Completar armado (de {progressPercentage}% a 100%)
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
            
            {/* Mensaje informativo para andamios desarmados */}
            {assemblyStatus === 'disassembled' && (
              <div className="col-span-full bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-800 font-semibold">
                      Andamio Desarmado - Registro Histórico
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Este andamio fue desarmado y permanece como registro histórico inmutable. No puede ser rearmado ni modificado. Si necesitas un nuevo andamio en esta ubicación, crea uno desde cero.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Switch: Desarmar (solo si está armado al 100%) */}
            {assemblyStatus === 'assembled' && progressPercentage === 100 && (
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

            {/* Switch Estado de Tarjeta - Solo disponible si está armado al 100% */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <label className={`flex items-center justify-between ${assemblyStatus !== 'assembled' || progressPercentage !== 100 ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                <div className="flex-1">
                  <span className="font-semibold text-gray-700 block mb-1">Estado de Tarjeta</span>
                  <span className="text-sm text-gray-500">
                    {cardStatus === 'green' ? 'Tarjeta Verde ✓' : 'Tarjeta Roja ✗'}
                  </span>
                  {(assemblyStatus !== 'assembled' || progressPercentage !== 100) && (
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
                    disabled={isUpdating || assemblyStatus !== 'assembled' || progressPercentage !== 100}
                    className="sr-only peer"
                  />
                  <div className={`w-14 h-7 rounded-full transition-all duration-300 ${
                    cardStatus === 'green' 
                      ? 'bg-green-500' 
                      : 'bg-red-500'
                  } ${(isUpdating || assemblyStatus !== 'assembled' || progressPercentage !== 100) ? 'opacity-50' : ''}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 ${
                    cardStatus === 'green' ? 'translate-x-7' : 'translate-x-0'
                  }`}></div>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}
      
      {/* Galería de evidencias */}
      <div className="mb-4 md:mb-6">
        <div className="bg-gray-50 rounded-lg p-3 md:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-bold text-dark-blue text-base md:text-lg">Evidencias Fotográficas</h3>
          </div>

          {!hasAssemblyImage && !hasDisassemblyImage ? (
            <div className="text-center text-sm text-gray-500 py-6">
              Aún no hay imágenes registradas para este andamio.
            </div>
          ) : (
            <div className="bg-white rounded-lg p-2 shadow-lg">
              <ImageWithFallback
                src={activeImage ? getImageUrl(activeImage.url, 'medium') : ''}
                alt={activeImage?.label || 'Evidencia fotográfica'}
                className="rounded-lg w-full object-contain max-h-[250px] sm:max-h-[350px] md:max-h-[400px] mx-auto"
              />
              {activeImage && (
                <p className="mt-2 text-xs text-gray-500 text-center">
                  {activeImage.label}
                </p>
              )}
            </div>
          )}

          {galleryItems.length > 1 && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {galleryItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setActiveImageKey(item.key);
                  }}
                  className={`rounded-lg border p-2 text-left transition ${
                    activeImageKey === item.key
                      ? 'border-primary-blue bg-white'
                      : 'border-transparent bg-white/60 hover:border-primary-blue/40'
                  }`}
                >
                  <ImageWithFallback
                    src={getImageUrl(item.url, 'thumb')}
                    alt={item.label}
                    className="w-full h-24 object-cover rounded-md"
                  />
                  <span className="mt-2 block text-xs font-semibold text-gray-600">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          )}
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
            <p className="text-gray-600 text-xs md:text-sm">Volumen Base</p>
            <p className="text-xl md:text-2xl font-bold text-primary-blue">{scaffold.cubic_meters} m³</p>
          </div>
        </div>
        
        {/* Total con modificaciones */}
        {totalAdditionalCubicMeters > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-600">m³ Base</p>
                <p className="text-lg font-bold text-gray-700">{parseFloat(String(scaffold.cubic_meters)).toFixed(2)} m³</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">m³ Adicionales</p>
                <p className="text-lg font-bold text-blue-600">+{totalAdditionalCubicMeters.toFixed(2)} m³</p>
              </div>
              <div className="md:col-span-1">
                <p className="text-xs text-gray-600">Total m³</p>
                <p className="text-2xl font-bold text-blue-700">
                  {(parseFloat(String(scaffold.cubic_meters)) + totalAdditionalCubicMeters).toFixed(2)} m³
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Metros Cúbicos Adicionales - Solo si está assembled */}
      {assemblyStatus === 'assembled' && canEdit && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 md:p-6 rounded-lg mb-4 md:mb-6 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-blue-900 text-base md:text-lg flex items-center gap-2">
                <span className="text-2xl">📐</span>
                Metros Cúbicos Adicionales
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Agregar nuevas dimensiones a este andamio armado
              </p>
            </div>
            <button
              onClick={() => setShowAddModificationModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 text-sm md:text-base"
              disabled={modsLoading}
            >
              <span className="text-lg">+</span>
              Agregar m³
            </button>
          </div>

          {/* Lista de modificaciones */}
          {modsLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Cargando modificaciones...</p>
            </div>
          ) : modsError ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {modsError}
            </div>
          ) : modifications.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                Modificaciones ({modifications.length}/5):
                {pendingCount > 0 && (
                  <span className="ml-2 text-yellow-700">
                    ({pendingCount} pendiente{pendingCount > 1 ? 's' : ''})
                  </span>
                )}
              </p>
              <ModificationsList
                modifications={modifications}
                currentUserRole={user?.role || 'client'}
                onApprove={approve}
                onReject={reject}
                onDelete={deleteModif}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No hay modificaciones registradas aún
            </p>
          )}
        </div>
      )}

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

      {/* Notas de Cliente - Visible para todos los usuarios */}
      <div className="mt-6 pt-6 border-t-2 border-gray-200">
        <h3 className="font-bold text-blue-700 mb-4 text-lg flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          Notas del Cliente
        </h3>
        <ClientNotesList
          notes={clientNotes}
          loading={notesLoading}
          currentUserId={user?.id}
          currentUserRole={user?.role}
          showCreateForm={true}
          targetType="scaffold"
          targetId={scaffold.id}
          onCreateNote={createNote}
          onUpdateNote={handleUpdateNote}
          onResolveNote={handleResolveNote}
          onReopenNote={reopenNote}
          onDeleteNote={deleteNote}
        />
      </div>

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

      {/* Modal para agregar modificación */}
      <AddModificationModal
        isOpen={showAddModificationModal}
        onClose={() => setShowAddModificationModal(false)}
        onSubmit={createModification}
        scaffoldCubicMeters={parseFloat(String(scaffold.cubic_meters))}
        currentModificationsCount={modifications.filter(m => m.approval_status !== 'rejected').length}
      />
    </div>
  );
};

export default ScaffoldDetailsModal;
