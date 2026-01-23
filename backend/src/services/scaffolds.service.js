const Scaffold = require('../models/scaffold');
const ScaffoldHistory = require('../models/scaffoldHistory');
const ScaffoldModification = require('../models/scaffoldModification');
const Project = require('../models/project');
const { uploadFile, deleteFileByUrl } = require('../lib/googleCloud');
const { logger } = require('../lib/logger');
const db = require('../db');

/**
 * ScaffoldService
 * Capa de Servicio - Lógica de Negocio Pura
 * Responsabilidades:
 * - Validaciones de negocio
 * - Cálculos y reglas de dominio
 * - Interacción con la base de datos
 * - Operaciones complejas de andamios
 * 
 * PROHIBIDO: No debe contener objetos req o res
 */
class ScaffoldService {
  // ============================================
  // UTILIDADES Y CÁLCULOS
  // ============================================

  /**
   * Calcular metros cúbicos a partir de dimensiones
   * @param {number} height - Altura en metros
   * @param {number} width - Ancho en metros
   * @param {number} length - Largo en metros
   * @returns {number} Metros cúbicos
   */
  static calculateCubicMeters(height, width, length) {
    return parseFloat(height) * parseFloat(width) * parseFloat(length);
  }

  /**
   * Determinar estado de armado basado en porcentaje de avance
   * @param {number} progressPercentage - Porcentaje de avance (0-100)
   * @returns {object} { assembly_status, card_status }
   */
  static determineAssemblyState(progressPercentage) {
    let assembly_status;
    let card_status = 'red'; // Siempre por defecto rojo

    if (progressPercentage === 100) {
      // 100% = Armado completo
      assembly_status = 'assembled';
    } else if (progressPercentage > 0 && progressPercentage < 100) {
      // 1-99% = En proceso de armado
      assembly_status = 'in_progress';
    } else {
      // 0% = Desarmado
      assembly_status = 'disassembled';
    }

    return { assembly_status, card_status };
  }

  // ============================================
  // VALIDACIONES DE NEGOCIO
  // ============================================

  /**
   * Validar que el proyecto esté activo
   * @param {number} projectId - ID del proyecto
   * @returns {Promise<object>} Proyecto validado
   * @throws {Error} Si el proyecto no existe o está inactivo
   */
  static async validateActiveProject(projectId) {
    const project = await Project.getById(projectId);

    if (!project) {
      const error = new Error('Proyecto no encontrado.');
      error.statusCode = 404;
      throw error;
    }

    if (!project.active || !project.client_active) {
      const error = new Error(
        'No se pueden realizar operaciones en un proyecto o cliente desactivado. Los datos históricos están protegidos.'
      );
      error.statusCode = 400;
      throw error;
    }

    return project;
  }

  /**
   * Validar permisos de usuario sobre un andamio
   * @param {object} user - Usuario { id, role }
   * @param {object} scaffold - Andamio
   * @param {object} project - Proyecto del andamio
   * @throws {Error} Si el usuario no tiene permisos
   */
  static validateUserPermissions(user, scaffold, project) {
    if (user.role === 'admin') {
      return; // Admin tiene permisos totales
    }

    if (user.role === 'supervisor') {
      const isCreator = scaffold.created_by === user.id;
      const isAssignedToProject = project && project.assigned_supervisor_id === user.id;

      if (!isCreator && !isAssignedToProject) {
        const error = new Error(
          'No tienes permisos para modificar este andamio. Solo puedes modificar andamios que tú creaste o que pertenecen a proyectos asignados a ti.'
        );
        error.statusCode = 403;
        throw error;
      }
    }
  }

  /**
   * Validar que un andamio desarmado no sea modificado
   * @param {object} scaffold - Andamio actual
   * @param {object} newData - Datos nuevos a aplicar
   * @throws {Error} Si se intenta modificar un andamio desarmado
   */
  static validateDisassembledImmutability(scaffold, newData) {
    if (scaffold.assembly_status !== 'disassembled') {
      return; // No es andamio desarmado, permitir cambios
    }

    if (newData.assembly_status && newData.assembly_status !== 'disassembled') {
      const error = new Error(
        'No puedes rearmar un andamio que ya fue desarmado. Los andamios desarmados son registros históricos inmutables.'
      );
      error.statusCode = 400;
      throw error;
    }

    if (newData.progress_percentage !== undefined && newData.progress_percentage > 0) {
      const error = new Error(
        'No puedes cambiar el porcentaje de avance de un andamio desarmado. Los andamios desarmados permanecen en 0% como registro histórico.'
      );
      error.statusCode = 400;
      throw error;
    }

    if (newData.card_status && newData.card_status !== 'red') {
      const error = new Error(
        'Los andamios desarmados deben mantener tarjeta roja como registro de seguridad.'
      );
      error.statusCode = 400;
      throw error;
    }
  }

