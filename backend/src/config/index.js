/**
 * Configuración centralizada de variables de entorno
 * 
 * Beneficios:
 * - Validación en startup (fail-fast)
 * - Valores por defecto centralizados
 * - Documentación implícita de variables requeridas
 * - Type safety si se migra a TypeScript
 * - Evita accesos directos a process.env en todo el código
 * 
 * Uso:
 * const config = require('./config');
 * console.log(config.PORT); // 5000
 */

// IMPORTANTE: Cargar dotenv ANTES de validar
require('dotenv').config();

const Joi = require('joi');
const path = require('path');

// Schema de validación para variables de entorno
const envSchema = Joi.object({
  // Entorno
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development')
    .description('Entorno de ejecución'),

  // Servidor
  PORT: Joi.number()
    .integer()
    .min(1)
    .max(65535)
    .default(5000)
    .description('Puerto del servidor'),

  // Base de datos PostgreSQL
  DB_HOST: Joi.string()
    .required()
    .description('Host de PostgreSQL'),
  
  DB_PORT: Joi.number()
    .integer()
    .default(5432)
    .description('Puerto de PostgreSQL'),
  
  DB_USER: Joi.string()
    .required()
    .description('Usuario de PostgreSQL'),
  
  DB_PASSWORD: Joi.string()
    .required()
    .description('Contraseña de PostgreSQL'),
  
  DB_NAME: Joi.string()
    .required()
    .description('Nombre de la base de datos'),

  // JWT
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .description('Secret para JWT access tokens (mínimo 32 caracteres)'),
  
  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .required()
    .description('Secret para JWT refresh tokens (mínimo 32 caracteres)'),

  // Redis
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .default('redis://localhost:6379')
    .description('URL de conexión a Redis'),
  
  REDIS_PASSWORD: Joi.string()
    .allow('')
    .optional()
    .description('Contraseña de Redis (opcional)'),

  // Google Cloud Storage
  GCS_PROJECT_ID: Joi.string()
    .optional()
    .description('ID del proyecto de Google Cloud'),
  
  GCS_BUCKET_NAME: Joi.string()
    .optional()
    .description('Nombre del bucket de Google Cloud Storage'),
  
  GOOGLE_APPLICATION_CREDENTIALS: Joi.string()
    .optional()
    .description('Ruta al archivo de credenciales de Google Cloud'),

  // VAPID (Push Notifications)
  VAPID_PUBLIC_KEY: Joi.string()
    .optional()
    .description('Clave pública VAPID para push notifications'),
  
  VAPID_PRIVATE_KEY: Joi.string()
    .optional()
    .description('Clave privada VAPID para push notifications'),

  // URLs
  CLIENT_URL: Joi.string()
    .uri()
    .default('http://localhost:3000')
    .description('URL del cliente frontend'),
  
  BACKEND_URL: Joi.string()
    .uri()
    .optional()
    .description('URL del backend (para construir URLs absolutas)'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info')
    .description('Nivel de logging de Winston'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number()
    .integer()
    .default(15 * 60 * 1000) // 15 minutos
    .description('Ventana de tiempo para rate limiting (ms)'),
  
  RATE_LIMIT_MAX_REQUESTS: Joi.number()
    .integer()
    .default(100)
    .description('Máximo de requests por ventana'),

  // Opcional: npm package version (inyectada automáticamente)
  npm_package_version: Joi.string()
    .optional()
    .description('Versión del paquete npm'),
})
  .unknown() // Permitir otras variables de entorno que no validamos
  .required();

// Validar variables de entorno
const { error, value: validatedEnv } = envSchema.validate(process.env, {
  abortEarly: false, // Mostrar todos los errores de validación
  stripUnknown: false, // No eliminar variables desconocidas
});

// Si hay errores, mostrarlos y terminar el proceso
if (error) {
  const errors = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    type: detail.type,
  }));

  // Usar console.error ya que logger aún no está disponible (dependencia circular)
  console.error('❌ Error de configuración: Variables de entorno inválidas');
  console.error('\nErrores encontrados:');
  errors.forEach(err => {
    console.error(`  - ${err.field}: ${err.message}`);
  });
  console.error('\nRevisa tu archivo .env y asegúrate de que todas las variables requeridas estén configuradas correctamente.');
  
  process.exit(1);
}

