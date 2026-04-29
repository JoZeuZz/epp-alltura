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

module.exports = {
  isAdmin,
  checkRole,
};