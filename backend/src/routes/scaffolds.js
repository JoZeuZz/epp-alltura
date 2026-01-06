const express = require('express');
const router = express.Router();
const Joi = require('joi');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { checkRole, isAdminOrSupervisor, isAdmin, isSupervisor } = require('../middleware/roles');
const { trackScaffoldChanges, saveScaffoldState } = require('../middleware/scaffoldHistory');
const Scaffold = require('../models/scaffold');
const ScaffoldHistory = require('../models/scaffoldHistory');
const Project = require('../models/project');
const multer = require('multer');
const { uploadFile } = require('../lib/googleCloud');
const { logger } = require('../lib/logger');
const fs = require('fs').promises;
const path = require('path');

// Multer config for in-memory storage
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

router.use(authMiddleware);
router.use(trackScaffoldChanges);

/**
 * @route   GET /api/scaffolds
 * @desc    Obtener todos los andamios (filtrado por rol)
 * @access  Private
 *          - Admin: ve todos los andamios
 *          - Supervisor: ve solo los que él creó
 *          - Client: ve solo andamios de proyectos asignados
 */
router.get('/', async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;
    let scaffolds;

    if (role === 'admin') {
      // Admin ve todos
      scaffolds = await Scaffold.getAll();
    } else if (role === 'supervisor') {
      // Supervisor solo ve los que creó
      scaffolds = await Scaffold.getByCreator(userId);
    } else if (role === 'client') {
      // Cliente solo ve andamios de proyectos asignados
      const projects = await Project.getByAssignedClient(userId);
      const projectIds = projects.map(p => p.id);
      
      // Obtener andamios de esos proyectos
      const allScaffolds = [];
      for (const projectId of projectIds) {
        const projectScaffolds = await Scaffold.getByProject(projectId);
        allScaffolds.push(...projectScaffolds);
      }
      scaffolds = allScaffolds;
    } else {
      return res.status(403).json({ message: 'Rol no autorizado.' });
    }

    res.json(scaffolds);
  } catch (err) {
    logger.error(`Error al obtener andamios: ${err.message}`, err);
    next(err);
  }
});

/**
 * @route   GET /api/scaffolds/project/:projectId
 * @desc    Obtener todos los andamios de un proyecto específico
 * @access  Private
 */
router.get('/project/:projectId', async (req, res, next) => {
  const { projectId } = req.params;
  try {
    const scaffolds = await Scaffold.getByProject(projectId);
    res.json(scaffolds);
  } catch (err) {
    logger.error(
      `Error al obtener los andamios del proyecto con ID ${projectId}: ${err.message}`,
      err,
    );
    next(err);
  }
});

/**
 * @route   GET /api/scaffolds/my-history
 * @desc    Obtener historial de cambios realizados por el usuario actual
 * @access  Private
 */
router.get('/my-history', async (req, res, next) => {
  try {
    const history = await ScaffoldHistory.getByUser(req.user.id);
    res.json(history);
  } catch (err) {
    logger.error(`Error al obtener historial del usuario ${req.user.id}: ${err.message}`, err);
    next(err);
  }
});

/**
 * @route   GET /api/scaffolds/user-history/:userId
 * @desc    Obtener historial de cambios de un usuario específico (solo admin)
 * @access  Private (Admin only)
 */
router.get('/user-history/:userId', isAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const history = await ScaffoldHistory.getByUser(parseInt(userId));
    res.json(history);
  } catch (err) {
    logger.error(`Error al obtener historial del usuario ${req.params.userId}: ${err.message}`, err);
    next(err);
  }
});

/**
 * @route   GET /api/scaffolds/:id
 * @desc    Obtener un andamio específico por ID
 * @access  Private
 */
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const scaffold = await Scaffold.getById(id);
    
    if (!scaffold) {
      return res.status(404).json({ message: 'Andamio no encontrado.' });
    }

    res.json(scaffold);
  } catch (err) {
    logger.error(`Error al obtener andamio con ID ${id}: ${err.message}`, err);
    next(err);
  }
});

/**
 * @route   GET /api/scaffolds/:id/history
 * @desc    Obtener historial de cambios de un andamio
 * @access  Private
 */
