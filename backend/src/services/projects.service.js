const Project = require('../models/project');
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
   * Validar que un usuario sea de tipo client
   * @param {number} userId - ID del usuario
   * @returns {Promise<boolean>}
   * @throws {Error} Si el usuario no existe o no es client
   */
  static async validateClientUser(userId) {
    const { rows } = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    
    if (rows.length === 0) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }
    
    if (rows[0].role !== 'client') {
      const error = new Error('El usuario debe tener rol de cliente');
      error.statusCode = 400;
      throw error;
    }
    
    return true;
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
    // Validar que el usuario sea tipo client
    await this.validateClientUser(clientId);

    // Asignar cliente al proyecto
    const updated = await Project.assignClient(projectId, clientId);
    
    if (!updated) {
      const error = new Error('Proyecto no encontrado');
      error.statusCode = 404;
      throw error;
    }
    
    logger.info(`Cliente ${clientId} asignado al proyecto ${projectId}`);
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
    return updated;
  }

  // ============================================
  // GENERACIÓN DE REPORTES
  // ============================================

  /**
   * Obtener datos de andamios para reporte con filtros
   * @param {number} projectId - ID del proyecto
   * @param {object} filters - Filtros { status, startDate, endDate }
   * @returns {Promise<Array>} Lista de andamios con información completa
   */
  static async getScaffoldsForReport(projectId, filters = {}) {
    // Construir query con filtros
    let query = `
      SELECT 
        s.*,
        u.first_name || ' ' || u.last_name as user_name,
        creator.first_name || ' ' || creator.last_name as created_by_name,
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

    // Obtener andamios con filtros
    const scaffolds = await this.getScaffoldsForReport(projectId, filters);

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
    const scaffolds = await this.getScaffoldsForReport(projectId);

    // Generar Excel
    const buffer = await generateReportExcel(project, scaffolds);
    logger.info(`Reporte Excel generado para proyecto ${projectId}`);
    return buffer;
  }
}

module.exports = ProjectService;
