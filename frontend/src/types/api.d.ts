export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'supervisor';
  password?: string;
  created_at: string;
  rut?: string;
  phone_number?: string;
  profile_picture_url?: string;
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  errors?: Array<{ field: string; message: string }>;
}

export interface ApiError {
  response?: {
    data?: ApiErrorResponse;
    status?: number;
    statusText?: string;
  };
  message?: string;
}
