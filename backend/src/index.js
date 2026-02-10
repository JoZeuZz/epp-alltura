// Cargar variables de entorno PRIMERO
require('dotenv').config();

const express = require('express');
const compression = require('compression');
const { requestLogger, logger } = require('./lib/logger');
const redisClient = require('./lib/redis');

// Importar middlewares de seguridad
const { createSecurityMiddleware } = require('./middleware/security');
const { sanitizeStrict } = require('./middleware/sanitization');
const errorHandler = require('./middleware/errorHandler');
const requestId = require('./middleware/requestId');

// Importar rutas (Arquitectura 3-Capas)
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const notificationRoutes = require('./routes/notification.routes');
const imageProxyRoutes = require('./routes/imageProxy.routes');
const ubicacionesRoutes = require('./routes/ubicaciones.routes');
const articulosRoutes = require('./routes/articulos.routes');
const trabajadoresRoutes = require('./routes/trabajadores.routes');
const entregasRoutes = require('./routes/entregas.routes');
const devolucionesRoutes = require('./routes/devoluciones.routes');
const firmasRoutes = require('./routes/firmas.routes');
const comprasRoutes = require('./routes/compras.routes');
const inventarioRoutes = require('./routes/inventario.routes');
const proveedoresRoutes = require('./routes/proveedores.routes');
const healthRoutes = require('./routes/health');
const { initializeDatabase } = require('./db/initialize');

// Swagger/OpenAPI
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy - número de saltos de proxy (Cloudflare -> Traefik -> nginx -> backend)
// Usar número específico en lugar de 'true' para satisfacer express-rate-limit
app.set('trust proxy', 3);

const buildOriginVariants = (value) => {
  if (!value) return [];
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return [value];
  }
  return [`https://${value}`, `http://${value}`];
};

// Configurar middlewares de seguridad (FASE 3)
const localOrigins =
  NODE_ENV === 'development'
    ? ['http://localhost:3000', 'http://localhost:5173']
    : [];

const allowedOrigins = Array.from(
  new Set(
    [
      ...localOrigins,
      ...buildOriginVariants(process.env.CLIENT_URL),
      ...buildOriginVariants(process.env.SERVICE_URL_FRONTEND),
      ...buildOriginVariants(process.env.SERVICE_FQDN_FRONTEND),
    ].filter(Boolean)
  )
);

const securityMiddleware = createSecurityMiddleware({
  environment: NODE_ENV,
  allowedOrigins,
});

// ORDEN CRÍTICO: Los middlewares de seguridad deben aplicarse ANTES de parsear body
// 1. Helmet - Headers de seguridad HTTP
app.use(securityMiddleware.helmet);

// 2. CORS - Control de acceso cross-origin
app.use(securityMiddleware.cors);

// 3. HPP - HTTP Parameter Pollution protection
app.use(securityMiddleware.hpp);

// 4. Headers adicionales de seguridad
app.use(securityMiddleware.additionalHeaders);

// 5. Logger de violaciones CSP
app.use(securityMiddleware.cspLogger);

// 6. Request ID (para trazabilidad)
app.use(requestId);

// 7. Compresión de respuestas
app.use(compression());

// 8. Parseo de body (DESPUÉS de headers de seguridad)
app.use(express.json({ 
  limit: '10mb',
  strict: true, // Solo aceptar arrays y objects
  type: 'application/json',
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000, // Prevenir DoS via muchos params
}));

// 9. Sanitización de inputs (DESPUÉS de parsear body)
// NoSQL injection protection está integrada en sanitizeStrict
// app.use(sanitizeMongoOnly); // ⚠️ Deshabilitado: incompatible con Express 5.x

// Proxy de imágenes debe ir ANTES de sanitización para no romper JWT token en query
app.use('/api/image-proxy', imageProxyRoutes);

// Sanitización estricta para rutas de API (excepto health)
app.use('/api', sanitizeStrict);

// Logging de requests
app.use(requestLogger);

// ============================================
// DOCUMENTACIÓN API (SWAGGER/OPENAPI)
// ============================================

// Swagger UI en /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Alltura API Docs',
  customfavIcon: '/favicon.ico',
}));

// JSON spec disponible en /api-docs.json
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ============================================
// RUTAS DE LA APLICACIÓN
// ============================================

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ubicaciones', ubicacionesRoutes);
app.use('/api/articulos', articulosRoutes);
app.use('/api/trabajadores', trabajadoresRoutes);
app.use('/api/entregas', entregasRoutes);
app.use('/api/devoluciones', devolucionesRoutes);
app.use('/api/firmas', firmasRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/health', healthRoutes);

// Endpoint para métricas del cliente (performance monitoring)
app.post('/api/metrics', async (req, res) => {
  const metrics = Array.isArray(req.body?.metrics) ? req.body.metrics : [];
  logger.debug('Métricas recibidas del cliente', {
    metricsCount: metrics.length,
    ip: req.ip,
    requestId: req.requestId,
  });

  if (metrics.length > 0) {
    try {
      const client = await redisClient.getClient();
      const dayKey = new Date().toISOString().slice(0, 10);
      const key = `metrics:client:${dayKey}`;
      const payload = JSON.stringify({
        ts: Date.now(),
        ip: req.ip,
        metrics,
      });
      await client.rPush(key, payload);
      await client.lTrim(key, -1000, -1);
      await client.expire(key, 7 * 24 * 60 * 60);
    } catch (error) {
      logger.warn('No se pudo guardar métricas en Redis', {
        error: error.message,
        requestId: req.requestId,
      });
    }
  }

  res.json({
    success: true,
    message: 'Métricas registradas correctamente',
    data: null,
    errors: [],
  });
});

// ============================================
// ERROR HANDLERS (DEBEN IR AL FINAL)
// ============================================

// 404 Handler - Rutas no encontradas
// IMPORTANTE: Debe ir DESPUÉS de todas las rutas pero ANTES del error handler
app.use((req, res) => {
  logger.warn(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    data: null,
    errors: [
      {
        status: 404,
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString(),
      },
    ],
  });
});

// Error Handler Global
// IMPORTANTE: Debe ser el ÚLTIMO middleware (4 parámetros)
app.use(errorHandler);

// Inicializar base de datos y luego iniciar el servidor
const startServer = async () => {
  try {
    // 1. Inicializar base de datos
    await initializeDatabase();
    
    // 2. Conectar a Redis
    logger.info('Conectando a Redis...');
    await redisClient.connect();
    logger.info('✅ Redis conectado exitosamente');
    
    // 3. Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
      logger.info(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejo de cierre graceful
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recibido. Cerrando servidor de forma segura...');
  await redisClient.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT recibido. Cerrando servidor de forma segura...');
  await redisClient.disconnect();
  process.exit(0);
});

startServer();
