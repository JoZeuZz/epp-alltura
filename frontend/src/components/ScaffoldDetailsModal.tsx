import React, { useState } from 'react';
import { Scaffold } from '../types/api';
import ConfirmationModal from './ConfirmationModal';

interface ScaffoldDetailsModalProps {
  scaffold: Scaffold;
  onDelete?: (scaffoldId: number) => void;
  isAdmin?: boolean;
}

const ScaffoldDetailsModal: React.FC<ScaffoldDetailsModalProps> = ({ 
  scaffold, 
  onDelete, 
  isAdmin = false 
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getImageUrl = (url: string) => {
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
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-4 md:mb-6 pb-3 md:pb-4 border-b">
        <h2 className="text-xl md:text-2xl font-bold text-dark-blue">
          Detalle del {scaffold.project_name ? 'Reporte' : 'Andamio'} #{scaffold.id}
        </h2>
        
        {isAdmin && onDelete && (
          <button
            onClick={handleDeleteClick}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar
          </button>
        )}
      </div>

      {/* Modal de confirmación para eliminar */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmar eliminación"
        message={`¿Estás seguro de que deseas eliminar este reporte? Esta acción eliminará el andamio #${scaffold.id} y todas sus imágenes asociadas. Esta acción no se puede deshacer.`}
      />
      
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
          <h3 className="font-bold text-green-700 mb-2 md:mb-3 text-base md:text-lg">Participantes</h3>
          <div className="space-y-2">
            {scaffold.company_name && (
              <div>
                <span className="text-gray-600 text-sm">Solicitante:</span>
                <p className="font-semibold">{scaffold.company_name}</p>
              </div>
            )}
            {scaffold.end_user_name && (
              <div>
                <span className="text-gray-600 text-sm">Usuario:</span>
                <p className="font-semibold">{scaffold.end_user_name}</p>
              </div>
            )}
            {scaffold.supervisor_name && (
              <div>
                <span className="text-gray-600 text-sm">Supervisor:</span>
                <p className="font-semibold">{scaffold.supervisor_name}</p>
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
            <p className="text-gray-600 text-xs md:text-sm">Profundidad</p>
            <p className="text-xl md:text-2xl font-bold text-primary-blue">{scaffold.depth}m</p>
          </div>
          <div className="text-center p-2 md:p-3 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600 text-xs md:text-sm">Volumen</p>
            <p className="text-xl md:text-2xl font-bold text-primary-blue">{scaffold.cubic_meters} m³</p>
          </div>
        </div>
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
              scaffold.status === 'assembled' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {scaffold.status === 'assembled' ? 'Armado' : 'Desarmado'}
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
      {scaffold.status === 'disassembled' && (
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
    </div>
  );
};

export default ScaffoldDetailsModal;
