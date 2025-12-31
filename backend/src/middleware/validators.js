/**
 * Joi Validation Schemas
 * Define y valida todas las estructuras de datos de entrada
 * 
 * Remedia:
 * - CVE-ALLTURA-011: Weak Input Validation (CVSS 6.5)
 * - CVE-ALLTURA-012: Type Confusion Attacks (CVSS 5.8)
 * 
 * Estrategia:
 * - Whitelist approach: Solo aceptar valores explícitamente permitidos
 * - Type enforcement: Validar tipos estrictos
 * - Range validation: Límites mínimos/máximos
 * - Format validation: Regex para formatos específicos
 * 
 * Referencias:
 * - OWASP Input Validation: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
 * - Joi Documentation: https://joi.dev/api/
 */

const Joi = require('joi');

/**
 * Patrones regex comunes
 */
const PATTERNS = {
  // RUT chileno: 12.345.678-9 o 12345678-9
  RUT: /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$|^\d{7,8}-[\dkK]$/,
  
  // Teléfono chileno: +56912345678 o 912345678
  PHONE_CL: /^(\+?56)?[2-9]\d{8}$/,
  
  // Nombre propio (letras, espacios, tildes, guiones)
  NAME: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/,
  
  // Alfanumérico con espacios y guiones
  ALPHANUMERIC: /^[a-zA-Z0-9\s-]+$/,
  
  // Slug URL-friendly
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  
  // UUID v4
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  // Coordenadas geográficas (latitud, longitud)
  LAT: /^-?([1-8]?[0-9]\.{1}\d+|90\.{1}0+)$/,
  LNG: /^-?((1[0-7]|[1-9]?)[0-9]\.{1}\d+|180\.{1}0+)$/,
};

/**
 * Esquemas base reutilizables
 */
const baseSchemas = {
  // ID de base de datos (entero positivo)
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'El ID debe ser un número',
      'number.integer': 'El ID debe ser un entero',
      'number.positive': 'El ID debe ser positivo',
      'any.required': 'El ID es requerido',
    }),
  
  // Email con normalización
  email: Joi.string()
    .email({ tlds: { allow: false } }) // Permitir cualquier TLD
    .lowercase()
    .trim()
    .max(255)
    .required()
    .messages({
      'string.email': 'Debe ser un email válido',
      'string.max': 'El email no puede exceder 255 caracteres',
      'any.required': 'El email es requerido',
    }),
  
  // Password según NIST SP 800-63B
  password: Joi.string()
    .min(12)
    .max(128)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 12 caracteres',
      'string.max': 'La contraseña no puede exceder 128 caracteres',
      'any.required': 'La contraseña es requerida',
    }),
  
  // Nombre propio
  name: Joi.string()
    .pattern(PATTERNS.NAME)
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.pattern.base': 'El nombre solo puede contener letras, espacios y guiones',
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres',
      'any.required': 'El nombre es requerido',
    }),
  
  // RUT chileno
  rut: Joi.string()
    .pattern(PATTERNS.RUT)
    .trim()
    .messages({
      'string.pattern.base': 'Formato de RUT inválido. Use: 12.345.678-9',
    }),
  
  // Teléfono chileno
  phone: Joi.string()
    .pattern(PATTERNS.PHONE_CL)
    .trim()
    .messages({
      'string.pattern.base': 'Formato de teléfono inválido. Use: +56912345678',
    }),
  
  // Rol de usuario
  role: Joi.string()
    .valid('admin', 'supervisor', 'client')
    .required()
    .messages({
      'any.only': 'El rol debe ser admin, supervisor o client',
      'any.required': 'El rol es requerido',
    }),
  
  // Estado de proyecto
  projectStatus: Joi.string()
    .valid('active', 'completed', 'cancelled', 'on_hold')
    .default('active')
    .messages({
      'any.only': 'Estado inválido',
    }),
  
  // URL con validación estricta
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(2048)
    .messages({
      'string.uri': 'Debe ser una URL válida (http/https)',
      'string.max': 'La URL no puede exceder 2048 caracteres',
    }),
  
  // Fecha ISO 8601
  date: Joi.date()
    .iso()
    .messages({
      'date.format': 'La fecha debe estar en formato ISO 8601',
    }),
  
  // Coordenadas GPS
  latitude: Joi.number()
    .min(-90)
    .max(90)
    .precision(8) // ~1.1mm de precisión
    .messages({
      'number.min': 'Latitud debe estar entre -90 y 90',
      'number.max': 'Latitud debe estar entre -90 y 90',
    }),
  
  longitude: Joi.number()
    .min(-180)
    .max(180)
    .precision(8)
    .messages({
      'number.min': 'Longitud debe estar entre -180 y 180',
      'number.max': 'Longitud debe estar entre -180 y 180',
    }),
};