router.get('/:id/history', async (req, res, next) => {
  const { id } = req.params;
  try {
    const history = await ScaffoldHistory.getByScaffold(id);
    res.json(history);
  } catch (err) {
    logger.error(`Error al obtener historial del andamio ${id}: ${err.message}`, err);
    next(err);
  }
});

/**
 * @route   PATCH /api/scaffolds/:id/card-status
 * @desc    Cambiar el estado de la tarjeta (verde/roja)
 * @access  Private (Admin o Supervisor propietario)
 */
router.patch('/:id/card-status', isAdminOrSupervisor, async (req, res, next) => {
  const { id } = req.params;
  const { card_status } = req.body;

  try {
    // Validar que card_status sea válido
    if (!['green', 'red'].includes(card_status)) {
      return res.status(400).json({ message: 'Estado de tarjeta inválido. Debe ser "green" o "red".' });
    }

    // Obtener andamio actual
    const scaffold = await Scaffold.getById(id);
    if (!scaffold) {
      return res.status(404).json({ message: 'Andamio no encontrado.' });
    }

    // Verificar permisos: admin o supervisor propietario
    if (req.user.role !== 'admin' && scaffold.created_by !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permisos para modificar este andamio.' });
    }

    // No permitir tarjeta verde si está desarmado
    if (card_status === 'green' && scaffold.assembly_status === 'disassembled') {
      return res.status(400).json({ 
        message: 'No puedes cambiar la tarjeta a verde mientras el andamio esté desarmado.' 
      });
    }

    // Guardar estado anterior para historial
    saveScaffoldState(req, id, scaffold);

    // Actualizar estado
    const updated = await Scaffold.updateCardStatus(id, card_status);

    // Obtener información del proyecto para campos denormalizados
    const project = await Project.getById(scaffold.project_id);

    // Registrar en historial con campos denormalizados
    await ScaffoldHistory.create({
      scaffold_id: id,
      user_id: req.user.id,
      change_type: 'card_status',
      previous_data: { card_status: scaffold.card_status },
      new_data: { card_status },
      description: `Tarjeta cambiada de ${scaffold.card_status} a ${card_status}`,
      scaffold_number: scaffold.scaffold_number,
      project_name: project?.name,
      area: scaffold.area,
      tag: scaffold.tag,
    });

    res.json(updated);
  } catch (err) {
    logger.error(`Error al cambiar estado de tarjeta del andamio ${id}: ${err.message}`, err);
    next(err);
  }
});

/**
 * @route   PATCH /api/scaffolds/:id/assembly-status
 * @desc    Cambiar el estado de armado (assembled/disassembled)
 * @access  Private (Admin o Supervisor propietario)
 */
router.patch('/:id/assembly-status', isAdminOrSupervisor, upload.single('disassembly_image'), async (req, res, next) => {
  const { id } = req.params;
  const { assembly_status } = req.body;

  try {
    // Validar que assembly_status sea válido
    if (!['assembled', 'disassembled'].includes(assembly_status)) {
      return res.status(400).json({ message: 'Estado de armado inválido. Debe ser "assembled" o "disassembled".' });
    }

    // Obtener andamio actual
    const scaffold = await Scaffold.getById(id);
    if (!scaffold) {
      return res.status(404).json({ message: 'Andamio no encontrado.' });
    }

    // Verificar permisos
    if (req.user.role !== 'admin' && scaffold.created_by !== req.user.id) {
      return res.status(403).json({ message: 'No tienes permisos para modificar este andamio.' });
    }

    // Si se va a desarmar, requerir imagen
    let disassemblyImageUrl = null;
    if (assembly_status === 'disassembled') {
      if (!req.file) {
        return res.status(400).json({ message: 'Se requiere imagen de desarmado.' });
      }
      disassemblyImageUrl = await uploadFile(req.file);
    }

    // Guardar estado anterior
    saveScaffoldState(req, id, scaffold);

    // Actualizar estado
    const updated = await Scaffold.updateAssemblyStatus(id, assembly_status, disassemblyImageUrl);

    // Obtener información del proyecto para campos denormalizados
    const project = await Project.getById(scaffold.project_id);

    // Registrar en historial con campos denormalizados
    await ScaffoldHistory.create({
      scaffold_id: id,
      user_id: req.user.id,
      change_type: 'assembly_status',
      previous_data: { 
        assembly_status: scaffold.assembly_status,
        card_status: scaffold.card_status,
      },
      new_data: { 
        assembly_status,
        card_status: assembly_status === 'disassembled' ? 'red' : updated.card_status,
        disassembly_image: disassemblyImageUrl,
      },
      description: `Estado cambiado de ${scaffold.assembly_status} a ${assembly_status}`,
      scaffold_number: scaffold.scaffold_number,
      project_name: project?.name,
      area: scaffold.area,
      tag: scaffold.tag,
    });

    res.json(updated);
  } catch (err) {
    logger.error(`Error al cambiar estado de armado del andamio ${id}: ${err.message}`, err);
    next(err);
  }
});

