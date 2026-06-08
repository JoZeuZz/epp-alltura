const bcrypt = require('bcrypt');
const db = require('../db');
const { logger } = require('../lib/logger');
const { PASSWORD_CONFIG } = require('../middleware/passwordPolicy');

const ADMIN_ROLE = 'admin';

const splitName = (name) => {
  const parts = String(name || '').trim().split(/\s+/);
  if (parts.length >= 2) {
    return { nombres: parts[0], apellidos: parts.slice(1).join(' ') };
  }
  return { nombres: parts[0] || 'Admin', apellidos: 'Admin' };
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const bootstrapAdmin = async () => {
  const rawEmail = process.env.ADMIN_EMAIL;
  const rawPassword = process.env.ADMIN_PASSWORD;
  const rawName = process.env.ADMIN_NAME;
  const rawRut = process.env.ADMIN_RUT || '11111111-1';

  if (!rawEmail || !rawPassword || !rawName) {
    logger.warn(
      '[bootstrap] ADMIN_EMAIL, ADMIN_PASSWORD o ADMIN_NAME no definidos — se omite creación de admin inicial. ' +
      'Configura estas variables en Coolify para crear el primer administrador automáticamente.'
    );
    return;
  }

  const email = normalizeEmail(rawEmail);
  const { nombres, apellidos } = splitName(rawName);
  const rut = String(rawRut).trim();

  const client = await db.pool.connect();
  try {
    const { rows: existing } = await client.query(
      `SELECT u.id
       FROM usuario u
       INNER JOIN usuario_rol ur ON ur.usuario_id = u.id
       INNER JOIN rol r ON r.id = ur.rol_id
       WHERE LOWER(u.email_login) = $1
          OR r.nombre = $2
       LIMIT 1`,
      [email, ADMIN_ROLE]
    );

    if (existing.length) {
      logger.info('[bootstrap] Ya existe al menos un admin o el email ya está registrado — se omite bootstrap.');
      return;
    }

    const { rows: rolRows } = await client.query(
      'SELECT id FROM rol WHERE nombre = $1 LIMIT 1',
      [ADMIN_ROLE]
    );

    if (!rolRows.length) {
      logger.error('[bootstrap] Rol "admin" no encontrado en tabla rol. ¿Corriste 001-init.sql?');
      return;
    }

    const rolId = rolRows[0].id;
    const passwordHash = await bcrypt.hash(rawPassword, PASSWORD_CONFIG.BCRYPT_ROUNDS);

    await client.query('BEGIN');

    const { rows: personaRows } = await client.query(
      `INSERT INTO persona (rut, nombres, apellidos, email, estado)
       VALUES ($1, $2, $3, $4, 'activo')
       RETURNING id`,
      [rut, nombres, apellidos, email]
    );
    const personaId = personaRows[0].id;

    const { rows: usuarioRows } = await client.query(
      `INSERT INTO usuario (persona_id, email_login, password_hash, estado)
       VALUES ($1, $2, $3, 'activo')
       RETURNING id`,
      [personaId, email, passwordHash]
    );
    const usuarioId = usuarioRows[0].id;

    await client.query(
      'INSERT INTO usuario_rol (usuario_id, rol_id) VALUES ($1, $2)',
      [usuarioId, rolId]
    );

    await client.query('COMMIT');
    logger.info(`[bootstrap] Admin inicial creado: ${email} (persona ${personaId}, usuario ${usuarioId})`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('[bootstrap] Error creando admin inicial:', { message: err.message, code: err.code });
  } finally {
    client.release();
  }
};

module.exports = { bootstrapAdmin };
