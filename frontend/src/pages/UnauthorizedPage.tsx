import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Página que se muestra cuando un usuario intenta acceder a una ruta sin los permisos adecuados
 */
export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        {/* Icono */}
        <div className="mb-6">
          <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-6xl">🚫</span>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Acceso Denegado
        </h1>

        {/* Mensaje */}
        <p className="text-gray-600 mb-8">
          No tienes permisos suficientes para acceder a esta página. 
          Si crees que esto es un error, contacta con el administrador del sistema.
        </p>

        {/* Información de roles */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 text-left">
          <h3 className="font-semibold text-blue-800 mb-2">Roles en el sistema:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Admin:</strong> Acceso completo al sistema</li>
            <li>• <strong>Supervisor:</strong> Crear y editar andamios</li>
            <li>• <strong>Cliente:</strong> Ver proyectos asignados</li>
          </ul>
        </div>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleGoBack}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            ← Volver Atrás
          </button>
          <button
            onClick={handleGoHome}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            🏠 Ir al Inicio
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