/**
 * @route   PUT /api/scaffolds/:id/disassemble
 * @desc    Desarmar andamio con foto y notas de prueba
 * @access  Private (Admin o Supervisor propietario)
 */
router.put('/:id/disassemble', isAdminOrSupervisor, upload.single('disassembly_image'), async (req, res, next) => {
  const { id } = req.params;
  const { disassembly_notes } = req.body;

  try {
    // Obtener andamio actual
    const scaffold = await Scaffold.getById(id);
    if (!scaffold) {
      return res.status(404).json({ message: 'Andamio no encontrado.' });
    }

    // Verificar que el proyecto esté activo
    const project = await Project.getById(scaffold.project_id);
    if (!project) {
      return res.status(404).json({ message: 'Proyecto no encontrado.' });
    }
    if (!project.active || !project.client_active) {
      return res.status(400).json({ 
        message: 'No se pueden desarmar andamios de un proyecto o cliente desactivado. Los datos históricos están protegidos.' 
      });
    }

    // Verificar permisos para supervisores
    if (req.user.role === 'supervisor') {
      // Un supervisor puede desarmar si:
      // 1. Él creó el andamio, O
      // 2. El andamio pertenece a un proyecto asignado a él
      const isCreator = scaffold.created_by === req.user.id;
      
      if (!isCreator) {
        // Verificar si el andamio pertenece a un proyecto asignado al supervisor (ya tenemos el project)
        const isAssignedToProject = project && project.assigned_supervisor_id === req.user.id;
        
        if (!isAssignedToProject) {
          return res.status(403).json({ 
            message: 'No tienes permisos para modificar este andamio. Solo puedes modificar andamios que tú creaste o que pertenecen a proyectos asignados a ti.' 
          });
        }
      }
    }

    // Requerir imagen de desarmado
    if (!req.file) {
      return res.status(400).json({ message: 'Se requiere imagen de desarmado.' });
    }

    // Subir imagen
    const disassemblyImageUrl = await uploadFile(req.file);

    // Guardar estado anterior
    saveScaffoldState(req, id, scaffold);

    // Actualizar andamio a desarmado con foto y notas
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

    const { rows } = await db.query(query, [disassemblyImageUrl, disassembly_notes || null, id]);
    const updated = rows[0];

    // Registrar en historial con campos denormalizados
    await ScaffoldHistory.create({
      scaffold_id: id,
      user_id: req.user.id,
      change_type: 'disassemble',
      previous_data: { 
        assembly_status: scaffold.assembly_status,
        card_status: scaffold.card_status,
      },
      new_data: { 
        assembly_status: 'disassembled',
        card_status: 'red',
        disassembly_image: disassemblyImageUrl,
        disassembly_notes: disassembly_notes || null,
      },
      description: `Andamio desarmado con pruebas fotográficas`,
      scaffold_number: scaffold.scaffold_number,
      project_name: project.name,
      area: scaffold.area,
      tag: scaffold.tag,
    });

    logger.info(`Andamio ${id} desarmado por usuario ${req.user.id}`);
    res.json(updated);
  } catch (err) {
    logger.error(`Error al desarmar andamio ${id}: ${err.message}`, err);
    next(err);
  }
});

