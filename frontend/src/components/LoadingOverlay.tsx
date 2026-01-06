import React from 'react';

interface LoadingOverlayProps {
  isOpen: boolean;
  message?: string;
  subMessage?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = React.memo(({ 
  isOpen, 
  message = 'Cargando...', 
  subMessage 
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      role="alert"
      aria-live="assertive"
      aria-busy="true"
    >
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
        {/* Spinner animado */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-primary-blue border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
        </div>

        {/* Mensaje principal */}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-dark-blue mb-2">
            {message}
          </h3>
          
          {/* Submensaje opcional */}
          {subMessage && (
            <p className="text-sm text-gray-600 mt-2">
              {subMessage}
            </p>
          )}
        </div>

        {/* Barra de progreso indeterminada */}
        <div className="mt-6 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-primary-blue rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
});

LoadingOverlay.displayName = 'LoadingOverlay';

export default LoadingOverlay;
