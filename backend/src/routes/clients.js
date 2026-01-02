const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Client = require('../models/client');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const { logger } = require('../lib/logger');

// Apply auth and isAdmin middleware to all client routes
router.use(authMiddleware, isAdmin);

// GET all clients (including inactive for admin)
router.get('/', async (req, res, next) => {
  try {
    const clients = await Client.getAllIncludingInactive();
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
  name: Joi.string()
    .trim()
    .min(2)
    .max(255)
    .required()
    .messages({
      'string.empty': 'El nombre del cliente es obligatorio',
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 255 caracteres',
      'any.required': 'El nombre del cliente es obligatorio'
    }),
  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .max(255)
    .allow('', null)
    .optional()
    .messages({
      'string.email': 'Debe proporcionar un email válido',
      'string.max': 'El email no puede exceder 255 caracteres'
    }),
  phone: Joi.string()
    .trim()
    .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .max(50)
    .allow('', null)
    .optional()
    .messages({
      'string.pattern.base': 'El formato del teléfono no es válido',
      'string.max': 'El teléfono no puede exceder 50 caracteres'
    }),
  address: Joi.string()
    .trim()
    .max(500)
    .allow('', null)
    .optional()
    .messages({
      'string.max': 'La dirección no puede exceder 500 caracteres'
    }),
  specialty: Joi.string()
    .trim()
    .max(255)
    .allow('', null)
    .optional()
    .messages({
      'string.max': 'La especialidad no puede exceder 255 caracteres'
    })
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

// DELETE a client (or deactivate if has projects)
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await Client.delete(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    // Si fue desactivado en lugar de eliminado
    if (result.deactivated) {
      logger.info(`Cliente con ID ${req.params.id} desactivado (tiene proyectos vinculados)`);
      return res.json({ 
        message: 'Cliente desactivado correctamente',
        deactivated: true,
        client: result
      });
    }
    
    // Si fue eliminado permanentemente
    logger.info(`Cliente con ID ${req.params.id} eliminado permanentemente`);
    res.json({ message: 'Cliente eliminado correctamente', deleted: true });
  } catch (err) {
    logger.error(`Error al eliminar el cliente con ID ${req.params.id}: ${err.message}`, err);
    next(err);
  }
});

// POST to reactivate a client
router.post('/:id/reactivate', async (req, res, next) => {
  try {
    const reactivatedClient = await Client.reactivate(req.params.id);
    if (!reactivatedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }
    logger.info(`Cliente con ID ${req.params.id} reactivado`);
    res.json({ 
      message: 'Cliente reactivado correctamente',
      client: reactivatedClient 
    });
  } catch (err) {
    logger.error(`Error al reactivar el cliente con ID ${req.params.id}: ${err.message}`, err);
    next(err);
  }
});

module.exports = router;
