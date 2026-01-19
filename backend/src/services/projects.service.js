const Project = require('../models/project');
const Scaffold = require('../models/scaffold');
const db = require('../db');
const { logger } = require('../lib/logger');
const { generateScaffoldsPDF } = require('../lib/pdfGenerator');
const { generateReportExcel } = require('../lib/excelGenerator');

/**
 * ProjectService
 * Capa de Servicio - Lógica de Negocio Pura
 * Responsabilidades:
 * - Validaciones de negocio
 * - Consultas a base de datos
 * - Lógica de soft delete (desactivar vs eliminar)
 * - Asignación de usuarios
 * - Generación de reportes
 * 
 * PROHIBIDO: No debe contener objetos req o res
 */
class ProjectService {
  // ============================================
  // VALIDACIONES DE NEGOCIO
  // ============================================

  /**
   * Validar que un usuario sea de tipo client y pertenezca a la empresa correcta
   * @param {number} userId - ID del usuario
   * @param {number} projectClientId - ID de la empresa cliente del proyecto (opcional)
   * @returns {Promise<object>} Datos del usuario
   * @throws {Error} Si el usuario no existe, no es client, o no pertenece a la empresa
   */
  static async validateClientUser(userId, projectClientId = null) {
    const { rows } = await db.query('SELECT role, client_id FROM users WHERE id = $1', [userId]);
    
    if (rows.length === 0) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }
    
    const user = rows[0];
    
    if (user.role !== 'client') {
      const error = new Error('El usuario debe tener rol de cliente');
      error.statusCode = 400;
      throw error;
    }
    
    // Si se proporciona projectClientId, validar que el usuario pertenezca a esa empresa
    if (projectClientId !== null) {
      if (!user.client_id) {
        const error = new Error('El usuario cliente no está vinculado a ninguna empresa');
        error.statusCode = 400;
        throw error;
      }
      
      if (user.client_id !== projectClientId) {
        const error = new Error('El usuario cliente no pertenece a la empresa cliente de este proyecto');
        error.statusCode = 400;
        throw error;
      }
    }
    
