const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');
const DashboardController = require('../controllers/dashboard.controller');

router.use(authMiddleware);

router.get('/summary', checkRole(['admin', 'supervisor']), DashboardController.getSummary);
router.get(
  '/indicadores-operativos',
  checkRole(['admin', 'supervisor']),
  DashboardController.getOperationalIndicators
);
router.get(
  '/ubicaciones/:ubicacionId/resumen',
  checkRole(['admin', 'supervisor']),
  DashboardController.getLocationSummary
);

module.exports = router;
