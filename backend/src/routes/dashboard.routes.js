const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const DashboardController = require('../controllers/dashboard.controller');

/**
 * DashboardRoutes
 * Capa de Rutas - Definición de Endpoints y Middlewares
 * Responsabilidades:
 * - Definir endpoints (URLs y verbos HTTP)
 * - Aplicar middlewares (autenticación, autorización)
 * - Delegar ejecución al controlador
 * 
 * PROHIBIDO: No debe contener lógica de negocio
 */

// Todas las rutas del dashboard requieren autenticación y rol admin
router.use(authMiddleware);
router.use(isAdmin);

/**
 * GET /api/dashboard/summary
 * Obtener resumen completo del dashboard
 * - Métricas de proyectos y clientes activos
 * - Estadísticas de metros cúbicos por estado
 * - Conteos de andamios por estado y tarjetas
 * - Últimos 5 andamios creados
 * - Solo admin
 */
router.get('/summary', DashboardController.getSummary);

/**
 * GET /api/dashboard/cubic-meters
 * Obtener estadísticas detalladas de metros cúbicos
 * - M³ armados vs desarmados
 * - Conteos de andamios por estado
 * - Conteos de tarjetas verdes y rojas
 * - Solo admin
 */
router.get('/cubic-meters', DashboardController.getCubicMetersStats);

module.exports = router;
