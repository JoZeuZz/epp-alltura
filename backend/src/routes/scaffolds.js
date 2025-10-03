const express = require('express');
const router = express.Router();
const Joi = require('joi');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const { uploadFile } = require('../lib/googleCloud');
const logger = require('../lib/logger');

// Multer config for in-memory storage
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

router.use(authMiddleware); // Proteger todas las rutas de andamios

/**
 * @route   GET /api/scaffolds/project/:projectId
 * @desc    Obtener todos los andamios de un proyecto específico
 * @access  Private
 */
router.get('/project/:projectId', async (req, res, next) => {
  const { projectId } = req.params;
  try {
    const query = `
      SELECT s.*, u.name as user_name 
      FROM scaffolds s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.project_id = $1 ORDER BY s.assembly_created_at DESC`;
    const { rows } = await db.query(query, [projectId]);
    res.json(rows);
  } catch (err) {
    logger.error(
      `Error al obtener los andamios del proyecto con ID ${projectId}: ${err.message}`,
      err,
    );
    next(err);
  }
});

const createScaffoldSchema = Joi.object({
  project_id: Joi.number().integer().positive().required(),
  height: Joi.number().positive().required(),
  width: Joi.number().positive().required(),
  depth: Joi.number().positive().required(),
  progress_percentage: Joi.number().integer().min(0).max(100).required(),
  assembly_notes: Joi.string().trim().allow('').max(1000),
});

/**
 * @route   POST /api/scaffolds
 * @desc    Crear un nuevo reporte de andamio (montaje)
 * @access  Private (Technician/Admin)
 */
router.post('/', upload.single('assembly_image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'El archivo de imagen es requerido.' });
    }

    const validatedData = await createScaffoldSchema.validateAsync(req.body);

    // Subir imagen a GCS
    const imageUrl = await uploadFile(req.file);

    const {
      project_id,
      height,
      width,
      depth,
      progress_percentage,
      assembly_notes,
    } = validatedData;
    const user_id = req.user.id;

    // Calcular metros cúbicos
    const cubic_meters = parseFloat(height) * parseFloat(width) * parseFloat(depth);

    const query = `
      INSERT INTO scaffolds 
        (project_id, user_id, height, width, depth, cubic_meters, progress_percentage, assembly_notes, assembly_image_url)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      project_id,
      user_id,
      height,
      width,
      depth,
      cubic_meters,
      progress_percentage,
      assembly_notes,
      imageUrl,
    ];

    const { rows } = await db.query(query, values);

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: err.details[0].message });
    }
    logger.error(`Error al crear un nuevo andamio: ${err.message}`, err);
    next(err);
  }
});

const disassembleScaffoldSchema = Joi.object({
  disassembly_notes: Joi.string().trim().allow('').max(1000),
});

/**
 * @route   PUT /api/scaffolds/:id/disassemble
 * @desc    Marcar un andamio como desarmado
 * @access  Private (Technician/Admin)
 */
router.put('/:id/disassemble', upload.single('disassembly_image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'La imagen de prueba del desmontaje es requerida.' });
    }

    const validatedData = await disassembleScaffoldSchema.validateAsync(req.body);

    // Subir imagen a GCS
    const imageUrl = await uploadFile(req.file);

    const { disassembly_notes } = validatedData;
    const { id } = req.params;

    const query = `
      UPDATE scaffolds
      SET 
        status = 'disassembled',
        disassembly_notes = $1,
        disassembly_image_url = $2,
        disassembled_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const { rows } = await db.query(query, [disassembly_notes, imageUrl, id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Andamio no encontrado.' });
    }

    res.json(rows[0]);
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: err.details[0].message });
    }
    logger.error(`Error al desmontar el andamio con ID ${req.params.id}: ${err.message}`, err);
    next(err);
  }
});

/**
 * @route   GET /api/scaffolds/my-history
 * @desc    Obtener el historial de andamios del técnico logueado
 * @access  Private (Technician)
 */
router.get('/my-history', async (req, res) => {
  const userId = req.user.id;
  try {
    const query = `
      SELECT 
        s.*, 
        p.name as project_name 
      FROM scaffolds s
      JOIN projects p ON s.project_id = p.id
      WHERE s.user_id = $1 
      ORDER BY s.assembly_created_at DESC
    `;
    const { rows } = await db.query(query, [userId]);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;