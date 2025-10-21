const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { requestLogger } = require('./lib/logger');

// Importar rutas
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const projectRoutes = require('./routes/projects');
const scaffoldRoutes = require('./routes/scaffolds');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const techDashboardRoutes = require('./routes/TechDashboard');
const notificationRoutes = require('./routes/notifications');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares de seguridad
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests por IP
});
app.use(limiter);

// Middlewares básicos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging de requests
app.use(requestLogger);

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/scaffolds', scaffoldRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tech-dashboard', techDashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/health', healthRoutes);

// Endpoint para métricas (nuevo endpoint que faltaba)
app.post('/api/metrics', (req, res) => {
  // Por ahora solo acepta las métricas sin procesarlas
  // En el futuro podrías almacenarlas en base de datos
  console.log('Métricas recibidas:', req.body.metrics?.length || 0);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});