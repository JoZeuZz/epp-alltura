const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Project = require('../models/project');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const { generateScaffoldsPDF } = require('../lib/pdfGenerator');
const { generateReportExcel } = require('../lib/excelGenerator');
const { logger } = require('../lib/logger');

// GET all projects (filtrado por rol)
// Admin: todos los proyectos
// Supervisor: proyectos donde está asignado
// Client: proyectos donde está asignado
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    let projects;
    if (req.user.role === 'admin') {
      projects = await Project.getAll();
    } else if (req.user.role === 'supervisor') {
      // Supervisor ve proyectos donde está asignado + proyectos legacy con project_users
      const assignedProjects = await Project.getByAssignedSupervisor(req.user.id);
      const legacyProjects = await Project.getForUser(req.user.id);
      // Combinar y eliminar duplicados
      const allProjects = [...assignedProjects, ...legacyProjects];
      const uniqueProjects = allProjects.filter((project, index, self) =>
        index === self.findIndex((p) => p.id === project.id)
      );
      projects = uniqueProjects;
    } else if (req.user.role === 'client') {
      // Cliente solo ve proyectos donde está asignado
      projects = await Project.getByAssignedClient(req.user.id);
    } else {
      return res.status(403).json({ message: 'Rol no autorizado.' });
    }
    res.json(projects);
  } catch (err) {
    logger.error(`Error al obtener proyectos: ${err.message}`, err);
    next(err);
  }
});

// GET a single project by ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const project = await Project.getById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (err) {
    logger.error(`Error al obtener el proyecto con ID ${req.params.id}: ${err.message}`, err);
    next(err);
  }
});

// Apply auth and isAdmin middleware to all routes below
router.use(authMiddleware, isAdmin);

// GET assigned users for a project
router.get('/:id/users', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT user_id FROM project_users WHERE project_id = $1', [
      req.params.id,
    ]);
    const userIds = rows.map((row) => row.user_id);
    res.json(userIds); // Devuelve un array de IDs de usuario [1, 2, 3]
  } catch (err) {
    logger.error(
      `Error al obtener los usuarios asignados al proyecto con ID ${req.params.id}: ${err.message}`,
      err,
    );
    next(err);
  }
});

const assignUsersSchema = Joi.object({
  userIds: Joi.array().items(Joi.number().integer().positive()).required(),
});

// POST to assign users to a project
router.post('/:id/users', async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { userIds } = await assignUsersSchema.validateAsync(req.body);

    await Project.assignUsers(projectId, userIds);
    res.status(200).json({ message: 'Users assigned successfully' });
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: err.details[0].message });
    }
    logger.error(
      `Error al asignar usuarios al proyecto con ID ${req.params.id}: ${err.message}`,
      err,
    );
    next(err);
  }
});

const projectSchema = Joi.object({
  client_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'El ID del cliente debe ser un número',
      'number.integer': 'El ID del cliente debe ser un número entero',
      'number.positive': 'El ID del cliente debe ser un número positivo',
      'any.required': 'El cliente es obligatorio'
    }),
  name: Joi.string()
    .trim()
    .min(3)
    .max(255)
    .required()
    .messages({
      'string.empty': 'El nombre del proyecto es obligatorio',
      'string.min': 'El nombre debe tener al menos 3 caracteres',
      'string.max': 'El nombre no puede exceder 255 caracteres',
      'any.required': 'El nombre del proyecto es obligatorio'
    }),
  status: Joi.string()
    .valid('active', 'inactive', 'completed')
    .default('active')
    .messages({
      'any.only': 'El estado debe ser active, inactive o completed'
    }),
  assigned_client_id: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'El ID del cliente asignado debe ser un número',
      'number.integer': 'El ID del cliente asignado debe ser un número entero',
      'number.positive': 'El ID del cliente asignado debe ser un número positivo'
    }),
  assigned_supervisor_id: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .messages({
      'number.base': 'El ID del supervisor asignado debe ser un número',
      'number.integer': 'El ID del supervisor asignado debe ser un número entero',
      'number.positive': 'El ID del supervisor asignado debe ser un número positivo'
    })
});

// POST a new project
router.post('/', async (req, res, next) => {
  try {
    const validatedData = await projectSchema.validateAsync(req.body);
    const newProject = await Project.create(validatedData);
    res.status(201).json(newProject);
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: err.details[0].message });
    }
    logger.error(`Error al crear un nuevo proyecto: ${err.message}`, err);
    next(err);
  }
});