    return user;
  }

  /**
   * Validar que un usuario sea de tipo supervisor
   * @param {number} userId - ID del usuario
   * @returns {Promise<boolean>}
   * @throws {Error} Si el usuario no existe o no es supervisor
   */
  static async validateSupervisorUser(userId) {
    const { rows } = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    
    if (rows.length === 0) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }
    
    if (rows[0].role !== 'supervisor') {
      const error = new Error('El usuario debe tener rol de supervisor');
      error.statusCode = 400;
      throw error;
    }
    
    return true;
  }

  // ============================================
  // OPERACIONES DE CONSULTA
  // ============================================

  /**
   * Obtener proyectos filtrados por rol de usuario
   * @param {object} user - Usuario { id, role }
   * @returns {Promise<Array>} Lista de proyectos
   */
  static async getProjectsByRole(user) {
    const { role, id: userId } = user;

    if (role === 'admin') {
      // Admin ve todos los proyectos (activos e inactivos)
      return await Project.getAllIncludingInactive();
    }

    if (role === 'supervisor') {
      // Supervisor ve proyectos donde está asignado + proyectos legacy con project_users
      const assignedProjects = await Project.getByAssignedSupervisor(userId);
      const legacyProjects = await Project.getForUser(userId);
      
      // Combinar y eliminar duplicados
      const allProjects = [...assignedProjects, ...legacyProjects];
      const uniqueProjects = allProjects.filter((project, index, self) =>
        index === self.findIndex((p) => p.id === project.id)
      );
      
      return uniqueProjects;
    }

    if (role === 'client') {
      // Cliente solo ve proyectos donde está asignado
      return await Project.getByAssignedClient(userId);
    }

    const error = new Error('Rol no autorizado.');
    error.statusCode = 403;
    throw error;
  }

  /**
   * Obtener un proyecto por ID
   * @param {number} projectId - ID del proyecto
   * @returns {Promise<object|null>} Proyecto o null si no existe
   */
  static async getProjectById(projectId) {
    return await Project.getById(projectId);
  }

  /**
   * Obtener usuarios asignados a un proyecto (sistema legacy)
   * @param {number} projectId - ID del proyecto
   * @returns {Promise<Array>} Array de IDs de usuario
   */
  static async getAssignedUsers(projectId) {
    const { rows } = await db.query(
      'SELECT user_id FROM project_users WHERE project_id = $1',
      [projectId]
    );
    return rows.map((row) => row.user_id);
  }

  /**
   * Obtener conteo de andamios asociados a un proyecto
   * @param {number} projectId - ID del proyecto
   * @returns {Promise<number>} Cantidad de andamios
   */
  static async getScaffoldCount(projectId) {
    return await Project.getScaffoldCount(projectId);
  }

  // ============================================
  // OPERACIONES DE CREACIÓN Y MODIFICACIÓN
  // ============================================

  /**
   * Crear un nuevo proyecto
   * @param {object} projectData - Datos del proyecto
   * @returns {Promise<object>} Proyecto creado
   */
  static async createProject(projectData) {
    const newProject = await Project.create(projectData);
    logger.info(`Proyecto ${newProject.id} creado: ${newProject.name}`);
    
    // Notificar al supervisor si fue asignado al crear el proyecto
    if (newProject.assigned_supervisor_id) {
      try {
        const NotificationService = require('./notification.service');
        await NotificationService.createInAppNotification({
          user_id: newProject.assigned_supervisor_id,
          type: 'project_assigned',
          title: '📋 Asignado a nuevo proyecto',
          message: `Has sido asignado como supervisor del proyecto "${newProject.name}"`,
          metadata: {
            project_id: newProject.id,
            assigned_role: 'supervisor'
          },
          link: `/supervisor/project/${newProject.id}`
        });
        logger.info(`Supervisor ${newProject.assigned_supervisor_id} notificado sobre asignación al proyecto ${newProject.id}`);
      } catch (notifError) {
        logger.error('Error enviando notificación de asignación de supervisor', {
          error: notifError.message,
          supervisorId: newProject.assigned_supervisor_id,
          projectId: newProject.id
        });
      }
    }
    
    return newProject;
  }

  /**
   * Actualizar un proyecto existente
   * @param {number} projectId - ID del proyecto
   * @param {object} projectData - Datos a actualizar
   * @returns {Promise<object|null>} Proyecto actualizado o null si no existe
   */
  static async updateProject(projectId, projectData) {
    const updatedProject = await Project.update(projectId, projectData);
    
    if (!updatedProject) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }
    
    logger.info(`Proyecto ${projectId} actualizado`);
    return updatedProject;
  }

  /**
   * Eliminar o desactivar un proyecto (soft delete)
   * Si tiene andamios, desactiva. Si no tiene, elimina permanentemente.
   * @param {number} projectId - ID del proyecto
   * @returns {Promise<object>} Resultado de la operación
   */
  static async deleteOrDeactivateProject(projectId) {
    // Verificar si el proyecto tiene andamios asociados
    const scaffoldCount = await Project.getScaffoldCount(projectId);

    if (scaffoldCount > 0) {
      // Si tiene andamios, desactivar en lugar de eliminar
      const deactivatedProject = await Project.deactivate(projectId);
      
      if (!deactivatedProject) {
        const error = new Error('Project not found');
        error.statusCode = 404;
        throw error;
      }
      
      logger.info(`Proyecto ${projectId} desactivado (tiene ${scaffoldCount} andamios)`);
      return {
        message: 'Project deactivated (has associated scaffolds)',
        deactivated: true,
        scaffoldCount,
        project: deactivatedProject,
      };
    } else {
      // Si no tiene andamios, eliminar permanentemente
      const deletedProject = await Project.delete(projectId);
      
      if (!deletedProject) {
        const error = new Error('Project not found');
        error.statusCode = 404;
        throw error;
      }
      
      logger.info(`Proyecto ${projectId} eliminado permanentemente`);
      return {
        message: 'Project deleted permanently',
        deleted: true,
        project: deletedProject,
      };
    }
  }

  /**
   * Reactivar un proyecto desactivado
   * @param {number} projectId - ID del proyecto
   * @returns {Promise<object>} Proyecto reactivado
   */
  static async reactivateProject(projectId) {
    const reactivatedProject = await Project.reactivate(projectId);
    
    if (!reactivatedProject) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }
    
    logger.info(`Proyecto ${projectId} reactivado`);
    return reactivatedProject;
  }

  // ============================================
  // ASIGNACIÓN DE USUARIOS
  // ============================================

  /**
   * Asignar usuarios a un proyecto (sistema legacy)
   * @param {number} projectId - ID del proyecto
   * @param {Array<number>} userIds - Array de IDs de usuario
   * @returns {Promise<void>}
   */
  static async assignUsers(projectId, userIds) {
    await Project.assignUsers(projectId, userIds);
    logger.info(`Usuarios ${userIds.join(', ')} asignados al proyecto ${projectId}`);
  }

  /**
   * Asignar un cliente (usuario tipo client) a un proyecto
   * @param {number} projectId - ID del proyecto
   * @param {number} clientId - ID del usuario cliente
   * @returns {Promise<object>} Proyecto actualizado
   */
  static async assignClient(projectId, clientId) {
    // Obtener el proyecto para conocer su client_id (empresa cliente)
    const project = await Project.findById(projectId);
    if (!project) {
      const error = new Error('Proyecto no encontrado');
      error.statusCode = 404;
      throw error;
    }

    // Validar que el usuario sea tipo client y pertenezca a la empresa del proyecto
    await this.validateClientUser(clientId, project.client_id);

    // Asignar cliente al proyecto
    const updated = await Project.assignClient(projectId, clientId);
    
    if (!updated) {
      const error = new Error('Proyecto no encontrado');
      error.statusCode = 404;
      throw error;
    }

    logger.info(`Cliente ${clientId} asignado al proyecto ${projectId}`);
    
    // Notificar al cliente sobre su asignación
    try {
      const NotificationService = require('./notification.service');
      await NotificationService.createInAppNotification({
        user_id: clientId,
        type: 'project_assigned',
        title: '📋 Acceso a nuevo proyecto',
        message: `Ahora tienes acceso al proyecto "${updated.name}"`,
        metadata: {
          project_id: updated.id,
          assigned_role: 'client'
        },
        link: `/client/project/${updated.id}`
      });
      logger.info(`Cliente ${clientId} notificado sobre asignación al proyecto ${projectId}`);
    } catch (notifError) {
      logger.error('Error enviando notificación de asignación de cliente', {
        error: notifError.message,
        clientId,
        projectId
      });
    }
    
    return updated;
  }

  /**
   * Asignar un supervisor a un proyecto
   * @param {number} projectId - ID del proyecto
   * @param {number} supervisorId - ID del usuario supervisor
   * @returns {Promise<object>} Proyecto actualizado
   */
  static async assignSupervisor(projectId, supervisorId) {
    // Validar que el usuario sea tipo supervisor
    await this.validateSupervisorUser(supervisorId);

    // Asignar supervisor al proyecto
    const updated = await Project.assignSupervisor(projectId, supervisorId);
    
    if (!updated) {
      const error = new Error('Proyecto no encontrado');
      error.statusCode = 404;
      throw error;
    }
    
    logger.info(`Supervisor ${supervisorId} asignado al proyecto ${projectId}`);
    
    // Notificar al supervisor sobre su asignación
    try {
      const NotificationService = require('./notification.service');
      await NotificationService.createInAppNotification({
        user_id: supervisorId,
        type: 'project_assigned',
        title: '📋 Asignado a nuevo proyecto',
        message: `Has sido asignado como supervisor del proyecto "${updated.name}"`,
        metadata: {
          project_id: updated.id,
          assigned_role: 'supervisor'
        },
        link: `/supervisor/project/${updated.id}`
      });
      logger.info(`Supervisor ${supervisorId} notificado sobre asignación al proyecto ${projectId}`);
    } catch (notifError) {
      logger.error('Error enviando notificación de asignación de supervisor', {
        error: notifError.message,
        supervisorId,
        projectId
      });
    }
    
    return updated;
  }

  /**
   * Obtener andamios de un proyecto con paginación, filtrado y búsqueda
   * @param {number} projectId - ID del proyecto
   * @param {object} filters - Filtros (status, etc)
   * @param {object} pagination - Paginación (page, limit)
   * @param {string} search - Término de búsqueda
   * @returns {Promise<object>} Andamios con metadatos de paginación
   */
  static async getProjectScaffolds(projectId, filters = {}, pagination = {}, search = '') {
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const offset = (page - 1) * limit;

    // Query base para contar total de registros
    let countQuery = `
      SELECT COUNT(*) as total
      FROM scaffolds s
      WHERE s.project_id = $1
    `;

    // Query base para obtener los datos
    let query = `
      SELECT 
        s.*,
        u.first_name || ' ' || u.last_name as created_by_username,
        creator.role as creator_role,
        c.name as company_name,
        supervisor.first_name || ' ' || supervisor.last_name as supervisor_name
      FROM scaffolds s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN users creator ON s.created_by = creator.id
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users supervisor ON p.assigned_supervisor_id = supervisor.id
      WHERE s.project_id = $1
    `;

    const queryParams = [projectId];

    // Aplicar filtro de estado
    if (filters.status && filters.status !== 'all') {
      query += ` AND s.assembly_status = $${queryParams.length + 1}`;
      queryParams.push(filters.status);
    }

    // Aplicar filtro de fecha inicial
    if (filters.startDate) {
      query += ` AND s.assembly_created_at >= $${queryParams.length + 1}`;
      queryParams.push(filters.startDate);
    }

    // Aplicar filtro de fecha final
    if (filters.endDate) {
      query += ` AND s.assembly_created_at <= $${queryParams.length + 1}`;
      queryParams.push(filters.endDate);
    }

    query += ` ORDER BY s.assembly_created_at DESC`;

    const { rows } = await db.query(query, queryParams);
    return rows;
  }

  /**
   * Generar reporte PDF de un proyecto
   * @param {number} projectId - ID del proyecto
   * @param {object} res - Objeto response de Express (necesario para PDF stream)
   * @param {object} filters - Filtros { status, startDate, endDate }
   * @returns {Promise<void>}
   */
  static async generatePDFReport(projectId, res, filters = {}) {
    // Obtener proyecto
    const project = await Project.getById(projectId);
    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    // Obtener andamios con filtros (usar Scaffold.getByProject directamente)
    const scaffolds = await Scaffold.getByProject(projectId);

    // Generar PDF (requiere res para streaming)
    generateScaffoldsPDF(project, scaffolds, res, filters);
    logger.info(`Reporte PDF generado para proyecto ${projectId}`);
  }

  /**
   * Generar reporte Excel de un proyecto
   * @param {number} projectId - ID del proyecto
   * @returns {Promise<Buffer>} Buffer del archivo Excel
   */
  static async generateExcelReport(projectId) {
    // Obtener proyecto
    const project = await Project.getById(projectId);
    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    // Obtener todos los andamios (sin filtros para Excel)
    const scaffolds = await Scaffold.getByProject(projectId);

    // Obtener modificaciones aprobadas del proyecto
    const modificationsQuery = `
      SELECT 
        sm.*,
        s.scaffold_number,
        s.area,
        s.tag,
        u.first_name || ' ' || u.last_name as created_by_name,
        approver.first_name || ' ' || approver.last_name as approved_by_name
      FROM scaffold_modifications sm
      JOIN scaffolds s ON sm.scaffold_id = s.id
      JOIN users u ON sm.created_by = u.id
      LEFT JOIN users approver ON sm.approved_by = approver.id
      WHERE s.project_id = $1 AND sm.approval_status = 'approved'
      ORDER BY sm.approved_at DESC
    `;
    const { rows: modifications } = await db.query(modificationsQuery, [projectId]);

    // Generar Excel con modificaciones
    const buffer = await generateReportExcel(project, scaffolds, modifications);
    logger.info(`Reporte Excel generado para proyecto ${projectId}`);
    return buffer;
  }
}

module.exports = ProjectService;
