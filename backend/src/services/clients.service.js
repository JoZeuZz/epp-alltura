const Client = require('../models/client');
const { logger } = require('../lib/logger');

/**
 * ClientService
 * Capa de Servicio - Lógica de Negocio Pura
 * Responsabilidades:
 * - Validaciones de negocio
 * - Consultas a base de datos
 * - Lógica de soft delete (desactivar vs eliminar)
 * - Gestión de clientes activos/inactivos
 * 
 * PROHIBIDO: No debe contener objetos req o res
 */
class ClientService {
  // ============================================
  // OPERACIONES DE CONSULTA
  // ============================================

  /**
   * Obtener todos los clientes (incluyendo inactivos)
   * @returns {Promise<Array>} Lista de todos los clientes
   */
  static async getAllClients() {
    return await Client.getAllIncludingInactive();
  }

  /**
   * Obtener solo clientes activos
   * @returns {Promise<Array>} Lista de clientes activos
   */
  static async getActiveClients() {
    return await Client.getAll();
  }

  /**
   * Obtener un cliente por ID
   * @param {number} clientId - ID del cliente
   * @returns {Promise<object|null>} Cliente o null si no existe
   */
  static async getClientById(clientId) {
    return await Client.getById(clientId);
  }

  /**
   * Obtener el conteo de proyectos asociados a un cliente
   * @param {number} clientId - ID del cliente
   * @returns {Promise<number>} Cantidad de proyectos
   */
  static async getProjectCount(clientId) {
    return await Client.getProjectCount(clientId);
  }

  // ============================================
  // OPERACIONES DE CREACIÓN Y MODIFICACIÓN
  // ============================================

  /**
   * Crear un nuevo cliente
   * @param {object} clientData - Datos del cliente
   * @returns {Promise<object>} Cliente creado
   */
  static async createClient(clientData) {
    const newClient = await Client.create(clientData);
    logger.info(`Cliente ${newClient.id} creado: ${newClient.name}`);
    return newClient;
  }

  /**
   * Actualizar un cliente existente
   * @param {number} clientId - ID del cliente
   * @param {object} clientData - Datos a actualizar
   * @returns {Promise<object|null>} Cliente actualizado o null si no existe
   */
  static async updateClient(clientId, clientData) {
    const updatedClient = await Client.update(clientId, clientData);

    if (!updatedClient) {
      const error = new Error('Client not found');
      error.statusCode = 404;
      throw error;
    }

    logger.info(`Cliente ${clientId} actualizado: ${updatedClient.name}`);
    return updatedClient;
  }

  /**
   * Eliminar o desactivar un cliente (soft delete)
   * Si tiene proyectos, desactiva. Si no tiene, elimina permanentemente.
   * @param {number} clientId - ID del cliente
   * @returns {Promise<object>} Resultado de la operación
   */
  static async deleteOrDeactivateClient(clientId) {
    const result = await Client.delete(clientId);

    if (!result) {
      const error = new Error('Client not found');
      error.statusCode = 404;
      throw error;
    }

    // Si fue desactivado en lugar de eliminado
    if (result.deactivated) {
      logger.info(`Cliente ${clientId} desactivado (tiene proyectos vinculados)`);
      return {
        message: 'Cliente desactivado correctamente',
        deactivated: true,
        client: result,
      };
    }

    // Si fue eliminado permanentemente
    logger.info(`Cliente ${clientId} eliminado permanentemente`);
    return {
      message: 'Cliente eliminado correctamente',
      deleted: true,
    };
  }

  /**
   * Reactivar un cliente desactivado
   * @param {number} clientId - ID del cliente
   * @returns {Promise<object>} Cliente reactivado
   */
  static async reactivateClient(clientId) {
    const reactivatedClient = await Client.reactivate(clientId);

    if (!reactivatedClient) {
      const error = new Error('Client not found');
      error.statusCode = 404;
      throw error;
    }

    logger.info(`Cliente ${clientId} reactivado: ${reactivatedClient.name}`);
    return reactivatedClient;
  }

  // ============================================
  // VALIDACIONES DE NEGOCIO
  // ============================================

  /**
   * Validar que un cliente no tenga proyectos antes de eliminarlo
   * @param {number} clientId - ID del cliente
   * @returns {Promise<boolean>} true si puede eliminarse, false si tiene proyectos
   */
  static async canBeDeleted(clientId) {
    const projectCount = await this.getProjectCount(clientId);
    return projectCount === 0;
  }

  /**
   * Validar que el nombre del cliente sea único
   * @param {string} name - Nombre del cliente
   * @param {number} excludeId - ID del cliente a excluir (para updates)
   * @returns {Promise<boolean>} true si es único
   * @throws {Error} Si el nombre ya existe
   */
  static async validateUniqueName(name, excludeId = null) {
    const existingClient = await Client.getByName(name);

    if (existingClient && existingClient.id !== excludeId) {
      const error = new Error('Ya existe un cliente con ese nombre');
      error.statusCode = 400;
      throw error;
    }

    return true;
  }
}

module.exports = ClientService;
