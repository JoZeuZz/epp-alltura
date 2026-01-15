const { logAudit, AuditEvents } = require('../lib/auditLogger');

/**
 * Middleware para verificar si un usuario tiene rol de administrador
 */
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    logAudit(AuditEvents.FORBIDDEN_ACCESS, req.user?.id || 'anonymous', {
      path: req.path,
      method: req.method,
      requiredRole: 'admin',
      actualRole: req.user?.role,
    });
    res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
  }
};

/**
 * Middleware para verificar si un usuario tiene rol de supervisor
 * Actualizado: antes era 'technician', ahora es 'supervisor'
 */
const isSupervisor = (req, res, next) => {
  if (req.user && req.user.role === 'supervisor') {
    next();
  } else {
    logAudit(AuditEvents.FORBIDDEN_ACCESS, req.user?.id || 'anonymous', {
      path: req.path,
      method: req.method,
      requiredRole: 'supervisor',
      actualRole: req.user?.role,
    });
    res.status(403).json({ message: 'Acceso denegado. Se requiere rol de supervisor.' });
  }
};

/**
 * Middleware para verificar si un usuario tiene rol de cliente
 * Nuevo: permite login de usuarios tipo client
 */
const isClient = (req, res, next) => {
  if (req.user && req.user.role === 'client') {
    next();
  } else {
    logAudit(AuditEvents.FORBIDDEN_ACCESS, req.user?.id || 'anonymous', {
      path: req.path,
      method: req.method,
      requiredRole: 'client',
      actualRole: req.user?.role,
    });
    res.status(403).json({ message: 'Acceso denegado. Se requiere rol de cliente.' });
  }
};

/**
 * Middleware para verificar si un usuario tiene un rol específico
 */
const requireRole = (role) => {
  return (req, res, next) => {
    if (req.user && req.user.role === role) {
      next();
    } else {
      logAudit(AuditEvents.FORBIDDEN_ACCESS, req.user?.id || 'anonymous', {
        path: req.path,
        method: req.method,
        requiredRole: role,
        actualRole: req.user?.role,
      });
      res.status(403).json({ message: `Acceso denegado. Se requiere rol: ${role}.` });
    }
  };
};

/**
 * Middleware para verificar si un usuario tiene alguno de los roles especificados
 * Nuevo: permite verificar múltiples roles
 * @param {Array<string>} roles - Array de roles permitidos (ej: ['admin', 'supervisor'])
 */
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado.' });
    }

    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ 
        message: `Acceso denegado. Se requiere uno de los siguientes roles: ${roles.join(', ')}.` 
      });
    }
  };
};

/**
 * Middleware para verificar si un usuario es admin o supervisor
 * Útil para endpoints que ambos roles pueden acceder
 */
const isAdminOrSupervisor = checkRole(['admin', 'supervisor']);

/**
 * Middleware para verificar propiedad de un recurso
 * Verifica que el usuario sea el creador del recurso o sea admin
 * @param {string} resourceUserIdField - Nombre del campo que contiene el user_id del recurso (ej: 'created_by')
 */
const checkOwnership = (resourceUserIdField = 'created_by') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado.' });
    }

    // Admin siempre puede acceder
    if (req.user.role === 'admin') {
      return next();
    }

    // Guardar el campo para verificación posterior en el controlador
    req.ownershipField = resourceUserIdField;
    next();
  };
};

/**
 * Middleware para verificar que un supervisor solo edite sus propios andamios
 * Se usa después de obtener el recurso de la BD
 */
const verifySupervisorOwnership = (resource) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado.' });
    }

    // Admin siempre puede editar
    if (req.user.role === 'admin') {
      return next();
    }

    // Supervisor solo puede editar sus propios recursos
    if (req.user.role === 'supervisor') {
      if (resource && resource.created_by === req.user.id) {
        return next();
      } else {
        return res.status(403).json({ 
          message: 'Acceso denegado. Solo puedes editar andamios que tú mismo creaste.' 
        });
      }
    }

    // Clientes no pueden editar
    return res.status(403).json({ 
      message: 'Acceso denegado. Los clientes no tienen permisos de edición.' 
    });
  };
};

