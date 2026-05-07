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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="alert"
      aria-live="assertive"
      aria-busy="true"
    >
      <div className="bg-surface rounded-lg shadow-modal p-8 max-w-md w-full mx-4 transform transition-all">
        {/* Spinner animado */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-edge rounded-full"></div>
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
        </div>

        {/* Mensaje principal */}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-content-primary mb-2">
            {message}
          </h3>

          {/* Submensaje opcional */}
          {subMessage && (
            <p className="text-sm text-content-secondary mt-2">
              {subMessage}
            </p>
          )}
        </div>

        {/* Barra de progreso indeterminada */}
        <div className="mt-6 w-full bg-surface-overlay rounded-full h-2 overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
});

LoadingOverlay.displayName = 'LoadingOverlay';

export default LoadingOverlay;
