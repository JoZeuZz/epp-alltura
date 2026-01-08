const ClientService = require('../services/clients.service');
const { logger } = require('../lib/logger');

/**
 * ClientController
 * Capa de Controlador - Orquestación HTTP
 * Responsabilidades:
 * - Recibir peticiones HTTP (req, res)
 * - Extraer datos de body, params, query
 * - Llamar al servicio correspondiente
 * - Manejar respuestas exitosas
 * - Capturar y propagar errores
 * 
 * PROHIBIDO: No debe contener lógica de negocio ni consultas SQL
 */
class ClientController {
  /**
   * Obtener todos los clientes (incluyendo inactivos)
   * @route GET /api/clients
   */
  static async getAllClients(req, res, next) {
    try {
      const clients = await ClientService.getAllClients();
      res.json(clients);
    } catch (err) {
      logger.error(`Error al obtener clientes: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * Obtener un cliente específico por ID
   * @route GET /api/clients/:id
   */
  static async getClientById(req, res, next) {
    try {
      const { id } = req.params;
      const client = await ClientService.getClientById(parseInt(id));

      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }

      res.json(client);
    } catch (err) {
      logger.error(`Error al obtener cliente: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * Crear un nuevo cliente
   * @route POST /api/clients
   */
  static async createClient(req, res, next) {
    try {
      const clientData = req.body;
      const newClient = await ClientService.createClient(clientData);
      res.status(201).json(newClient);
    } catch (err) {
      logger.error(`Error al crear cliente: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * Actualizar un cliente existente
   * @route PUT /api/clients/:id
   */
  static async updateClient(req, res, next) {
    try {
      const { id } = req.params;
      const clientData = req.body;
      const updatedClient = await ClientService.updateClient(parseInt(id), clientData);
      res.json(updatedClient);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      logger.error(`Error al actualizar cliente: ${err.message}`, err);

      if (statusCode < 500) {
        return res.status(statusCode).json({ message: err.message });
      }
      next(err);
    }
  }

  /**
   * Eliminar o desactivar un cliente
   * @route DELETE /api/clients/:id
   */
  static async deleteClient(req, res, next) {
    try {
      const { id } = req.params;
      const result = await ClientService.deleteOrDeactivateClient(parseInt(id));
      res.json(result);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      logger.error(`Error al eliminar cliente: ${err.message}`, err);

      if (statusCode < 500) {
        return res.status(statusCode).json({ message: err.message });
      }
      next(err);
    }
  }

  /**
   * Reactivar un cliente desactivado
   * @route POST /api/clients/:id/reactivate
   */
  static async reactivateClient(req, res, next) {
    try {
      const { id } = req.params;
      const reactivatedClient = await ClientService.reactivateClient(parseInt(id));
      res.json({
        message: 'Cliente reactivado correctamente',
        client: reactivatedClient,
      });
    } catch (err) {
      const statusCode = err.statusCode || 500;
      logger.error(`Error al reactivar cliente: ${err.message}`, err);

      if (statusCode < 500) {
        return res.status(statusCode).json({ message: err.message });
      }
      next(err);
    }
  }
}

module.exports = ClientController;