/**
 * MIDDLEWARES DE AUTORIZACIÓN POR RECURSOS
 * Validan acceso específico a proyectos, andamios y notas según asignación
 */

const Project = require('../models/project');
const Scaffold = require('../models/scaffold');
const db = require('../db');
const { logger } = require('../lib/logger');

/**
 * Middleware: Validar acceso a un proyecto específico
 * Reglas:
 * - Admin: acceso total
 * - Supervisor: solo proyectos donde está asignado
 * - Client: solo proyectos de su empresa
 */
async function checkProjectAccess(req, res, next) {
  try {
    const projectId = parseInt(req.params.id || req.params.projectId);
    const user = req.user;

    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({ error: 'ID de proyecto inválido' });
    }

    // Admin tiene acceso total
    if (user.role === 'admin') {
      return next();
    }

    // Obtener proyecto
    const project = await Project.getById(projectId);
    
    if (!project) {
      logger.warn('Intento de acceso a proyecto inexistente', {
        userId: user.id,
        userRole: user.role,
        projectId,
        ip: req.ip
      });
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    // Validar acceso según rol
    if (user.role === 'supervisor') {
      if (project.assigned_supervisor_id !== user.id) {
        logger.warn('Intento de acceso no autorizado a proyecto', {
          userId: user.id,
          userRole: user.role,
          projectId,
          assignedSupervisor: project.assigned_supervisor_id,
          ip: req.ip
        });
        return res.status(403).json({ 
          error: 'No tienes acceso a este proyecto' 
        });
      }
    } else if (user.role === 'client') {
      // Cliente debe pertenecer a la misma empresa del proyecto
      const { rows } = await db.query(
        'SELECT id FROM projects WHERE id = $1 AND client_id = (SELECT client_id FROM users WHERE id = $2)',
        [projectId, user.id]
      );
      
      if (rows.length === 0) {
        logger.warn('Intento de acceso no autorizado a proyecto por cliente', {
          userId: user.id,
          userRole: user.role,
          projectId,
          ip: req.ip
        });
        return res.status(403).json({ 
          error: 'No tienes acceso a este proyecto' 
        });
      }
    } else {
      return res.status(403).json({ error: 'Rol no autorizado' });
    }

    next();
  } catch (error) {
    logger.error('Error en checkProjectAccess middleware', {
      error: error.message,
      userId: req.user?.id,
      projectId: req.params.id || req.params.projectId
    });
    return res.status(500).json({ error: 'Error al validar acceso al proyecto' });
  }
}

/**
 * Middleware: Validar acceso a un andamio específico
 * Reglas:
 * - Admin: acceso total
 * - Supervisor: solo andamios de proyectos asignados (puede editar TODOS los andamios del proyecto)
 * - Client: solo andamios de proyectos de su empresa
 */
async function checkScaffoldAccess(req, res, next) {
  try {
    const scaffoldId = parseInt(req.params.id || req.params.scaffoldId);
    const user = req.user;

    if (!scaffoldId || isNaN(scaffoldId)) {
      return res.status(400).json({ error: 'ID de andamio inválido' });
    }

    // Admin tiene acceso total
    if (user.role === 'admin') {
      return next();
    }

    // Obtener andamio con información del proyecto
    const scaffold = await Scaffold.getById(scaffoldId);
    
    if (!scaffold) {
      logger.warn('Intento de acceso a andamio inexistente', {
        userId: user.id,
        userRole: user.role,
        scaffoldId,
        ip: req.ip
      });
      return res.status(404).json({ error: 'Andamio no encontrado' });
    }

    // Validar acceso según rol
    if (user.role === 'supervisor') {
      // Supervisor debe estar asignado al proyecto del andamio
      const project = await Project.getById(scaffold.project_id);
      
      if (!project || project.assigned_supervisor_id !== user.id) {
        logger.warn('Intento de acceso no autorizado a andamio', {
          userId: user.id,
          userRole: user.role,
          scaffoldId,
          projectId: scaffold.project_id,
          assignedSupervisor: project?.assigned_supervisor_id,
          ip: req.ip
        });
        return res.status(403).json({ 
          error: 'No tienes acceso a este andamio' 
        });
      }
    } else if (user.role === 'client') {
      // Cliente debe pertenecer a la empresa del proyecto del andamio
      const { rows } = await db.query(
        `SELECT s.id 
         FROM scaffolds s
         JOIN projects p ON s.project_id = p.id
         WHERE s.id = $1 AND p.client_id = (SELECT client_id FROM users WHERE id = $2)`,
        [scaffoldId, user.id]
      );
      
      if (rows.length === 0) {
        logger.warn('Intento de acceso no autorizado a andamio por cliente', {
          userId: user.id,
          userRole: user.role,
          scaffoldId,
          ip: req.ip
        });
        return res.status(403).json({ 
          error: 'No tienes acceso a este andamio' 
        });
      }
    } else {
      return res.status(403).json({ error: 'Rol no autorizado' });
    }

    next();
  } catch (error) {
    logger.error('Error en checkScaffoldAccess middleware', {
      error: error.message,
      userId: req.user?.id,
      scaffoldId: req.params.id || req.params.scaffoldId
    });
    return res.status(500).json({ error: 'Error al validar acceso al andamio' });
  }
}