// Exportar configuración validada
const config = {
  // Entorno
  NODE_ENV: validatedEnv.NODE_ENV,
  IS_PRODUCTION: validatedEnv.NODE_ENV === 'production',
  IS_DEVELOPMENT: validatedEnv.NODE_ENV === 'development',
  IS_TEST: validatedEnv.NODE_ENV === 'test',

  // Servidor
  PORT: validatedEnv.PORT,

  // Base de datos
  DB: {
    HOST: validatedEnv.DB_HOST,
    PORT: validatedEnv.DB_PORT,
    USER: validatedEnv.DB_USER,
    PASSWORD: validatedEnv.DB_PASSWORD,
    NAME: validatedEnv.DB_NAME,
  },

  // JWT
  JWT: {
    SECRET: validatedEnv.JWT_SECRET,
    REFRESH_SECRET: validatedEnv.JWT_REFRESH_SECRET,
    ACCESS_TOKEN_EXPIRES_IN: '15m',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
  },

  // Redis
  REDIS: {
    URL: validatedEnv.REDIS_URL,
    PASSWORD: validatedEnv.REDIS_PASSWORD,
  },

  // Google Cloud Storage
  GCS: {
    PROJECT_ID: validatedEnv.GCS_PROJECT_ID,
    BUCKET_NAME: validatedEnv.GCS_BUCKET_NAME,
    CREDENTIALS_PATH: validatedEnv.GOOGLE_APPLICATION_CREDENTIALS,
    IS_CONFIGURED: !!(
      validatedEnv.GCS_PROJECT_ID &&
      validatedEnv.GCS_BUCKET_NAME &&
      validatedEnv.GOOGLE_APPLICATION_CREDENTIALS &&
      validatedEnv.GCS_PROJECT_ID !== 'your-gcp-project-id'
    ),
  },

  // VAPID
  VAPID: {
    PUBLIC_KEY: validatedEnv.VAPID_PUBLIC_KEY,
    PRIVATE_KEY: validatedEnv.VAPID_PRIVATE_KEY,
    IS_CONFIGURED: !!(validatedEnv.VAPID_PUBLIC_KEY && validatedEnv.VAPID_PRIVATE_KEY),
  },

  // URLs
  URLS: {
    CLIENT: validatedEnv.CLIENT_URL,
    BACKEND: validatedEnv.BACKEND_URL || `http://localhost:${validatedEnv.PORT}`,
  },

  // Logging
  LOGGING: {
    LEVEL: validatedEnv.LOG_LEVEL,
    DIR: path.join(__dirname, '../../logs'),
  },

  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: validatedEnv.RATE_LIMIT_WINDOW_MS,
    MAX_REQUESTS: validatedEnv.RATE_LIMIT_MAX_REQUESTS,
    // Configuración específica para login
    LOGIN_WINDOW_MS: validatedEnv.NODE_ENV === 'production' ? 15 * 60 * 1000 : 60 * 1000,
    LOGIN_MAX_REQUESTS: validatedEnv.NODE_ENV === 'production' ? 5 : 100,
  },

  // Versión
  VERSION: validatedEnv.npm_package_version || '1.0.0',
};

// Log de configuración en desarrollo
// Usar console.log ya que logger aún no está disponible (dependencia circular)
if (config.IS_DEVELOPMENT) {
  console.log('✅ Configuración cargada exitosamente');
  console.log('📋 Entorno:', config.NODE_ENV);
  console.log('🔌 Puerto:', config.PORT);
  console.log('🗄️  Base de datos:', `${config.DB.HOST}:${config.DB.PORT}/${config.DB.NAME}`);
  console.log('🔴 Redis:', config.REDIS.URL);
  console.log('☁️  Google Cloud Storage:', config.GCS.IS_CONFIGURED ? 'Configurado' : 'No configurado');
  console.log('📢 VAPID:', config.VAPID.IS_CONFIGURED ? 'Configurado' : 'No configurado');
}

module.exports = config;