/**
 * Validadores para rutas de autenticación
 */
const authValidators = {
  // POST /api/auth/register
  register: Joi.object({
    first_name: baseSchemas.name,
    last_name: baseSchemas.name,
    email: baseSchemas.email,
    password: baseSchemas.password,
    role: baseSchemas.role,
    rut: baseSchemas.rut.optional(),
    phone_number: baseSchemas.phone.optional(),
  }),
  
  // POST /api/auth/login
  login: Joi.object({
    email: baseSchemas.email,
    password: Joi.string().required().messages({
      'any.required': 'La contraseña es requerida',
    }),
  }),
  
  // POST /api/auth/change-password
  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'La contraseña actual es requerida',
    }),
    newPassword: baseSchemas.password,
  }),
  
  // POST /api/auth/refresh
  refresh: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'El refresh token es requerido',
    }),
  }),
};

/**
 * Validadores para rutas de usuarios
 */
const userValidators = {
  // POST /api/users
  create: Joi.object({
    first_name: baseSchemas.name,
    last_name: baseSchemas.name,
    email: baseSchemas.email,
    password: baseSchemas.password,
    role: baseSchemas.role,
    rut: baseSchemas.rut.optional(),
    phone_number: baseSchemas.phone.optional(),
    profile_picture_url: baseSchemas.url.optional(),
  }),
  
  // PUT /api/users/:id
  update: Joi.object({
    first_name: baseSchemas.name.optional(),
    last_name: baseSchemas.name.optional(),
    email: baseSchemas.email.optional(),
    password: baseSchemas.password.optional(),
    role: baseSchemas.role.optional(),
    rut: baseSchemas.rut.optional().allow('', null),
    phone_number: baseSchemas.phone.optional().allow('', null),
    profile_picture_url: baseSchemas.url.optional().allow('', null),
  }).min(1), // Al menos un campo debe estar presente
  
  // GET /api/users?role=...
  query: Joi.object({
    role: Joi.string().valid('admin', 'supervisor', 'client').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

/**
 * Validadores para rutas de proyectos
 */
const projectValidators = {
  // POST /api/projects
  create: Joi.object({
    name: Joi.string()
      .min(3)
      .max(200)
      .trim()
      .required()
      .messages({
        'string.min': 'El nombre debe tener al menos 3 caracteres',
        'string.max': 'El nombre no puede exceder 200 caracteres',
        'any.required': 'El nombre es requerido',
      }),
    
    client_id: baseSchemas.id,
    
    location: Joi.string()
      .max(500)
      .trim()
      .required()
      .messages({
        'string.max': 'La ubicación no puede exceder 500 caracteres',
        'any.required': 'La ubicación es requerida',
      }),
    
    status: baseSchemas.projectStatus,
    
    description: Joi.string()
      .max(2000)
      .trim()
      .allow('', null)
      .messages({
        'string.max': 'La descripción no puede exceder 2000 caracteres',
      }),
    
    start_date: baseSchemas.date.optional(),
    end_date: baseSchemas.date.optional(),
    
    // Coordenadas GPS opcionales
    gps_latitude: baseSchemas.latitude.optional(),
    gps_longitude: baseSchemas.longitude.optional(),
  }),
  
  // PUT /api/projects/:id
  update: Joi.object({
    name: Joi.string().min(3).max(200).trim().optional(),
    client_id: baseSchemas.id.optional(),
    location: Joi.string().max(500).trim().optional(),
    status: baseSchemas.projectStatus.optional(),
    description: Joi.string().max(2000).trim().allow('', null).optional(),
    start_date: baseSchemas.date.optional(),
    end_date: baseSchemas.date.optional(),
    gps_latitude: baseSchemas.latitude.optional(),
    gps_longitude: baseSchemas.longitude.optional(),
  }).min(1),
  
  // POST /api/projects/:id/assign-users
  assignUsers: Joi.object({
    userIds: Joi.array()
      .items(baseSchemas.id)
      .min(0)
      .max(100)
      .unique()
      .required()
      .messages({
        'array.min': 'Debe proporcionar al menos 0 usuarios',
        'array.max': 'No puede asignar más de 100 usuarios',
        'array.unique': 'No puede haber IDs duplicados',
        'any.required': 'El array de usuarios es requerido',
      }),
  }),
  
  // GET /api/projects?status=...
  query: Joi.object({
    status: baseSchemas.projectStatus.optional(),
    client_id: baseSchemas.id.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

/**
 * Validadores para rutas de clientes
 */
const clientValidators = {
  // POST /api/clients
  create: Joi.object({
    name: Joi.string()
      .min(2)
      .max(200)
      .trim()
      .required()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede exceder 200 caracteres',
        'any.required': 'El nombre es requerido',
      }),
    
    email: baseSchemas.email.optional(),
    
    phone: baseSchemas.phone.optional(),
    
    address: Joi.string()
      .max(500)
      .trim()
      .allow('', null)
      .messages({
        'string.max': 'La dirección no puede exceder 500 caracteres',
      }),
    
    specialty: Joi.string()
      .max(200)
      .trim()
      .allow('', null)
      .messages({
        'string.max': 'La especialidad no puede exceder 200 caracteres',
      }),
  }),
  
  // PUT /api/clients/:id
  update: Joi.object({
    name: Joi.string().min(2).max(200).trim().optional(),
    email: baseSchemas.email.optional(),
    phone: baseSchemas.phone.optional(),
    address: Joi.string().max(500).trim().allow('', null).optional(),
    specialty: Joi.string().max(200).trim().allow('', null).optional(),
  }).min(1),
  
  // GET /api/clients/search?q=...
  search: Joi.object({
    q: Joi.string()
      .min(1)
      .max(200)
      .trim()
      .required()
      .messages({
        'string.min': 'La búsqueda debe tener al menos 1 caracter',
        'any.required': 'El parámetro de búsqueda es requerido',
      }),
  }),
};

/**
 * Validadores para rutas de andamios (scaffolds)
 */
const scaffoldValidators = {
  // POST /api/scaffolds
  create: Joi.object({
    project_id: baseSchemas.id,
    user_id: baseSchemas.id,
    
    cubic_meters: Joi.number()
      .positive()
      .precision(2)
      .max(999999.99)
      .required()
      .messages({
        'number.positive': 'Los metros cúbicos deben ser positivos',
        'number.max': 'Los metros cúbicos no pueden exceder 999,999.99',
        'any.required': 'Los metros cúbicos son requeridos',
      }),
    
    assembly_type: Joi.string()
      .valid('montaje', 'desmontaje', 'modificacion')
      .required()
      .messages({
        'any.only': 'Tipo inválido. Debe ser: montaje, desmontaje o modificacion',
        'any.required': 'El tipo de operación es requerido',
      }),
    
    area: Joi.string()
      .max(255)
      .trim()
      .allow('', null)
      .messages({
        'string.max': 'El área no puede exceder 255 caracteres',
      }),
    
    tag: Joi.string()
      .max(255)
      .trim()
      .allow('', null)
      .messages({
        'string.max': 'El tag no puede exceder 255 caracteres',
      }),
    
    observations: Joi.string()
      .max(5000)
      .trim()
      .allow('', null)
      .messages({
        'string.max': 'Las observaciones no pueden exceder 5000 caracteres',
      }),
    
    assembly_created_at: baseSchemas.date.optional(),
  }),
  
  // PUT /api/scaffolds/:id
  update: Joi.object({
    cubic_meters: Joi.number().positive().precision(2).max(999999.99).optional(),
    assembly_type: Joi.string().valid('montaje', 'desmontaje', 'modificacion').optional(),
    area: Joi.string().max(255).trim().allow('', null).optional(),
    tag: Joi.string().max(255).trim().allow('', null).optional(),
    observations: Joi.string().max(5000).trim().allow('', null).optional(),
    assembly_created_at: baseSchemas.date.optional(),
  }).min(1),
  
  // GET /api/scaffolds?project_id=...
  query: Joi.object({
    project_id: baseSchemas.id.optional(),
    user_id: baseSchemas.id.optional(),
    assembly_type: Joi.string().valid('montaje', 'desmontaje', 'modificacion').optional(),
    start_date: baseSchemas.date.optional(),
    end_date: baseSchemas.date.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

/**
 * Validadores para empresas, supervisores y usuarios finales
 */
/**
 * Middleware factory para validación
 * @param {Joi.ObjectSchema} schema - Esquema Joi
 * @param {string} source - Dónde buscar los datos: 'body', 'query', 'params'
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false, // Retornar todos los errores, no solo el primero
      stripUnknown: true, // Remover campos no definidos en el schema (whitelist)
      convert: true, // Convertir tipos automáticamente (ej: "123" → 123)
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: errors,
      });
    }

    // Reemplazar con datos validados y sanitizados
    req[source] = value;
    next();
  };
};

/**
 * Validador para IDs en parámetros de ruta
 */
const validateIdParam = (paramName = 'id') => {
  return validate(
    Joi.object({
      [paramName]: baseSchemas.id,
    }),
    'params'
  );
};

module.exports = {
  // Esquemas base
  baseSchemas,
  PATTERNS,
  
  // Validadores por recurso
  authValidators,
  userValidators,
  projectValidators,
  clientValidators,
  scaffoldValidators,
  
  // Middleware
  validate,
  validateIdParam,
};
