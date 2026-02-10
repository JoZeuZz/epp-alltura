const DB_ROLE_VALUES = new Set(['admin', 'supervisor', 'bodega', 'trabajador']);

const toDbRole = (role) => {
  if (!role) return null;
  if (role === 'worker' || role === 'client') {
    return 'trabajador';
  }
  return role;
};

const toExternalRole = (role) => {
  const dbRole = toDbRole(role);
  if (!dbRole) return null;
  return dbRole === 'trabajador' ? 'worker' : dbRole;
};

const normalizeDbRoles = (rolesInput) => {
  const rawRoles = Array.isArray(rolesInput) ? rolesInput : [rolesInput];

  const normalized = rawRoles
    .map((role) => toDbRole(role))
    .filter((role) => DB_ROLE_VALUES.has(role));

  return [...new Set(normalized)];
};

const buildCompatibleRoles = (rolesInput) => {
  const dbRoles = normalizeDbRoles(rolesInput);
  const compatible = new Set(dbRoles);

  if (dbRoles.includes('trabajador')) {
    compatible.add('worker');
    compatible.add('client');
  }

  return {
    dbRoles,
    compatibleRoles: [...compatible],
  };
};

const hasAnyRequiredRole = (userRolesInput, requiredRolesInput) => {
  const requiredDbRoles = normalizeDbRoles(requiredRolesInput);
  if (requiredDbRoles.length === 0) {
    return false;
  }

  const { dbRoles: userDbRoles } = buildCompatibleRoles(userRolesInput);
  if (userDbRoles.length === 0) {
    return false;
  }

  return requiredDbRoles.some((requiredRole) => userDbRoles.includes(requiredRole));
};

module.exports = {
  toDbRole,
  toExternalRole,
  normalizeDbRoles,
  buildCompatibleRoles,
  hasAnyRequiredRole,
};
