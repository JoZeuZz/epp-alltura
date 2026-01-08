const ScaffoldService = require('../services/scaffolds.service');
const { logger } = require('../lib/logger');

/**
 * ScaffoldController
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
class ScaffoldController {
  /**
   * Obtener todos los andamios (filtrado por rol del usuario)
   * @route GET /api/scaffolds
   */
  static async getAllScaffolds(req, res, next) {
    try {
      const scaffolds = await ScaffoldService.getScaffoldsByRole(req.user);
      res.json(scaffolds);
    } catch (err) {
      logger.error(`Error al obtener andamios: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * Obtener andamios de un proyecto específico
   * @route GET /api/scaffolds/project/:projectId
   */
  static async getScaffoldsByProject(req, res, next) {
    try {
      const { projectId } = req.params;
      const scaffolds = await ScaffoldService.getScaffoldsByProject(parseInt(projectId));
      res.json(scaffolds);
    } catch (err) {
      logger.error(`Error al obtener andamios del proyecto: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * Obtener un andamio específico por ID
   * @route GET /api/scaffolds/:id
   */
  static async getScaffoldById(req, res, next) {
    try {
      const { id } = req.params;
      const scaffold = await ScaffoldService.getScaffoldById(parseInt(id));

      if (!scaffold) {
        return res.status(404).json({ message: 'Andamio no encontrado.' });
      }

      res.json(scaffold);
    } catch (err) {
      logger.error(`Error al obtener andamio: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * Obtener andamios creados por el supervisor actual
   * @route GET /api/scaffolds/my-scaffolds
   */
  static async getMyScaffolds(req, res, next) {
    try {
      const scaffolds = await ScaffoldService.getScaffoldsByCreator(req.user.id);
      res.json(scaffolds);
    } catch (err) {
      logger.error(`Error al obtener andamios del supervisor: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * Obtener historial de cambios del usuario actual
   * @route GET /api/scaffolds/my-history
   */
  static async getMyHistory(req, res, next) {
    try {
      const history = await ScaffoldService.getUserHistory(req.user.id);
      res.json(history);
    } catch (err) {
      logger.error(`Error al obtener historial del usuario: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * Obtener historial de un usuario específico (solo admin)
   * @route GET /api/scaffolds/user-history/:userId
   */
  static async getUserHistory(req, res, next) {
    try {
      const { userId } = req.params;
      const history = await ScaffoldService.getUserHistory(parseInt(userId));
      res.json(history);
    } catch (err) {
      logger.error(`Error al obtener historial del usuario: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * Obtener historial de cambios de un andamio
   * @route GET /api/scaffolds/:id/history
   */
  static async getScaffoldHistory(req, res, next) {
    try {
      const { id } = req.params;
      const history = await ScaffoldService.getScaffoldHistory(parseInt(id));
      res.json(history);
    } catch (err) {
      logger.error(`Error al obtener historial del andamio: ${err.message}`, err);
      next(err);
    }
  }

  /**
   * Crear un nuevo andamio
   * @route POST /api/scaffolds
   */
  static async createScaffold(req, res, next) {
    try {
      const scaffoldData = req.body;
      const user = req.user;
      const imageFile = req.file; // Multer file

      const scaffold = await ScaffoldService.createScaffold(scaffoldData, user, imageFile);
      res.status(201).json(scaffold);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      logger.error(`Error al crear andamio: ${err.message}`, err);

      if (statusCode < 500) {
        return res.status(statusCode).json({ message: err.message });
      }
      next(err);
    }
  }

  /**
   * Actualizar un andamio existente
   * @route PUT /api/scaffolds/:id
   */
  static async updateScaffold(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const user = req.user;

      const updated = await ScaffoldService.updateScaffold(parseInt(id), updateData, user);
      res.json(updated);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      logger.error(`Error al actualizar andamio: ${err.message}`, err);

      if (statusCode < 500) {
        return res.status(statusCode).json({ error: err.message });
      }
      next(err);
    }
  }

  /**
   * Cambiar estado de tarjeta (verde/roja)
   * @route PATCH /api/scaffolds/:id/card-status
   */
  static async updateCardStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { card_status } = req.body;
      const user = req.user;

      // Validación básica de entrada
      if (!['green', 'red'].includes(card_status)) {
        return res.status(400).json({
          message: 'Estado de tarjeta inválido. Debe ser "green" o "red".',
        });
      }

      const updated = await ScaffoldService.updateCardStatus(parseInt(id), card_status, user);
      res.json(updated);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      logger.error(`Error al cambiar estado de tarjeta: ${err.message}`, err);

      if (statusCode < 500) {
        return res.status(statusCode).json({ message: err.message });
      }
      next(err);
    }
  }

  /**
   * Cambiar estado de armado (assembled/disassembled)
   * @route PATCH /api/scaffolds/:id/assembly-status
   */
  static async updateAssemblyStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { assembly_status } = req.body;
      const user = req.user;
      const imageFile = req.file; // Multer file (opcional)

      // Validación básica de entrada
      if (!['assembled', 'disassembled'].includes(assembly_status)) {
        return res.status(400).json({
          message: 'Estado de armado inválido. Debe ser "assembled" o "disassembled".',
        });
      }

      const updated = await ScaffoldService.updateAssemblyStatus(
        parseInt(id),
        assembly_status,
        user,
        imageFile
      );

      res.json(updated);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      logger.error(`Error al cambiar estado de armado: ${err.message}`, err);

      if (statusCode < 500) {
        return res.status(statusCode).json({ message: err.message });
      }
      next(err);
    }
  }

  /**
   * Desarmar andamio con foto y notas de prueba
   * @route PUT /api/scaffolds/:id/disassemble
   */
  static async disassembleScaffold(req, res, next) {
    try {
      const { id } = req.params;
      const { disassembly_notes } = req.body;
      const user = req.user;
      const imageFile = req.file; // Multer file

      const updated = await ScaffoldService.disassembleScaffold(
        parseInt(id),
        user,
        imageFile,
        disassembly_notes
      );

      res.json(updated);
    } catch (err) {
      const statusCode = err.statusCode || 500;
      logger.error(`Error al desarmar andamio: ${err.message}`, err);

      if (statusCode < 500) {
        return res.status(statusCode).json({ message: err.message });
      }
      next(err);
    }
  }

  /**
   * Eliminar un andamio permanentemente (solo admin)
   * @route DELETE /api/scaffolds/:id
   */
  static async deleteScaffold(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;

      await ScaffoldService.deleteScaffold(parseInt(id), user);
      res.json({ message: 'Reporte de andamio e imágenes eliminadas correctamente' });
    } catch (err) {
      const statusCode = err.statusCode || 500;
      logger.error(`Error al eliminar andamio: ${err.message}`, err);

      if (statusCode < 500) {
        return res.status(statusCode).json({ message: err.message });
      }
      next(err);
    }
  }
}

module.exports = ScaffoldController;
