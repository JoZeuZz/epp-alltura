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

module.exports = {
  isAdmin,
  isSupervisor,
  isClient,
  requireRole,
  checkRole,
  isAdminOrSupervisor,
  checkOwnership,
  verifySupervisorOwnership,
};
