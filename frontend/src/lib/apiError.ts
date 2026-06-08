import type { ApiError } from '../types/api';

export interface ApiErrorResult {
  message: string;
  fieldErrors: Record<string, string>;
  isServerError: boolean;
}

const FALLBACK = 'Ocurrió un error. Por favor, intente de nuevo.';

export function extractApiError(err: unknown): ApiErrorResult {
  const apiErr = err as ApiError;
  const status = apiErr?.response?.status ?? 0;
  const data = apiErr?.response?.data;

  const isServerError = !data || status === 0 || status >= 500;

  const message =
    data?.message ||
    data?.error ||
    apiErr?.message ||
    (isServerError ? 'Error inesperado. Intente de nuevo.' : FALLBACK);

  const fieldErrors: Record<string, string> = {};
  if (data?.fieldErrors) {
    Object.assign(fieldErrors, data.fieldErrors);
  }
  if (Array.isArray(data?.errors)) {
    for (const e of data.errors) {
      if (e.field && e.message) fieldErrors[e.field] = e.message;
    }
  }

  return { message, fieldErrors, isServerError };
}