const createScaffoldSchema = Joi.object({
  project_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'El ID del proyecto debe ser un número',
      'number.integer': 'El ID del proyecto debe ser un número entero',
      'number.positive': 'El ID del proyecto debe ser un número positivo',
      'any.required': 'El proyecto es obligatorio'
    }),
  scaffold_number: Joi.string()
    .trim()
    .max(255)
    .allow('', null)
    .messages({
      'string.max': 'El número de andamio no puede exceder 255 caracteres'
    }),
  area: Joi.string()
    .trim()
    .max(255)
    .allow('', null)
    .messages({
      'string.max': 'El área no puede exceder 255 caracteres'
    }),
  tag: Joi.string()
    .trim()
    .max(255)
    .allow('', null)
    .messages({
      'string.max': 'El TAG no puede exceder 255 caracteres'
    }),
  height: Joi.number()
    .positive()
    .max(999.99)
    .required()
    .messages({
      'number.base': 'La altura debe ser un número',
      'number.positive': 'La altura debe ser un número positivo',
      'number.max': 'La altura no puede exceder 999.99 metros',
      'any.required': 'La altura es obligatoria'
    }),
  width: Joi.number()
    .positive()
    .max(999.99)
    .required()
    .messages({
      'number.base': 'El ancho debe ser un número',
      'number.positive': 'El ancho debe ser un número positivo',
      'number.max': 'El ancho no puede exceder 999.99 metros',
      'any.required': 'El ancho es obligatorio'
    }),
  length: Joi.number()
    .positive()
    .max(999.99)
    .required()
    .messages({
      'number.base': 'El largo debe ser un número',
      'number.positive': 'El largo debe ser un número positivo',
      'number.max': 'El largo no puede exceder 999.99 metros',
      'any.required': 'El largo es obligatorio'
    }),
  progress_percentage: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .required()
    .messages({
      'number.base': 'El porcentaje de avance debe ser un número',
      'number.integer': 'El porcentaje de avance debe ser un número entero',
      'number.min': 'El porcentaje de avance debe ser al menos 0',
      'number.max': 'El porcentaje de avance no puede exceder 100',
      'any.required': 'El porcentaje de avance es obligatorio'
    }),
  assembly_notes: Joi.string()
    .trim()
    .max(2000)
    .allow('', null)
    .messages({
      'string.max': 'Las notas de montaje no pueden exceder 2000 caracteres'
    }),
  location: Joi.string()
    .trim()
    .max(500)
    .allow('', null)
    .messages({
      'string.max': 'La ubicación no puede exceder 500 caracteres'
    }),
  observations: Joi.string()
    .trim()
    .max(2000)
    .allow('', null)
    .messages({
      'string.max': 'Las observaciones no pueden exceder 2000 caracteres'
    })
});

// Schema para actualizaciones parciales (estado, tarjeta y porcentaje)
const updateScaffoldStatusSchema = Joi.object({
  assembly_status: Joi.string()
    .valid('assembled', 'in_progress', 'disassembled')
    .optional()
    .messages({
      'any.only': 'El estado de armado debe ser "assembled", "in_progress" o "disassembled"'
    }),
  card_status: Joi.string()
    .valid('green', 'red')
    .optional()
    .messages({
      'any.only': 'El estado de la tarjeta debe ser "green" o "red"'
    }),
  progress_percentage: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.base': 'El porcentaje de avance debe ser un número',
      'number.min': 'El porcentaje de avance debe ser al menos 0',
      'number.max': 'El porcentaje de avance no puede ser mayor a 100'
    })
}).or('assembly_status', 'card_status', 'progress_percentage') // Al menos uno debe estar presente
  .custom((value, helpers) => {
    // Validación: Un andamio desarmado NO puede tener tarjeta verde
    if (value.assembly_status === 'disassembled' && value.card_status === 'green') {
      return helpers.error('custom.disassembledGreen');
    }
    return value;
  }, 'Validación de consistencia de estados')
  .messages({
    'custom.disassembledGreen': 'Un andamio desarmado no puede tener tarjeta verde. Debe tener tarjeta roja.'
  });

/**
 * @route   POST /api/scaffolds
 * @desc    Crear un nuevo andamio
 * @access  Private (Supervisor/Admin)
 * Cambio de paradigma: crear andamio persistente, no reporte
 */
