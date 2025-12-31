/**
 * Mensajes de respuesta estandarizados para la API
 * Facilita la consistencia en las respuestas al cliente
 */

const SuccessMessages = {
  // Scaffolds
  SCAFFOLD_CREATED: 'Andamio creado exitosamente',
  SCAFFOLD_UPDATED: 'Andamio actualizado exitosamente',
  SCAFFOLD_DELETED: 'Andamio eliminado exitosamente',
  SCAFFOLD_STATUS_UPDATED: 'Estado del andamio actualizado exitosamente',
  
  // Projects
  PROJECT_CREATED: 'Proyecto creado exitosamente',
  PROJECT_UPDATED: 'Proyecto actualizado exitosamente',
  PROJECT_DELETED: 'Proyecto eliminado exitosamente',
  CLIENT_ASSIGNED: 'Cliente asignado exitosamente',
  SUPERVISOR_ASSIGNED: 'Supervisor asignado exitosamente',
  
  // Users
  USER_CREATED: 'Usuario creado exitosamente',
  USER_UPDATED: 'Usuario actualizado exitosamente',
  USER_DELETED: 'Usuario eliminado exitosamente',
  
  // History
  HISTORY_DELETED: 'Entrada de historial eliminada exitosamente',
  
  // General
  OPERATION_SUCCESS: 'Operación completada exitosamente',
};

const ErrorMessages = {
  // Authentication
  UNAUTHORIZED: 'No autorizado. Por favor inicie sesión',
  FORBIDDEN: 'Acceso denegado. No tiene permisos suficientes',
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  
  // Scaffolds
  SCAFFOLD_NOT_FOUND: 'Andamio no encontrado',
  SCAFFOLD_NOT_OWNER: 'Solo puedes editar andamios que tú mismo creaste',
  INITIAL_IMAGE_REQUIRED: 'La imagen inicial es obligatoria',
  DISASSEMBLY_IMAGE_REQUIRED: 'Se requiere imagen de desarmado',
  GREEN_CARD_DISASSEMBLED: 'No puedes poner tarjeta verde mientras el andamio esté desarmado',
  PROGRESS_NOT_100: 'El andamio debe tener 100% de progreso para marcarse como armado',
  
  // Projects
  PROJECT_NOT_FOUND: 'Proyecto no encontrado',
  CLIENT_NOT_FOUND: 'Cliente no encontrado',
  SUPERVISOR_NOT_FOUND: 'Supervisor no encontrado',
  INVALID_ROLE_CLIENT: 'El usuario debe tener rol de cliente',
  INVALID_ROLE_SUPERVISOR: 'El usuario debe tener rol de supervisor',
  
  // Users
  USER_NOT_FOUND: 'Usuario no encontrado',
  EMAIL_EXISTS: 'El correo electrónico ya está registrado',
  
  // History
  HISTORY_NOT_FOUND: 'Entrada de historial no encontrada',
  
  // Validation
  VALIDATION_ERROR: 'Error de validación',
  INVALID_IMAGE_FORMAT: 'Formato de imagen no válido',
  IMAGE_TOO_LARGE: 'La imagen es demasiado grande',
  INVALID_DIMENSIONS: 'Dimensiones inválidas',
  
  // General
  SERVER_ERROR: 'Error del servidor. Inténtelo más tarde',
  MISSING_REQUIRED_FIELDS: 'Faltan campos obligatorios',
};

/**
 * Crear respuesta de éxito estandarizada
 */
const successResponse = (data, message = SuccessMessages.OPERATION_SUCCESS) => {
  return {
    success: true,
    message,
    data,
  };
};

/**
 * Crear respuesta de error estandarizada
 */
const errorResponse = (message = ErrorMessages.SERVER_ERROR, errors = null) => {
  const response = {
    success: false,
    message,
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  return response;
};

/**
 * Formatear errores de validación de Joi
 */
const formatJoiErrors = (joiError) => {
  return joiError.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
  }));
};

module.exports = {
  SuccessMessages,
  ErrorMessages,
  successResponse,
  errorResponse,
  formatJoiErrors,
};