// PUT to update a project
router.put('/:id', async (req, res, next) => {
  try {
    const validatedData = await projectSchema.validateAsync(req.body);
    const updatedProject = await Project.update(req.params.id, validatedData);
    if (!updatedProject) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(updatedProject);
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: err.details[0].message });
    }
    logger.error(`Error al actualizar el proyecto con ID ${req.params.id}: ${err.message}`, err);
    next(err);
  }
});

// DELETE a project
router.delete('/:id', async (req, res, next) => {
  try {
    const deletedProject = await Project.delete(req.params.id);
    if (!deletedProject) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json({ message: 'Project deleted' });
  } catch (err) {
    logger.error(`Error al eliminar el proyecto con ID ${req.params.id}: ${err.message}`, err);
    next(err);
  }
});

/**
 * @route   PATCH /api/projects/:id/assign-client
 * @desc    Asignar un cliente (usuario tipo client) a un proyecto
 * @access  Private (Admin)
 */
router.patch('/:id/assign-client', async (req, res, next) => {
  try {
    const { clientId } = req.body;
    
    if (!clientId) {
      return res.status(400).json({ message: 'clientId es requerido' });
    }

    // Verificar que el usuario existe y es tipo client
    const { rows } = await db.query('SELECT role FROM users WHERE id = $1', [clientId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    if (rows[0].role !== 'client') {
      return res.status(400).json({ message: 'El usuario debe tener rol de cliente' });
    }

    const updated = await Project.assignClient(req.params.id, clientId);
    if (!updated) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    res.json(updated);
  } catch (err) {
    logger.error(`Error al asignar cliente al proyecto ${req.params.id}: ${err.message}`, err);
    next(err);
  }
});

/**
 * @route   PATCH /api/projects/:id/assign-supervisor
 * @desc    Asignar un supervisor a un proyecto
 * @access  Private (Admin)
 */
router.patch('/:id/assign-supervisor', async (req, res, next) => {
  try {
    const { supervisorId } = req.body;
    
    if (!supervisorId) {
      return res.status(400).json({ message: 'supervisorId es requerido' });
    }

    // Verificar que el usuario existe y es tipo supervisor
    const { rows } = await db.query('SELECT role FROM users WHERE id = $1', [supervisorId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    if (rows[0].role !== 'supervisor') {
      return res.status(400).json({ message: 'El usuario debe tener rol de supervisor' });
    }

    const updated = await Project.assignSupervisor(req.params.id, supervisorId);
    if (!updated) {
      return res.status(404).json({ message: 'Proyecto no encontrado' });
    }

    res.json(updated);
  } catch (err) {
    logger.error(`Error al asignar supervisor al proyecto ${req.params.id}: ${err.message}`, err);
    next(err);
  }
});

// GET project report as PDF
router.get('/:id/report/pdf', async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const project = await Project.getById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Extraer filtros de query params
    const filters = {
      status: req.query.status || 'all',
      startDate: req.query.startDate || '',
      endDate: req.query.endDate || ''
    };
    
    // Construir query con filtros
    let query = `
      SELECT 
        s.*,
        u.first_name || ' ' || u.last_name as user_name
      FROM scaffolds s
      JOIN users u ON s.user_id = u.id
      WHERE s.project_id = $1
    `;
    
    const queryParams = [projectId];
    
    // Aplicar filtro de estado
    if (filters.status && filters.status !== 'all') {
      query += ` AND s.status = $${queryParams.length + 1}`;
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
    
    const { rows: scaffolds } = await db.query(query, queryParams);

    // Pasar res y filters a la función
    generateScaffoldsPDF(project, scaffolds, res, filters);
  } catch (err) {
    logger.error(
      `Error al generar el reporte en PDF para el proyecto con ID ${req.params.id}: ${err.message}`,
      err,
    );
    next(err);
  }
});

// GET project report as Excel
router.get('/:id/report/excel', async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const project = await Project.getById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const { rows: scaffolds } = await db.query(`
      SELECT 
        s.*,
        u.first_name || ' ' || u.last_name as user_name
      FROM scaffolds s
      JOIN users u ON s.user_id = u.id
      WHERE s.project_id = $1
      ORDER BY s.assembly_created_at DESC
    `, [projectId]);

    const buffer = await generateReportExcel(project, scaffolds);

    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reporte_${project.name}.xlsx"`,
    });
    res.end(buffer);
  } catch (err) {
    logger.error(
      `Error al generar el reporte en Excel para el proyecto con ID ${req.params.id}: ${err.message}`,
      err,
    );
    next(err);
  }
});

module.exports = router;