/**
 * Middleware: Validar acceso a una nota de cliente
 * Reglas:
 * - Admin: acceso total
 * - Supervisor: solo notas de proyectos asignados
 * - Client: solo notas que ellos crearon
 */
async function checkClientNoteAccess(req, res, next) {
  try {
    const noteId = parseInt(req.params.id || req.params.noteId);
    const user = req.user;

    if (!noteId || isNaN(noteId)) {
      return res.status(400).json({ error: 'ID de nota inválido' });
    }

    // Admin tiene acceso total
    if (user.role === 'admin') {
      return next();
    }

    // Obtener nota con información del proyecto
    const { rows } = await db.query(
      `SELECT cn.*, 
              s.project_id as scaffold_project_id,
              COALESCE(p.assigned_supervisor_id, p2.assigned_supervisor_id) as assigned_supervisor_id,
              COALESCE(p.client_id, p2.client_id) as client_id
       FROM client_notes cn
       LEFT JOIN scaffolds s ON cn.scaffold_id = s.id
       LEFT JOIN projects p ON cn.project_id = p.id
       LEFT JOIN projects p2 ON s.project_id = p2.id
       WHERE cn.id = $1`,
      [noteId]
    );
    
    if (rows.length === 0) {
      logger.warn('Intento de acceso a nota inexistente', {
        userId: user.id,
        userRole: user.role,
        noteId,
        ip: req.ip
      });
      return res.status(404).json({ error: 'Nota no encontrada' });
    }

    const note = rows[0];
    
    // Validar acceso según rol
    if (user.role === 'supervisor') {
      if (note.assigned_supervisor_id !== user.id) {
        logger.warn('Intento de acceso no autorizado a nota por supervisor', {
          userId: user.id,
          userRole: user.role,
          noteId,
          assignedSupervisor: note.assigned_supervisor_id,
          ip: req.ip
        });
        return res.status(403).json({ 
          error: 'No tienes acceso a esta nota' 
        });
      }
    } else if (user.role === 'client') {
      // Cliente debe ser el creador de la nota
      if (note.created_by !== user.id) {
        logger.warn('Intento de acceso no autorizado a nota por cliente', {
          userId: user.id,
          userRole: user.role,
          noteId,
          noteCreator: note.created_by,
          ip: req.ip
        });
        return res.status(403).json({ 
          error: 'No tienes acceso a esta nota' 
        });
      }
    } else {
      return res.status(403).json({ error: 'Rol no autorizado' });
    }

    next();
  } catch (error) {
    logger.error('Error en checkClientNoteAccess middleware', {
      error: error.message,
      userId: req.user?.id,
      noteId: req.params.id || req.params.noteId
    });
    return res.status(500).json({ error: 'Error al validar acceso a la nota' });
  }
}

module.exports = {
  isAdmin,
  isSupervisor,
  isClient,
  requireRole,
  checkRole,
  isAdminOrSupervisor,
  checkOwnership,
  verifySupervisorOwnership,
  // Nuevos middlewares de autorización por recursos
  checkProjectAccess,
  checkScaffoldAccess,
  checkClientNoteAccess,
};
