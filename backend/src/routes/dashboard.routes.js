const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');
const DashboardController = require('../controllers/dashboard.controller');

router.use(authMiddleware);

router.get('/summary', checkRole(['admin', 'supervisor', 'bodega']), DashboardController.getSummary);
router.get(
  '/indicadores-operativos',
  checkRole(['admin', 'supervisor', 'bodega']),
  DashboardController.getOperationalIndicators
);
router.get(
  '/ubicaciones/:ubicacionId/resumen',
  checkRole(['admin', 'supervisor', 'bodega']),
  DashboardController.getLocationSummary
);
router.get(
  '/cubic-meters',
  checkRole(['admin', 'supervisor', 'bodega']),
  DashboardController.getCubicMetersStats
);
router.get(
  '/project/:projectId',
  checkRole(['admin', 'supervisor', 'bodega']),
  DashboardController.getProjectSummary
);

module.exports = router;
