const express = require('express');
const router = express.Router();
const ClientNotesController = require('../controllers/clientNotes.controller');
const { authMiddleware: authenticate } = require('../middleware/auth');
const { isClient, isAdminOrSupervisor, checkClientNoteAccess, isAdmin } = require('../middleware/roles');
const { validateRequest } = require('../middleware/validate');
const {
  createClientNoteSchema,
  updateClientNoteSchema,
  resolveClientNoteSchema,
  listClientNotesQuerySchema
} = require('../validation/clientNotes.schema');

/**
 * Rutas para el sistema de notas de clientes
 * Base path: /api/client-notes
 */

/**
 * @route POST /api/client-notes
 * @desc Crear una nueva nota de cliente
 * @access Client only
 */
router.post(
  '/',
  authenticate,
  isClient,
  validateRequest(createClientNoteSchema, 'body'),
  ClientNotesController.createNote
);

/**
 * @route GET /api/client-notes/my-notes
 * @desc Obtener las notas del cliente autenticado
 * @access Client only
 */
router.get(
  '/my-notes',
  authenticate,
  isClient,
  validateRequest(listClientNotesQuerySchema, 'query'),
  ClientNotesController.getMyNotes
);

/**
 * @route PUT /api/client-notes/:noteId
 * @desc Actualizar una nota (validación de acceso)
 * @access Client (autor de la nota)
 */
router.put(
  '/:noteId',
  authenticate,
  checkClientNoteAccess,
  validateRequest(updateClientNoteSchema, 'body'),
  ClientNotesController.updateNote
);

/**
 * @route PUT /api/client-notes/:noteId/resolve
 * @desc Marcar nota como resuelta
 * @access Supervisor o Admin (validación de acceso a proyecto)
 */
router.put(
  '/:noteId/resolve',
  authenticate,
  checkClientNoteAccess,
  isAdminOrSupervisor,
  validateRequest(resolveClientNoteSchema, 'body'),
  ClientNotesController.resolveNote
);

/**
 * @route PUT /api/client-notes/:noteId/reopen
 * @desc Reabrir una nota resuelta
 * @access Client (autor de la nota)
 */
router.put(
  '/:noteId/reopen',
  authenticate,
  checkClientNoteAccess,
  ClientNotesController.reopenNote
);

/**
 * @route DELETE /api/client-notes/:noteId
 * @desc Eliminar una nota
 * @access Admin only (validación de acceso)
 */
router.delete(
  '/:noteId',
  authenticate,
  checkClientNoteAccess,
  isAdmin,
  ClientNotesController.deleteNote
);

module.exports = router;