router.post('/', isAdminOrSupervisor, upload.single('assembly_image'), async (req, res, next) => {
  try {
    // Validar que se haya subido la imagen de montaje (obligatoria)
    if (!req.file) {
      return res.status(400).json({ message: 'La imagen de montaje es obligatoria.' });
    }

    const validatedData = await createScaffoldSchema.validateAsync(req.body);

    // Verificar que el proyecto esté activo
    const project = await Project.getById(validatedData.project_id);
    if (!project) {
      return res.status(404).json({ message: 'Proyecto no encontrado.' });
    }
    if (!project.active || !project.client_active) {
      return res.status(400).json({ 
        message: 'No se pueden crear andamios en un proyecto o cliente desactivado. Los datos históricos están protegidos.' 
      });
    }

    // Subir imagen a GCS
    const assemblyImageUrl = await uploadFile(req.file);

    const {
      project_id,
      scaffold_number,
      area,
      tag,
      height,
      width,
      length,
      progress_percentage,
      assembly_notes,
      location,
      observations,
    } = validatedData;

    // Calcular metros cúbicos
    const cubic_meters = parseFloat(height) * parseFloat(width) * parseFloat(length);

    // Determinar assembly_status basado en progress_percentage
    let assembly_status = 'disassembled';
    let card_status = 'red';
    
    if (progress_percentage !== undefined && progress_percentage !== null) {
      if (progress_percentage === 100) {
        assembly_status = 'assembled';
        card_status = 'green';
      } else if (progress_percentage > 0 && progress_percentage < 100) {
        assembly_status = 'in_progress';
        card_status = 'red';
      } else {
        assembly_status = 'disassembled';
        card_status = 'red';
      }
    }

    // Crear andamio usando el modelo
    const scaffold = await Scaffold.create({
      project_id,
      user_id: req.user.id,
      scaffold_number,
      area,
      tag,
      height,
      width,
      length,
      cubic_meters,
      progress_percentage: progress_percentage || 0,
      assembly_notes,
      location,
      observations,
      assembly_image_url: assemblyImageUrl,
      card_status,
      assembly_status,
    });

    // Registrar creación en historial con datos denormalizados
    await ScaffoldHistory.create({
      scaffold_id: scaffold.id,
      user_id: req.user.id,
      change_type: 'create',
      previous_data: {},
      new_data: scaffold,
      description: 'Andamio creado',
      scaffold_number: scaffold.scaffold_number,
      project_name: project.name,
      area: scaffold.area,
      tag: scaffold.tag,
    });

    logger.info(`Andamio ${scaffold.id} creado por usuario ${req.user.id}`);
    res.status(201).json(scaffold);
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: err.details[0].message });
    }
    logger.error(`Error al crear un nuevo andamio: ${err.message}`, err);
    next(err);
  }
});

/**
 * @route   PUT /api/scaffolds/:id
 * @desc    Actualizar un andamio completo
 * @access  Private (Admin o Supervisor propietario)
 */
