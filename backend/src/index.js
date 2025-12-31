const express = require('express');
const path = require('path');
const { requestLogger, logger } = require('./lib/logger');
const redisClient = require('./lib/redis');

// Importar middlewares de seguridad
const { createSecurityMiddleware } = require('./middleware/security');
const { sanitizeStrict } = require('./middleware/sanitization');

// Importar rutas
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const projectRoutes = require('./routes/projects');
const scaffoldRoutes = require('./routes/scaffolds');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const supervisorDashboardRoutes = require('./routes/SupervisorDashboard');
const notificationRoutes = require('./routes/notifications');
const healthRoutes = require('./routes/health');
const { initializeDatabase } = require('./db/initialize');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Configurar middlewares de seguridad (FASE 3)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
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

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/scaffolds', scaffoldRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/supervisor-dashboard', supervisorDashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/health', healthRoutes);

// Endpoint para métricas (nuevo endpoint que faltaba)
app.post('/api/metrics', (req, res) => {
  // Por ahora solo acepta las métricas sin procesarlas
  // En el futuro podrías almacenarlas en base de datos
  console.log('Métricas recibidas:', req.body.metrics?.length || 0);
  res.json({ success: true });
});

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