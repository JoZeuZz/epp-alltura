// Cargar variables de entorno PRIMERO
require('dotenv').config();

const express = require('express');
const path = require('path');
const { requestLogger, logger } = require('./lib/logger');
const redisClient = require('./lib/redis');

// Importar middlewares de seguridad
const { createSecurityMiddleware } = require('./middleware/security');
const { sanitizeStrict } = require('./middleware/sanitization');
const errorHandler = require('./middleware/errorHandler');

// Importar rutas (Arquitectura 3-Capas)
const authRoutes = require('./routes/auth.routes');
const clientRoutes = require('./routes/clients.routes');
const projectRoutes = require('./routes/projects.routes');
const scaffoldRoutes = require('./routes/scaffolds.routes');
const userRoutes = require('./routes/users.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const supervisorDashboardRoutes = require('./routes/supervisorDashboard.routes');
const notificationRoutes = require('./routes/notification.routes');
const clientNotesRoutes = require('./routes/clientNotes.routes');
const scaffoldModificationRoutes = require('./routes/scaffold-modifications.routes');
const imageProxyRoutes = require('./routes/imageProxy.routes');
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

// Configurar middlewares de seguridad (FASE 3)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  '0.0.0.0',
  process.env.CLIENT_URL,
].filter(Boolean);

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

// 6. Parseo de body (DESPUÉS de headers de seguridad)
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

// 7. Sanitización de inputs (DESPUÉS de parsear body)
// NoSQL injection protection está integrada en sanitizeStrict
// app.use(sanitizeMongoOnly); // ⚠️ Deshabilitado: incompatible con Express 5.x

// Sanitización estricta para rutas de API (excepto health)
app.use('/api', sanitizeStrict);

// Servir archivos estáticos desde la carpeta uploads con CORS habilitado
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(__dirname, '../uploads')));

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
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/scaffolds', scaffoldRoutes);
app.use('/api', scaffoldModificationRoutes); // Incluye /scaffolds/:id/modifications y /scaffold-modifications/*
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/supervisor-dashboard', supervisorDashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/client-notes', clientNotesRoutes);
app.use('/api', imageProxyRoutes);
app.use('/health', healthRoutes);

// Endpoint para métricas del cliente (performance monitoring)
app.post('/api/metrics', (req, res) => {
  logger.debug('Métricas recibidas del cliente', { 
    metricsCount: req.body.metrics?.length || 0,
    ip: req.ip 
  });
  res.json({ success: true });
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
    status: 404,
    message: 'Ruta no encontrada',
    error: {
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    }
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
