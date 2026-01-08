const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const SupervisorDashboardController = require('../controllers/supervisorDashboard.controller');

/**
 * SupervisorDashboardRoutes
 * Capa de Rutas - Definición de Endpoints y Middlewares
 * Responsabilidades:
 * - Definir endpoints para supervisores
 * - Aplicar autenticación
 * 
 * PROHIBIDO: No debe contener lógica de negocio
 */

// Proteger todas las rutas con autenticación
router.use(authMiddleware);

/**
 * GET /api/supervisor-dashboard/summary
 * Resumen personalizado para el supervisor autenticado
 * - Total de reportes creados
 * - Reportes del mes actual
 * - Total de metros cúbicos gestionados
 * - Proyectos activos asignados
 */
router.get('/summary', SupervisorDashboardController.getSummary);

module.exports = router;