router.put('/:id', isAdminOrSupervisor, async (req, res, next) => {
  const { id } = req.params;

  try {
    // Obtener andamio actual
    const scaffold = await Scaffold.getById(id);
    if (!scaffold) {
      return res.status(404).json({ message: 'Andamio no encontrado.' });
    }

    // Verificar que el proyecto esté activo
    const project = await Project.getById(scaffold.project_id);
    if (!project) {
      return res.status(404).json({ message: 'Proyecto no encontrado.' });
    }
    if (!project.active || !project.client_active) {
      return res.status(400).json({ 
        message: 'No se pueden editar andamios de un proyecto o cliente desactivado. Los datos históricos están protegidos.' 
      });
    }

    // Verificar permisos para supervisores
    if (req.user.role === 'supervisor') {
      // Un supervisor puede editar si:
      // 1. Él creó el andamio, O
      // 2. El andamio pertenece a un proyecto asignado a él
      const isCreator = scaffold.created_by === req.user.id;
      
      if (!isCreator) {
        // Verificar si el andamio pertenece a un proyecto asignado al supervisor (ya tenemos el project)
        const isAssignedToProject = project && project.assigned_supervisor_id === req.user.id;
        
        if (!isAssignedToProject) {
          return res.status(403).json({ 
            message: 'No tienes permisos para editar este andamio. Solo puedes editar andamios que tú creaste o que pertenecen a proyectos asignados a ti.' 
          });
        }
      }
    }

    // Determinar si es actualización de estado o completa
    const isStatusUpdate = (req.body.assembly_status || req.body.card_status || req.body.progress_percentage !== undefined) && 
                          !req.body.project_id && 
                          !req.body.height;

    let validatedData;
    let dataToUpdate;

    if (isStatusUpdate) {
      // Actualización de estado solamente
      validatedData = await updateScaffoldStatusSchema.validateAsync(req.body);
      
      // ============================================
      // VALIDACIONES Y SINCRONIZACIÓN AUTOMÁTICA
      // ============================================
      
      // 0. VALIDACIÓN CRÍTICA: No permitir modificar andamios desarmados
      // Los andamios desarmados son registros históricos inmutables
      if (scaffold.assembly_status === 'disassembled') {
        // Verificar si intenta cambiar el estado a algo diferente de desarmado
        if (validatedData.assembly_status && validatedData.assembly_status !== 'disassembled') {
          return res.status(400).json({
            error: 'No puedes rearmar un andamio que ya fue desarmado. Los andamios desarmados son registros históricos y no pueden volver a armarse. Si necesitas un nuevo andamio en la misma ubicación, crea uno nuevo.'
          });
        }
        
        // Verificar si intenta cambiar el porcentaje a más de 0
        if (validatedData.progress_percentage !== undefined && validatedData.progress_percentage > 0) {
          return res.status(400).json({
            error: 'No puedes cambiar el porcentaje de avance de un andamio desarmado. Los andamios desarmados permanecen en 0% como registro histórico.'
          });
        }
        
        // Si intenta cambiar el estado de tarjeta (solo permitir mantenerlo en rojo)
        if (validatedData.card_status && validatedData.card_status !== 'red') {
          return res.status(400).json({
            error: 'Los andamios desarmados deben mantener tarjeta roja como registro de seguridad.'
          });
        }
      }
      
      // 1. Validar que el porcentaje no retroceda
      if (validatedData.progress_percentage !== undefined && validatedData.progress_percentage < scaffold.progress_percentage) {
        return res.status(400).json({ 
          error: `El porcentaje de avance no puede retroceder de ${scaffold.progress_percentage}% a ${validatedData.progress_percentage}%. Use el estado "desarmado" para indicar que el andamio ya no está en uso.` 
        });
      }
      
      // 2. Sincronización automática: Porcentaje → Estado
      if (validatedData.progress_percentage !== undefined) {
        if (validatedData.progress_percentage === 0) {
          validatedData.assembly_status = 'disassembled';
          validatedData.card_status = 'red'; // Desarmado siempre con tarjeta roja
        } else if (validatedData.progress_percentage === 100) {
          validatedData.assembly_status = 'assembled';
        } else {
          validatedData.assembly_status = 'in_progress';
        }
      }
      
      // 3. Sincronización automática: Estado → Porcentaje
      if (validatedData.assembly_status && validatedData.progress_percentage === undefined) {
        if (validatedData.assembly_status === 'assembled') {
          // Si marca como armado, primero pasar a 100%
          validatedData.progress_percentage = 100;
        } else if (validatedData.assembly_status === 'disassembled') {
          // Si marca como desarmado, establecer en 0%
          validatedData.progress_percentage = 0;
          validatedData.card_status = 'red';
        }
        // Si marca como 'in_progress', mantener porcentaje actual (no cambiar)
      }
      
      // 4. Regla: Andamio desarmado o en proceso no puede tener tarjeta verde
      if (validatedData.card_status === 'green' && 
          (validatedData.assembly_status === 'disassembled' || 
           validatedData.assembly_status === 'in_progress')) {
        return res.status(400).json({ 
          error: 'Solo un andamio completamente armado (100%) puede tener tarjeta verde.' 
        });
      }
      
      // 5. Forzar tarjeta roja si está desarmado
      if (validatedData.assembly_status === 'disassembled') {
        validatedData.card_status = 'red';
      }
      
      dataToUpdate = validatedData;
    } else {
      // Actualización completa
      validatedData = await createScaffoldSchema.validateAsync(req.body);
      
      // Recalcular metros cúbicos si cambió alguna dimensión
      const cubic_meters = parseFloat(validatedData.height) * 
                           parseFloat(validatedData.width) * 
                           parseFloat(validatedData.length);
      
      dataToUpdate = {
        ...validatedData,
        cubic_meters,
      };
    }

    // Guardar estado anterior para historial
    saveScaffoldState(req, id, scaffold);

    // Actualizar
    const updated = await Scaffold.update(id, dataToUpdate);

    // Registrar en historial con campos denormalizados (reutilizar variable project ya cargada)
    await ScaffoldHistory.createFromChanges(id, req.user.id, scaffold, updated, {
      scaffold_number: scaffold.scaffold_number,
      project_name: project?.name,
      area: scaffold.area,
      tag: scaffold.tag,
    });

    logger.info(`Andamio ${id} actualizado por usuario ${req.user.id}`);
    res.json(updated);
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: err.details[0].message });
    }
    logger.error(`Error al actualizar andamio ${id}: ${err.message}`, err);
    next(err);
  }
});

