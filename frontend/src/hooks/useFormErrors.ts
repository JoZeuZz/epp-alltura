import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { extractApiError } from '../lib/apiError';

export const useFormErrors = () => {
  const [error, setError] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleError = useCallback((err: unknown) => {
    const { message, fieldErrors: fe, isServerError } = extractApiError(err);

    if (isServerError) {
      toast.error(message);
      setError('');
    } else {
      setError(message);
    }

    setFieldErrors(fe);
  }, []);

  const clearError = useCallback(() => {
    setError('');
    setFieldErrors({});
  }, []);

  return { error, fieldErrors, handleError, clearError };
};
