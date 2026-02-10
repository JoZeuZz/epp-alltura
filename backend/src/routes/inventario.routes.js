const express = require('express');
const InventarioController = require('../controllers/inventario.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');

const router = express.Router();

router.get(
  '/stock',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  InventarioController.getStock
);

router.get(
  '/movimientos-stock',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  InventarioController.getStockMovements
);

router.get(
  '/movimientos-activo',
  authMiddleware,
  checkRole(['admin', 'supervisor', 'bodega']),
  InventarioController.getAssetMovements
);

router.get(
  '/auditoria',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  InventarioController.getAuditoria
);

module.exports = router;
