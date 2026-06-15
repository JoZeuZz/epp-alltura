'use strict';

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');
const { documentUpload } = require('../middleware/upload');
const FacturaParserController = require('../controllers/facturaParser.controller');

const router = express.Router();

router.post(
  '/parse',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  documentUpload.single('factura'),
  FacturaParserController.parse
);

module.exports = router;
