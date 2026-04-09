const { logAudit, AuditEvents } = require('../lib/auditLogger');
const { hasAnyRequiredRole, buildCompatibleRoles } = require('../lib/roleUtils');
const { buildErrorResponse } = require('../lib/apiResponse');

const deny = (req, res, requiredRoles) => {
  const requestedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  const actual = buildCompatibleRoles(req.user?.roles || req.user?.role);

  logAudit(AuditEvents.FORBIDDEN_ACCESS, req.user?.id || 'anonymous', {
    path: req.path,
    method: req.method,
    requiredRoles: requestedRoles,
    actualRoles: actual.dbRoles,
  });

  return res
    .status(403)
    .json(
      buildErrorResponse(
        `Acceso denegado. Se requiere uno de los siguientes roles: ${requestedRoles.join(', ')}.`,
        ['FORBIDDEN']
      )
    );
};

const checkRole = (roles) => {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(buildErrorResponse('No autenticado.', ['UNAUTHENTICATED']));
    }

    const userRoles = req.user.roles || req.user.role;
    if (!hasAnyRequiredRole(userRoles, requiredRoles)) {
      return deny(req, res, requiredRoles);
    }

    return next();
  };
};

const isAdmin = checkRole(['admin']);
const isSupervisor = checkRole(['supervisor']);
const isBodega = checkRole(['bodega']);
const isTrabajador = checkRole(['trabajador']);
const isAdminOrSupervisor = checkRole(['admin', 'supervisor']);

// Alias de compatibilidad temporal con naming legacy
const isClient = checkRole(['trabajador']);
const requireRole = (role) => checkRole([role]);

const checkOwnership = (resourceUserIdField = 'creado_por_usuario_id') => {
  return (req, _res, next) => {
    req.ownershipField = resourceUserIdField;
    next();
  };
};

const verifySupervisorOwnership = (resource) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(buildErrorResponse('No autenticado.', ['UNAUTHENTICATED']));
    }

    const roles = req.user.roles || req.user.role;
    if (hasAnyRequiredRole(roles, ['admin', 'bodega'])) {
      return next();
    }

    if (
      hasAnyRequiredRole(roles, ['supervisor']) &&
      resource &&
      req.ownershipField &&
      resource[req.ownershipField] === req.user.id
    ) {
      return next();
    }

    return res
      .status(403)
      .json(buildErrorResponse('No tienes permisos para operar sobre este recurso.', ['FORBIDDEN']));
  };
};

// Stubs de compatibilidad para rutas legacy. En EPP el control se hará por entidad real.
const checkProjectAccess = (_req, _res, next) => next();
const checkScaffoldAccess = (_req, _res, next) => next();

module.exports = {
  isAdmin,
  isSupervisor,
  isBodega,
  isTrabajador,
  isClient,
  requireRole,
  checkRole,
  isAdminOrSupervisor,
  checkOwnership,
  verifySupervisorOwnership,
  checkProjectAccess,
  checkScaffoldAccess,
};
