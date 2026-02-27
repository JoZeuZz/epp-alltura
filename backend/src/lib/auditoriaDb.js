const db = require('../db');

const buildError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const allowedActions = new Set(['crear', 'actualizar', 'eliminar', 'firmar', 'devolver', 'ajustar']);

const writeAuditEvent = async ({
  client,
  entidadTipo,
  entidadId,
  accion,
  usuarioId,
  diff = null,
  ip = null,
  userAgent = null,
}) => {
  if (!entidadTipo || !entidadId || !accion || !usuarioId) {
    throw buildError('Faltan campos obligatorios para registrar auditoría');
  }

  if (!allowedActions.has(accion)) {
    throw buildError(`Acción de auditoría no permitida: ${accion}`);
  }

  const executor = client || db;
  await executor.query(
    `
    INSERT INTO auditoria (
      entidad_tipo,
      entidad_id,
      accion,
      diff_json,
      usuario_id,
      ip,
      user_agent
    )
    VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
    `,
    [
      entidadTipo,
      entidadId,
      accion,
      diff ? JSON.stringify(diff) : null,
      usuarioId,
      ip,
      userAgent,
    ]
  );
};

module.exports = {
  writeAuditEvent,
};
