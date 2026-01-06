import { useState, useCallback } from 'react';
import type { ApiError } from '../types/api';

/**
 * Hook simplificado para manejar errores generales de API
 * Los errores de validación por campo son manejados por React Hook Form + Zod
 */
export const useFormErrors = () => {
  const [generalError, setGeneralError] = useState<string>('');

  /**
   * Procesa un error de API y extrae el mensaje general
   */
  const handleApiError = useCallback((error: unknown) => {
    const apiError = error as ApiError;
    
    // Resetear error previo
    setGeneralError('');

    // Extraer datos del error
    const errorData = apiError.response?.data;
    
    if (!errorData) {
      setGeneralError('Error de conexión. Por favor, intente de nuevo.');
      return;
    }

    // Obtener mensaje de error (priorizar message sobre error)
    const errorMessage = errorData.message || errorData.error || 'Ocurrió un error. Por favor, intente de nuevo.';
    setGeneralError(errorMessage);
  }, []);

  /**
   * Limpia el error general
   */
  const clearErrors = useCallback(() => {
    setGeneralError('');
  }, []);

  return {
    generalError,
    handleApiError,
    clearErrors,
  };
};
