import React from 'react';

interface ErrorMessageProps {
  message?: string;
  className?: string;
}

/**
 * Componente para mostrar mensajes de error en formularios
 * Muestra un mensaje en rojo debajo del campo con error
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, className = '' }) => {
  if (!message) return null;

  return (
    <p className={`text-red-600 text-sm mt-1 ${className}`}>
      {message}
    </p>
  );
};

export default ErrorMessage;
