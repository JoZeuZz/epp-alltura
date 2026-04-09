import React from 'react';

interface ErrorMessageProps {
  message?: string;
  className?: string;
}

/**
 * Componente para mostrar mensajes de error en formularios
 * Muestra un mensaje en rojo debajo del campo con error
 */
const ErrorMessage: React.FC<ErrorMessageProps> = React.memo(({ message, className = '' }) => {
  if (!message) return null;

  return (
    <p 
      className={`text-red-600 text-sm mt-1 ${className}`}
      role="alert"
      aria-live="polite"
    >
      {message}
    </p>
  );
});

ErrorMessage.displayName = 'ErrorMessage';

export default ErrorMessage;
