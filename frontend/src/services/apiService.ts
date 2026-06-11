// Contrato Alltura de sesión:
// - baseURL same-origin '/api'
// - interceptor 401 -> refreshAccessToken (singleton) -> retry de request original
// Este comportamiento vive en httpClient y se consume de forma única desde apiService.
export * from './api';
