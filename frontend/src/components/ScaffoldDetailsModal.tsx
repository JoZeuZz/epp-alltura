import React from 'react';
import { Scaffold } from '../types/api';

interface ScaffoldDetailsModalProps {
  scaffold: Scaffold;
}

const ScaffoldDetailsModal: React.FC<ScaffoldDetailsModalProps> = ({ scaffold }) => {
  const getImageUrl = (url: string) => {
    return url.startsWith('http') ? url : `http://localhost:5000${url}`;
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo imagen%3C/text%3E%3C/svg%3E';
  };

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6 text-dark-blue border-b pb-4">
        Detalle del {scaffold.project_name ? 'Reporte' : 'Andamio'} #{scaffold.id}
      </h2>
      
      {/* Imagen de Montaje */}
      <div className="mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <img
            src={getImageUrl(scaffold.assembly_image_url)}
            alt="Foto de montaje"
            className="rounded-lg w-full object-contain max-h-[400px] mx-auto shadow-lg"
            onError={handleImageError}
          />
        </div>
      </div>

      {/* Información Principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-bold text-primary-blue mb-3 text-lg">Información del Proyecto</h3>
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

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-bold text-green-700 mb-3 text-lg">Participantes</h3>
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
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-bold text-dark-blue mb-3 text-lg">Especificaciones Técnicas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600 text-sm">Alto</p>
            <p className="text-2xl font-bold text-primary-blue">{scaffold.height}m</p>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600 text-sm">Ancho</p>
            <p className="text-2xl font-bold text-primary-blue">{scaffold.width}m</p>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600 text-sm">Profundidad</p>
            <p className="text-2xl font-bold text-primary-blue">{scaffold.depth}m</p>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600 text-sm">Volumen</p>
            <p className="text-2xl font-bold text-primary-blue">{scaffold.cubic_meters} m³</p>
          </div>
        </div>
      </div>

      {/* Información de Montaje */}
      <div className="bg-white border-2 border-green-200 p-4 rounded-lg mb-6">
        <h3 className="font-bold text-green-700 mb-3 text-lg flex items-center gap-2">
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
