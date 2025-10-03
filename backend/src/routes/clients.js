const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Client = require('../models/client');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const logger = require('../lib/logger');

// Apply auth and isAdmin middleware to all client routes
router.use(authMiddleware, isAdmin);

// GET all clients
router.get('/', async (req, res, next) => {
  try {
    const clients = await Client.getAll();
    res.json(clients);
  } catch (err) {
    logger.error(`Error al obtener todos los clientes: ${err.message}`, err);
    next(err);
  }
});

// GET a single client by ID
router.get('/:id', async (req, res, next) => {
  try {
    const client = await Client.getById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json(client);
  } catch (err) {
    logger.error(`Error al obtener el cliente con ID ${req.params.id}: ${err.message}`, err);
    next(err);
  }
});

const clientSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  contact_info: Joi.string().trim().allow('').max(255),
});

// POST a new client
router.post('/', async (req, res, next) => {
  try {
    const validatedData = await clientSchema.validateAsync(req.body);
    const newClient = await Client.create(validatedData);
    res.status(201).json(newClient);
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: err.details[0].message });
    }
    logger.error(`Error al crear un nuevo cliente: ${err.message}`, err);
    next(err);
  }
});

// PUT to update a client
router.put('/:id', async (req, res, next) => {
  try {
    const validatedData = await clientSchema.validateAsync(req.body);
    const updatedClient = await Client.update(req.params.id, validatedData);
    if (!updatedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json(updatedClient);
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: err.details[0].message });
    }
    logger.error(`Error al actualizar el cliente con ID ${req.params.id}: ${err.message}`, err);
    next(err);
  }
});

// DELETE a client
router.delete('/:id', async (req, res, next) => {
  try {
    const deletedClient = await Client.delete(req.params.id);
    if (!deletedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.json({ message: 'Client deleted' });
  } catch (err) {
    logger.error(`Error al eliminar el cliente con ID ${req.params.id}: ${err.message}`, err);
    next(err);
  }
});

module.exports = router;
