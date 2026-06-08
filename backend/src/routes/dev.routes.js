'use strict';

const express = require('express');
const DevController = require('../controllers/dev.controller');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');

const router = express.Router();

const adminOnly = [authMiddleware, checkRole(['admin'])];

router.get('/export/:entity',  ...adminOnly, DevController.exportEntity);
router.post('/import/:entity', ...adminOnly, DevController.importEntity);

module.exports = router;
