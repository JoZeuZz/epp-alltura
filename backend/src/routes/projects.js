const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Project = require('../models/project');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');
const { generateScaffoldsPDF } = require('../lib/pdfGenerator');
const { generateReportExcel } = require('../lib/excelGenerator');
const logger = require('../lib/logger');

// GET all projects (for admins) or assigned projects (for technicians)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    let projects;
    if (req.user.role === 'admin') {
      projects = await Project.getAll();
    } else if (req.user.role === 'technician') {
      projects = await Project.getForUser(req.user.id);
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
  client_id: Joi.number().integer().positive().required(),
  name: Joi.string().trim().min(2).max(100).required(),
  status: Joi.string().valid('active', 'inactive', 'completed').required(),
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

// GET project report as PDF
router.get('/:id/report/pdf', async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const project = await Project.getById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const { rows: scaffolds } = await db.query('SELECT * FROM scaffolds WHERE project_id = $1', [
      projectId,
    ]);

    const doc = await generateScaffoldsPDF(project, scaffolds);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_${project.name}.pdf`);

    doc.pipe(res);
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
    const { rows: scaffolds } = await db.query('SELECT * FROM scaffolds WHERE project_id = $1', [
      projectId,
    ]);

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
