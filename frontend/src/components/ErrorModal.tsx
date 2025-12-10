import React from 'react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  details?: string;
}

/**
 * Modal para mostrar errores críticos o importantes
 * Útil para errores de conexión, autenticación, etc.
 */
const ErrorModal: React.FC<ErrorModalProps> = ({ 
  isOpen, 
  onClose, 
  title = 'Error',
  message,
  details 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all">
        {/* Icono de error */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Título */}
        <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
          {title}
        </h3>

        {/* Mensaje principal */}
        <p className="text-gray-700 mb-4 text-center">
          {message}
        </p>

        {/* Detalles opcionales */}
        {details && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-600 break-words">
              {details}
            </p>
          </div>
        )}

        {/* Botón de cerrar */}
        <button
          onClick={onClose}
          className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
        >
          Entendido
        </button>
      </div>
    </div>
  );
};

export default ErrorModal;
