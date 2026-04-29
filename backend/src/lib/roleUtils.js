const DB_ROLE_VALUES = new Set(['admin', 'supervisor']);

const toDbRole = (role) => {
  if (!role) {
    return null;
  }
  const normalized = String(role).trim().toLowerCase();
  return DB_ROLE_VALUES.has(normalized) ? normalized : null;
};

const toExternalRole = (role) => {
  const dbRole = toDbRole(role);
  if (!dbRole) return null;
  return dbRole;
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
