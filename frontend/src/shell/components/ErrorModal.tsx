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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      role="alertdialog"
      aria-labelledby="error-modal-title"
      aria-describedby="error-modal-message"
    >
      <div className="bg-surface rounded-lg shadow-modal p-6 max-w-md w-full mx-4 transform transition-all">
        {/* Icono de error */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-danger-subtle rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-danger"
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
        <h3 id="error-modal-title" className="text-xl font-bold text-content-primary mb-2 text-center">
          {title}
        </h3>

        {/* Mensaje principal */}
        <p id="error-modal-message" className="text-content-secondary mb-4 text-center">
          {message}
        </p>

        {/* Detalles opcionales */}
        {details && (
          <div className="bg-surface-muted rounded-lg p-3 mb-4">
            <p className="text-sm text-content-muted break-words">
              {details}
            </p>
          </div>
        )}

        {/* Botón de cerrar */}
        <button
          onClick={onClose}
          className="w-full bg-danger text-white py-2 px-4 rounded-lg hover:bg-danger-text focus:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 transition-colors"
        >
          Entendido
        </button>
      </div>
    </div>
  );
};

export default ErrorModal;
