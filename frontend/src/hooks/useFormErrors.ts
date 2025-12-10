import { useState, useCallback } from 'react';

interface FieldErrors {
  [key: string]: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
      fieldErrors?: FieldErrors;
      errors?: Array<{ field: string; message: string }>;
    };
  };
}

/**
 * Hook personalizado para manejar errores de formulario
 * Convierte errores de API a formato manejable por campo
 */
export const useFormErrors = () => {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string>('');

  /**
   * Procesa un error de API y extrae errores por campo
   */
  const handleApiError = useCallback((error: any) => {
    const apiError = error as ApiError;
    
    // Resetear errores previos
    setFieldErrors({});
    setGeneralError('');

    // Extraer datos del error
    const errorData = apiError.response?.data;
    
    if (!errorData) {
      setGeneralError('Error de conexión. Por favor, intente de nuevo.');
      return;
    }

    // Si hay errores por campo (formato fieldErrors)
    if (errorData.fieldErrors) {
      setFieldErrors(errorData.fieldErrors);
      setGeneralError(errorData.message || 'Por favor, corrija los errores en el formulario.');
      return;
    }

    // Si hay errores en formato array
    if (errorData.errors && Array.isArray(errorData.errors)) {
      const errors: FieldErrors = {};
      errorData.errors.forEach((err: { field: string; message: string }) => {
        errors[err.field] = err.message;
      });
      setFieldErrors(errors);
      setGeneralError(errorData.message || 'Por favor, corrija los errores en el formulario.');
      return;
    }

    // Error general sin campos específicos
    setGeneralError(errorData.message || 'Ocurrió un error. Por favor, intente de nuevo.');
  }, []);

  /**
   * Limpia el error de un campo específico
   */
  const clearFieldError = useCallback((fieldName: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  /**
   * Limpia todos los errores
   */
  const clearErrors = useCallback(() => {
    setFieldErrors({});
    setGeneralError('');
  }, []);

  /**
   * Obtiene el error de un campo específico
   */
  const getFieldError = useCallback((fieldName: string): string | undefined => {
    return fieldErrors[fieldName];
  }, [fieldErrors]);

  /**
   * Verifica si un campo tiene error
   */
  const hasFieldError = useCallback((fieldName: string): boolean => {
    return !!fieldErrors[fieldName];
  }, [fieldErrors]);

  return {
    fieldErrors,
    generalError,
    handleApiError,
    clearFieldError,
    clearErrors,
    getFieldError,
    hasFieldError,
  };
};