  /**
   * Validar que el porcentaje no retroceda
   * @param {number} currentPercentage - Porcentaje actual
   * @param {number} newPercentage - Nuevo porcentaje
   * @throws {Error} Si el porcentaje retrocede
   */
  static validateProgressNoBacktrack(currentPercentage, newPercentage) {
    if (newPercentage !== undefined && newPercentage < currentPercentage) {
      const error = new Error(
        `El porcentaje de avance no puede retroceder de ${currentPercentage}% a ${newPercentage}%. Use el estado "desarmado" para indicar que el andamio ya no está en uso.`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  /**
   * Sincronizar automáticamente estado de armado con porcentaje
   * @param {object} data - Datos a sincronizar
   * @returns {object} Datos sincronizados
   */
  static synchronizeAssemblyState(data) {
    const syncedData = { ...data };

    // Sincronización: Porcentaje → Estado
    if (syncedData.progress_percentage !== undefined) {
      if (syncedData.progress_percentage === 0) {
        syncedData.assembly_status = 'disassembled';
        syncedData.card_status = 'red';
      } else if (syncedData.progress_percentage === 100) {
        syncedData.assembly_status = 'assembled';
      } else {
        syncedData.assembly_status = 'in_progress';
      }
    }

    // Sincronización: Estado → Porcentaje
    if (syncedData.assembly_status && syncedData.progress_percentage === undefined) {
      if (syncedData.assembly_status === 'assembled') {
        syncedData.progress_percentage = 100;
      } else if (syncedData.assembly_status === 'disassembled') {
        syncedData.progress_percentage = 0;
        syncedData.card_status = 'red';
      }
    }

    // Validar consistencia de tarjeta verde
    if (
      syncedData.card_status === 'green' &&
      (syncedData.assembly_status === 'disassembled' ||
        syncedData.assembly_status === 'in_progress')
    ) {
      const error = new Error(
        'Solo un andamio completamente armado (100%) puede tener tarjeta verde.'
      );
      error.statusCode = 400;
      throw error;
    }

    // Forzar tarjeta roja si está desarmado
    if (syncedData.assembly_status === 'disassembled') {
      syncedData.card_status = 'red';
    }

    return syncedData;
  }

  // ============================================
  // OPERACIONES DE CONSULTA
  // ============================================

  /**
   * Obtener andamios filtrados por rol de usuario
   * @param {object} user - Usuario { id, role }
   * @returns {Promise<Array>} Lista de andamios
   */
  static async getScaffoldsByRole(user) {
    const { role, id: userId } = user;

    if (role === 'admin') {
      return await Scaffold.getAll();
    }

    if (role === 'supervisor') {
      return await Scaffold.getByCreator(userId);
    }

    if (role === 'client') {
      const projects = await Project.getByAssignedClient(userId);
      const projectIds = projects.map((p) => p.id);

      const allScaffolds = [];
      for (const projectId of projectIds) {
        const projectScaffolds = await Scaffold.getByProject(projectId);
        allScaffolds.push(...projectScaffolds);
      }
      return allScaffolds;
    }

    const error = new Error('Rol no autorizado.');
    error.statusCode = 403;
    throw error;
  }

  /**
   * Obtener un andamio por ID con metros cúbicos adicionales
   * @param {number} scaffoldId - ID del andamio
   * @returns {Promise<object|null>} Andamio con additional_cubic_meters y total_cubic_meters
   */
  static async getScaffoldById(scaffoldId) {
    const scaffold = await Scaffold.getById(scaffoldId);
    if (!scaffold) {
      return null;
    }

    // Obtener metros cúbicos adicionales aprobados
    const additionalCubicMeters = await ScaffoldModification.getTotalApprovedCubicMeters(scaffoldId);
    
    // Calcular total
    const baseCubicMeters = parseFloat(scaffold.cubic_meters);
    const totalCubicMeters = baseCubicMeters + additionalCubicMeters;

    return {
      ...scaffold,
      additional_cubic_meters: additionalCubicMeters,
      total_cubic_meters: totalCubicMeters
    };
  }

  /**
   * Obtener andamios por proyecto con metros cúbicos adicionales
   * @param {number} projectId - ID del proyecto
   * @returns {Promise<Array>} Lista de andamios con totales
   */
  static async getScaffoldsByProject(projectId) {
    const scaffolds = await Scaffold.getByProject(projectId);
    
    // Enriquecer cada andamio con metros cúbicos adicionales
    const enrichedScaffolds = await Promise.all(
      scaffolds.map(async (scaffold) => {
        const additionalCubicMeters = await ScaffoldModification.getTotalApprovedCubicMeters(scaffold.id);
        const baseCubicMeters = parseFloat(scaffold.cubic_meters);
        const totalCubicMeters = baseCubicMeters + additionalCubicMeters;

        return {
          ...scaffold,
          additional_cubic_meters: additionalCubicMeters,
          total_cubic_meters: totalCubicMeters
        };
      })
    );

    return enrichedScaffolds;
  }

  /**
   * Obtener andamios creados por un usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<Array>} Lista de andamios
   */
  static async getScaffoldsByCreator(userId) {
    return await Scaffold.getByCreator(userId);
  }

  /**
   * Obtener historial de cambios por andamio
   * @param {number} scaffoldId - ID del andamio
   * @returns {Promise<Array>} Historial de cambios
   */
  static async getScaffoldHistory(scaffoldId) {
    return await ScaffoldHistory.getByScaffold(scaffoldId);
  }

  /**
   * Obtener historial de cambios por usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<Array>} Historial de cambios
   */
  static async getUserHistory(userId) {
    return await ScaffoldHistory.getByUser(userId);
  }

  // ============================================
  // OPERACIONES DE CREACIÓN Y MODIFICACIÓN
  // ============================================

  /**
   * Crear un nuevo andamio
   * @param {object} scaffoldData - Datos del andamio
   * @param {object} user - Usuario { id, role }
   * @param {object} imageFile - Archivo de imagen (Buffer)
   * @returns {Promise<object>} Andamio creado
   */
  static async createScaffold(scaffoldData, user, imageFile) {
    // Validar imagen obligatoria
    if (!imageFile) {
      const error = new Error('La imagen de montaje es obligatoria.');
      error.statusCode = 400;
      throw error;
    }

    // Validar proyecto activo
    const project = await this.validateActiveProject(scaffoldData.project_id);

    // Subir imagen a Google Cloud Storage
    const assemblyImageUrl = await uploadFile(imageFile);

    // Calcular metros cúbicos
    const cubic_meters = this.calculateCubicMeters(
      scaffoldData.height,
      scaffoldData.width,
      scaffoldData.length
    );

    // Determinar estado de armado
    const { assembly_status, card_status } = this.determineAssemblyState(
      scaffoldData.progress_percentage || 0
    );

    // Crear andamio en la base de datos
    const scaffold = await Scaffold.create({
      ...scaffoldData,
      user_id: user.id,
      cubic_meters,
      assembly_image_url: assemblyImageUrl,
      card_status,
      assembly_status,
      progress_percentage: scaffoldData.progress_percentage || 0,
    });

    // Registrar en historial de auditoría
    await ScaffoldHistory.create({
      scaffold_id: scaffold.id,
      user_id: user.id,
      change_type: 'create',
      previous_data: {},
      new_data: scaffold,
      description: 'Andamio creado',
      scaffold_number: scaffold.scaffold_number,
      project_name: project.name,
      area: scaffold.area,
      tag: scaffold.tag,
    });

    logger.info(`Andamio ${scaffold.id} creado por usuario ${user.id}`);
    return scaffold;
  }

  /**
   * Actualizar un andamio existente
   * @param {number} scaffoldId - ID del andamio
   * @param {object} updateData - Datos a actualizar
   * @param {object} user - Usuario { id, role }
   * @returns {Promise<object>} Andamio actualizado
   */
  static async updateScaffold(scaffoldId, updateData, user) {
    // Obtener andamio actual
    const scaffold = await Scaffold.getById(scaffoldId);
    if (!scaffold) {
      const error = new Error('Andamio no encontrado.');
      error.statusCode = 404;
      throw error;
    }

    // Validar proyecto activo
    const project = await this.validateActiveProject(scaffold.project_id);

    // Validar permisos de usuario
    this.validateUserPermissions(user, scaffold, project);

    // Determinar tipo de actualización
    const isStatusUpdate =
      (updateData.assembly_status ||
        updateData.card_status ||
        updateData.progress_percentage !== undefined) &&
      !updateData.project_id &&
      !updateData.height;

    let dataToUpdate;

    if (isStatusUpdate) {
      // Validación: andamios desarmados son inmutables
      this.validateDisassembledImmutability(scaffold, updateData);

      // Validación: porcentaje no puede retroceder
      this.validateProgressNoBacktrack(scaffold.progress_percentage, updateData.progress_percentage);

      // Sincronizar estado automáticamente
      dataToUpdate = this.synchronizeAssemblyState(updateData);
    } else {
      // Actualización completa: recalcular m³
      const cubic_meters = this.calculateCubicMeters(
        updateData.height,
        updateData.width,
        updateData.length
      );

      dataToUpdate = {
        ...updateData,
        cubic_meters,
      };
    }

    // Actualizar andamio
    const updated = await Scaffold.update(scaffoldId, dataToUpdate);

    // Registrar cambios en historial
    await ScaffoldHistory.createFromChanges(scaffoldId, user.id, scaffold, updated, {
      scaffold_number: scaffold.scaffold_number,
      project_name: project?.name,
      area: scaffold.area,
      tag: scaffold.tag,
    });

    logger.info(`Andamio ${scaffoldId} actualizado por usuario ${user.id}`);
    return updated;
  }

  /**
   * Cambiar estado de tarjeta (verde/roja)
   * @param {number} scaffoldId - ID del andamio
   * @param {string} cardStatus - Nuevo estado ('green' | 'red')
   * @param {object} user - Usuario { id, role }
   * @returns {Promise<object>} Andamio actualizado
   */
  static async updateCardStatus(scaffoldId, cardStatus, user) {
    // Obtener andamio actual
    const scaffold = await Scaffold.getById(scaffoldId);
    if (!scaffold) {
      const error = new Error('Andamio no encontrado.');
      error.statusCode = 404;
      throw error;
    }

    // Validar permisos
    const project = await Project.getById(scaffold.project_id);
    this.validateUserPermissions(user, scaffold, project);

    // No permitir tarjeta verde si está desarmado
    if (cardStatus === 'green' && scaffold.assembly_status === 'disassembled') {
      const error = new Error(
        'No puedes cambiar la tarjeta a verde mientras el andamio esté desarmado.'
      );
      error.statusCode = 400;
      throw error;
    }

    // Actualizar estado de tarjeta
    const updated = await Scaffold.updateCardStatus(scaffoldId, cardStatus);

    // Registrar en historial
    await ScaffoldHistory.create({
      scaffold_id: scaffoldId,
      user_id: user.id,
      change_type: 'card_status',
      previous_data: { card_status: scaffold.card_status },
      new_data: { card_status: cardStatus },
      description: `Tarjeta cambiada de ${scaffold.card_status} a ${cardStatus}`,
      scaffold_number: scaffold.scaffold_number,
      project_name: project?.name,
      area: scaffold.area,
      tag: scaffold.tag,
    });

    logger.info(`Estado de tarjeta del andamio ${scaffoldId} cambiado a ${cardStatus}`);
    return updated;
  }

  /**
   * Cambiar estado de armado
   * @param {number} scaffoldId - ID del andamio
   * @param {string} assemblyStatus - Nuevo estado ('assembled' | 'disassembled')
   * @param {object} user - Usuario { id, role }
   * @param {object} imageFile - Archivo de imagen (requerido para 'disassembled')
   * @returns {Promise<object>} Andamio actualizado
   */
  static async updateAssemblyStatus(scaffoldId, assemblyStatus, user, imageFile) {
    // Obtener andamio actual
    const scaffold = await Scaffold.getById(scaffoldId);
    if (!scaffold) {
      const error = new Error('Andamio no encontrado.');
      error.statusCode = 404;
      throw error;
    }

    // Validar permisos
    const project = await Project.getById(scaffold.project_id);
    this.validateUserPermissions(user, scaffold, project);

    // Si se va a desarmar, requerir imagen
    let disassemblyImageUrl = null;
    if (assemblyStatus === 'disassembled') {
      if (!imageFile) {
        const error = new Error('Se requiere imagen de desarmado.');
        error.statusCode = 400;
        throw error;
      }
      disassemblyImageUrl = await uploadFile(imageFile);
    }

    // Actualizar estado de armado
    const updated = await Scaffold.updateAssemblyStatus(scaffoldId, assemblyStatus, disassemblyImageUrl);

    // Registrar en historial
    await ScaffoldHistory.create({
      scaffold_id: scaffoldId,
      user_id: user.id,
      change_type: 'assembly_status',
      previous_data: {
        assembly_status: scaffold.assembly_status,
        card_status: scaffold.card_status,
      },
      new_data: {
        assembly_status: assemblyStatus,
        card_status: assemblyStatus === 'disassembled' ? 'red' : updated.card_status,
        disassembly_image: disassemblyImageUrl,
      },
      description: `Estado cambiado de ${scaffold.assembly_status} a ${assemblyStatus}`,
      scaffold_number: scaffold.scaffold_number,
      project_name: project?.name,
      area: scaffold.area,
      tag: scaffold.tag,
    });

    logger.info(`Estado de armado del andamio ${scaffoldId} cambiado a ${assemblyStatus}`);
    return updated;
  }

  /**
   * Desarmar andamio con foto y notas de prueba
   * @param {number} scaffoldId - ID del andamio
   * @param {object} user - Usuario { id, role }
   * @param {object} imageFile - Archivo de imagen
   * @param {string} disassemblyNotes - Notas de desarmado
   * @returns {Promise<object>} Andamio desarmado
   */
  static async disassembleScaffold(scaffoldId, user, imageFile, disassemblyNotes) {
    // Obtener andamio actual
    const scaffold = await Scaffold.getById(scaffoldId);
    if (!scaffold) {
      const error = new Error('Andamio no encontrado.');
      error.statusCode = 404;
      throw error;
    }

    // Validar proyecto activo
    const project = await this.validateActiveProject(scaffold.project_id);

    // Validar permisos
    this.validateUserPermissions(user, scaffold, project);

    // Requerir imagen de desarmado
    if (!imageFile) {
      const error = new Error('Se requiere imagen de desarmado.');
      error.statusCode = 400;
      throw error;
    }

    // Subir imagen
    const disassemblyImageUrl = await uploadFile(imageFile);

    // Actualizar andamio a desarmado
    const query = `
      UPDATE scaffolds 
      SET assembly_status = 'disassembled', 
          card_status = 'red',
          disassembly_image_url = $1,
          disassembly_notes = $2,
          disassembled_at = NOW(),
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const { rows } = await db.query(query, [disassemblyImageUrl, disassemblyNotes || null, scaffoldId]);
    const updated = rows[0];

    // Registrar en historial
    await ScaffoldHistory.create({
      scaffold_id: scaffoldId,
      user_id: user.id,
      change_type: 'disassemble',
      previous_data: {
        assembly_status: scaffold.assembly_status,
        card_status: scaffold.card_status,
      },
      new_data: {
        assembly_status: 'disassembled',
        card_status: 'red',
        disassembly_image: disassemblyImageUrl,
        disassembly_notes: disassemblyNotes || null,
      },
      description: 'Andamio desarmado con pruebas fotográficas',
      scaffold_number: scaffold.scaffold_number,
      project_name: project.name,
      area: scaffold.area,
      tag: scaffold.tag,
    });

    logger.info(`Andamio ${scaffoldId} desarmado por usuario ${user.id}`);
    return updated;
  }

  /**
   * Eliminar un andamio permanentemente
   * @param {number} scaffoldId - ID del andamio
   * @param {object} user - Usuario { id, role } (debe ser admin)
   * @returns {Promise<void>}
   */
  static async deleteScaffold(scaffoldId, user) {
    // Obtener andamio
    const scaffold = await Scaffold.getById(scaffoldId);
    if (!scaffold) {
      const error = new Error('Andamio no encontrado.');
      error.statusCode = 404;
      throw error;
    }

    // Obtener proyecto para historial
    const project = await Project.getById(scaffold.project_id);

    // Registrar eliminación ANTES de borrar
    await ScaffoldHistory.create({
      scaffold_id: scaffoldId,
      user_id: user.id,
      change_type: 'delete',
      previous_data: scaffold,
      new_data: {},
      description: 'Andamio eliminado del sistema',
      scaffold_number: scaffold.scaffold_number,
      project_name: project?.name,
      area: scaffold.area,
      tag: scaffold.tag,
    });

    // Eliminar imágenes del servidor
    await this._deleteScaffoldImages(scaffold);

    // Eliminar andamio de la base de datos
    await db.query('DELETE FROM scaffolds WHERE id = $1', [scaffoldId]);

    logger.info(`Andamio ${scaffoldId} eliminado por admin ${user.id}`);
  }

  // ============================================
  // MÉTODOS PRIVADOS
  // ============================================

  /**
   * Eliminar imágenes de un andamio del servidor
   * @param {object} scaffold - Andamio con URLs de imágenes
   * @private
   */
  static async _deleteScaffoldImages(scaffold) {
    await Promise.all([
      deleteFileByUrl(scaffold.assembly_image_url),
      deleteFileByUrl(scaffold.disassembly_image_url),
    ]);
  }
}

module.exports = ScaffoldService;