/**
 * @route   GET /api/scaffolds/my-scaffolds
 * @desc    Obtener andamios creados por el supervisor logueado
 * @access  Private (Supervisor)
 */
router.get('/my-scaffolds', isSupervisor, async (req, res, next) => {
  const userId = req.user.id;
  try {
    const scaffolds = await Scaffold.getByCreator(userId);
    res.json(scaffolds);
  } catch (err) {
    logger.error(`Error al obtener andamios del supervisor ${userId}: ${err.message}`, err);
    next(err);
  }
});

/**
 * @route   DELETE /api/scaffolds/:id
 * @desc    Eliminar un andamio y su historial (solo admin)
 * @access  Private (Admin)
 */
router.delete('/:id', isAdmin, async (req, res, next) => {
  const { id } = req.params;

  try {
    // El middleware isAdmin ya verificó que es admin, esto es redundante pero lo dejamos por seguridad
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'No tienes permisos para eliminar reportes de andamios' 
      });
    }

    // Verificar si el andamio existe y obtener información completa
    const scaffold = await Scaffold.getById(id);

    if (!scaffold) {
      return res.status(404).json({ message: 'Andamio no encontrado' });
    }

    // Obtener información del proyecto para registrar en historial
    const project = await Project.getById(scaffold.project_id);

    // Registrar eliminación en historial ANTES de eliminar
    await ScaffoldHistory.create({
      scaffold_id: id,
      user_id: req.user.id,
      change_type: 'delete',
      previous_data: scaffold,
      new_data: {},
      description: 'Andamio eliminado del sistema',
      scaffold_number: scaffold.scaffold_number,
      project_name: project?.name,
      area: scaffold.area,
      tag: scaffold.tag,
    });

    // Función auxiliar para eliminar imagen si existe
    const deleteImageFile = async (imageUrl) => {
      if (!imageUrl) return;
      
      try {
        let filename;
        
        // Si es una URL completa (http://... o https://...)
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          // Si es de Google Cloud Storage, no intentar eliminar localmente
          if (imageUrl.includes('storage.googleapis.com')) {
            logger.info(`Imagen en GCS, no se elimina localmente: ${imageUrl}`);
            return;
          }
          
          // Si es URL local, extraer solo el nombre del archivo
          // Ejemplo: http://192.168.1.7:5000/uploads/1767639773039.jpg -> 1767639773039.jpg
          const urlParts = imageUrl.split('/uploads/');
          if (urlParts.length > 1) {
            filename = urlParts[1];
          } else {
            logger.warn(`No se pudo extraer filename de URL: ${imageUrl}`);
            return;
          }
        } else {
          // Si es un path relativo (/uploads/filename.jpg)
          filename = imageUrl.replace(/^\/uploads\//, '');
        }
        
        const fullPath = path.join(__dirname, '../../uploads', filename);
        
        // Verificar si el archivo existe antes de intentar eliminarlo
        await fs.access(fullPath);
        await fs.unlink(fullPath);
        logger.info(`Imagen eliminada: ${fullPath}`);
      } catch (err) {
        // Si el archivo no existe o hay error, solo logueamos pero no fallamos la operación
        logger.warn(`No se pudo eliminar la imagen ${imageUrl}: ${err.message}`);
      }
    };

    // Eliminar las imágenes del servidor
    await Promise.all([
      deleteImageFile(scaffold.assembly_image_url),
      deleteImageFile(scaffold.disassembly_image_url)
    ]);

    // Eliminar el andamio de la base de datos
    await db.query('DELETE FROM scaffolds WHERE id = $1', [id]);

    logger.info(`Andamio con ID ${id} eliminado por admin ${req.user.id}`);
    res.json({ message: 'Reporte de andamio e imágenes eliminadas correctamente' });
  } catch (err) {
    logger.error(
      `Error al eliminar el andamio con ID ${id}: ${err.message}`,
      err,
    );
    next(err);
  }
});

module.exports = router;