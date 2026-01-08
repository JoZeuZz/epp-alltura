const ProjectService = require('../services/projects.service');
const { logger } = require('../lib/logger');

/**
 * ProjectController
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
class ProjectController {
  /**
   * Obtener todos los proyectos (filtrado por rol del usuario)
   * @route GET /api/projects
   */
  static async getAllProjects(req, res, next) {
    try {
      const projects = await ProjectService.getProjectsByRole(req.user);
      res.json(projects);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      logger.error(`Error al obtener proyectos: ${err.message}`, err);
      
      if (statusCode < 500) {
        return res.status(statusCode).json({ message: err.message });
      }
      next(err);
    }
  }

  /**
   * Obtener un proyecto específico por ID
   * @route GET /api/projects/:id
   */
  static async getProjectById(req, res, next) {
    try {
      const { id } = req.params;
      const project = await ProjectService.getProjectById(parseInt(id));

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      res.json(project);
    } catch (err) {
      logger.error(`Error al obtener proyecto: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * Obtener usuarios asignados a un proyecto (sistema legacy)
   * @route GET /api/projects/:id/users
   */
  static async getAssignedUsers(req, res, next) {
    try {
      const { id } = req.params;
      const userIds = await ProjectService.getAssignedUsers(parseInt(id));
      res.json(userIds);
    } catch (err) {
      logger.error(`Error al obtener usuarios asignados: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * Obtener conteo de andamios de un proyecto
   * @route GET /api/projects/:id/scaffolds/count
   */
  static async getScaffoldCount(req, res, next) {
    try {
      const { id } = req.params;
      const count = await ProjectService.getScaffoldCount(parseInt(id));
      res.json({ count });
    } catch (err) {
      logger.error(`Error al obtener conteo de andamios: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * Crear un nuevo proyecto
   * @route POST /api/projects
   */
  static async createProject(req, res, next) {
    try {
      const projectData = req.body;
      const newProject = await ProjectService.createProject(projectData);
      res.status(201).json(newProject);
    } catch (err) {
      logger.error(`Error al crear proyecto: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * Actualizar un proyecto existente
   * @route PUT /api/projects/:id
   */
  static async updateProject(req, res, next) {
    try {
      const { id } = req.params;
      const projectData = req.body;
      const updatedProject = await ProjectService.updateProject(parseInt(id), projectData);
      res.json(updatedProject);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      logger.error(`Error al actualizar proyecto: ${err.message}`, err);
      
      if (statusCode < 500) {
        return res.status(statusCode).json({ message: err.message });
      }
      next(err);
    }
  }

  /**
   * Eliminar o desactivar un proyecto
   * @route DELETE /api/projects/:id
   */
  static async deleteProject(req, res, next) {
    try {
      const { id } = req.params;
      const result = await ProjectService.deleteOrDeactivateProject(parseInt(id));
      res.json(result);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      logger.error(`Error al eliminar/desactivar proyecto: ${err.message}`, err);
      
      if (statusCode < 500) {
        return res.status(statusCode).json({ message: err.message });
      }
      next(err);
    }
  }

  /**
   * Reactivar un proyecto desactivado
   * @route PATCH /api/projects/:id/reactivate
   */
  static async reactivateProject(req, res, next) {
    try {
      const { id } = req.params;
      const reactivatedProject = await ProjectService.reactivateProject(parseInt(id));
      res.json({
        message: 'Project reactivated successfully',
        project: reactivatedProject,
      });
    } catch (err) {
      const statusCode = err.statusCode || 500;
      logger.error(`Error al reactivar proyecto: ${err.message}`, err);
      
      if (statusCode < 500) {
        return res.status(statusCode).json({ message: err.message });
      }
      next(err);
    }
  }

  /**
   * Asignar usuarios a un proyecto (sistema legacy)
   * @route POST /api/projects/:id/users
   */
  static async assignUsers(req, res, next) {
    try {
      const { id } = req.params;
      const { userIds } = req.body;
      await ProjectService.assignUsers(parseInt(id), userIds);
      res.status(200).json({ message: 'Users assigned successfully' });
    } catch (err) {
      logger.error(`Error al asignar usuarios: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * Asignar un cliente a un proyecto
   * @route PATCH /api/projects/:id/assign-client
   */
  static async assignClient(req, res, next) {
    try {
      const { id } = req.params;
      const { clientId } = req.body;

      // Validación básica
      if (!clientId) {
        return res.status(400).json({ message: 'clientId es requerido' });
      }

      const updated = await ProjectService.assignClient(parseInt(id), clientId);
      res.json(updated);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      logger.error(`Error al asignar cliente: ${err.message}`, err);
      
      if (statusCode < 500) {
        return res.status(statusCode).json({ message: err.message });
      }
      next(err);
    }
  }

  /**
   * Asignar un supervisor a un proyecto
   * @route PATCH /api/projects/:id/assign-supervisor
   */
  static async assignSupervisor(req, res, next) {
    try {
      const { id } = req.params;
      const { supervisorId } = req.body;

      // Validación básica
      if (!supervisorId) {
        return res.status(400).json({ message: 'supervisorId es requerido' });
      }

      const updated = await ProjectService.assignSupervisor(parseInt(id), supervisorId);
      res.json(updated);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      logger.error(`Error al asignar supervisor: ${err.message}`, err);
      
      if (statusCode < 500) {
        return res.status(statusCode).json({ message: err.message });
      }
      next(err);
    }
  }

  /**
   * Generar reporte PDF de un proyecto
   * @route GET /api/projects/:id/report/pdf
   */
  static async generatePDFReport(req, res, next) {
    try {
      const { id } = req.params;
      
      // Extraer filtros de query params
      const filters = {
        status: req.query.status || 'all',
        startDate: req.query.startDate || '',
        endDate: req.query.endDate || '',
      };

      // El servicio necesita res para hacer streaming del PDF
      await ProjectService.generatePDFReport(parseInt(id), res, filters);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      logger.error(`Error al generar reporte PDF: ${err.message}`, err);
      
      if (statusCode < 500) {
        return res.status(statusCode).json({ message: err.message });
      }
      next(err);
    }
  }

  /**
   * Generar reporte Excel de un proyecto
   * @route GET /api/projects/:id/report/excel
   */
  static async generateExcelReport(req, res, next) {
    try {
      const { id } = req.params;
      
      // Obtener proyecto para nombre de archivo
      const project = await ProjectService.getProjectById(parseInt(id));
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Generar buffer del Excel
      const buffer = await ProjectService.generateExcelReport(parseInt(id));

      // Enviar archivo
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="reporte_${project.name}.xlsx"`,
      });
      res.end(buffer);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      logger.error(`Error al generar reporte Excel: ${err.message}`, err);
      
      if (statusCode < 500) {
        return res.status(statusCode).json({ message: err.message });
      }
      next(err);
    }
  }
}

module.exports = ProjectController;
