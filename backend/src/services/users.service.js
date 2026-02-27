const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const db = require('../db');
const PersonaModel = require('../models/persona');
const UsuarioModel = require('../models/usuario');
const RolModel = require('../models/rol');
const { uploadFile } = require('../lib/googleCloud');
const { logger } = require('../lib/logger');
const { PASSWORD_CONFIG } = require('../middleware/passwordPolicy');
const { TOKEN_CONFIG } = require('../middleware/auth');
const { toDbRole, toExternalRole, normalizeDbRoles, buildCompatibleRoles } = require('../lib/roleUtils');

const buildError = (message, statusCode = 400, code = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) {
    error.code = code;
  }
  return error;
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const MAX_RUT_LENGTH = 20;

const buildTemporaryRut = () => {
  const suffix = randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
  return `TMP-${suffix}`;
};

const normalizeRut = (rut) => {
  const value = String(rut || '').trim().toUpperCase();
  if (value) {
    return value;
  }
  return buildTemporaryRut();
};

const buildTokenPayloadUser = (user) => {
  const dbRoles = normalizeDbRoles(user.roles_db || user.roles || user.role_db || user.role);
  const primaryDbRole = toDbRole(user.role_db || dbRoles[0] || 'trabajador');
  const { compatibleRoles } = buildCompatibleRoles(dbRoles);

  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: toExternalRole(primaryDbRole),
    role_db: primaryDbRole,
    roles: compatibleRoles,
    roles_db: dbRoles,
    estado: user.estado,
    rut: user.rut || null,
    phone_number: user.phone_number || null,
    profile_picture_url: user.profile_picture_url || null,
  };
};

const signAccessToken = (user) =>
  jwt.sign(
    { user: buildTokenPayloadUser(user) },
    process.env.JWT_SECRET,
    {
      expiresIn: TOKEN_CONFIG?.ACCESS_TOKEN_EXPIRY || '15m',
      issuer: 'alltura-api',
      audience: 'alltura-client',
    }
  );

const mapUsuarioRecord = (row) => {
  const dbRoles = normalizeDbRoles(row.roles || row.role_db);
  const primaryDbRole = toDbRole(row.role_db || dbRoles[0] || 'trabajador');
  const { compatibleRoles } = buildCompatibleRoles(dbRoles);

  return {
    id: row.id,
    first_name: row.first_name || '',
    last_name: row.last_name || '',
    email: row.email || '',
    email_login: row.email || '',
    role: toExternalRole(primaryDbRole),
    role_db: primaryDbRole,
    roles: compatibleRoles,
    roles_db: dbRoles,
    rut: row.rut || null,
    phone_number: row.phone_number || null,
    profile_picture_url: row.profile_picture_url || null,
    estado: row.estado,
    trabajador_id: row.trabajador_id || null,
    cargo: row.cargo || null,
    created_at: row.created_at,
    client_id: null,
  };
};

const getUserByIdRaw = async (userId) => {
  const { rows } = await db.query(
    `
    SELECT
      u.id,
      u.persona_id,
      u.email_login AS email,
      u.estado,
      u.creado_en AS created_at,
      p.nombres AS first_name,
      p.apellidos AS last_name,
      p.rut,
      p.telefono AS phone_number,
      p.foto_url AS profile_picture_url,
      t.id AS trabajador_id,
      t.cargo,
      ARRAY_REMOVE(ARRAY_AGG(r.nombre), NULL) AS roles
    FROM usuario u
    LEFT JOIN persona p ON p.id = u.persona_id
    LEFT JOIN trabajador t ON t.usuario_id = u.id
    LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
    LEFT JOIN rol r ON r.id = ur.rol_id
    WHERE u.id = $1
    GROUP BY u.id, p.id, t.id
    LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
};

const ensureWorkerRecord = async (client, usuarioId, personaId, shouldBeActive) => {
  const workerResult = await client.query(
    `
    SELECT id
    FROM trabajador
    WHERE usuario_id = $1
    LIMIT 1
    FOR UPDATE
    `,
    [usuarioId]
  );

  if (shouldBeActive) {
    if (!workerResult.rows.length) {
      await client.query(
        `
        INSERT INTO trabajador (persona_id, usuario_id, estado)
        VALUES ($1, $2, 'activo')
        `,
        [personaId, usuarioId]
      );
      return;
    }

    await client.query('UPDATE trabajador SET estado = $2 WHERE id = $1', [workerResult.rows[0].id, 'activo']);
    return;
  }

  if (workerResult.rows.length) {
    await client.query('UPDATE trabajador SET estado = $2 WHERE id = $1', [workerResult.rows[0].id, 'inactivo']);
  }
};

class UserService {
  static async getUserById(userId) {
    const user = await getUserByIdRaw(userId);

    if (!user) {
      throw buildError('User not found', 404, 'USER_NOT_FOUND');
    }

    return mapUsuarioRecord(user);
  }

  static async updateOwnProfile(userId, updateData) {
    const sanitizedData = { ...updateData };
    delete sanitizedData.role;
    delete sanitizedData.email;
    delete sanitizedData.client_id;

    const existing = await getUserByIdRaw(userId);
    if (!existing) {
      throw buildError('User not found', 404, 'USER_NOT_FOUND');
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      if (
        sanitizedData.first_name !== undefined ||
        sanitizedData.last_name !== undefined ||
        sanitizedData.rut !== undefined ||
        sanitizedData.phone_number !== undefined
      ) {
        await client.query(
          `
          UPDATE persona
          SET
            nombres = COALESCE($1, nombres),
            apellidos = COALESCE($2, apellidos),
            rut = COALESCE(NULLIF($3, ''), rut),
            telefono = COALESCE(NULLIF($4, ''), telefono)
          WHERE id = $5
          `,
          [
            sanitizedData.first_name,
            sanitizedData.last_name,
            sanitizedData.rut,
            sanitizedData.phone_number,
            existing.persona_id,
          ]
        );
      }

      if (sanitizedData.password) {
        const passwordHash = await bcrypt.hash(sanitizedData.password, PASSWORD_CONFIG.BCRYPT_ROUNDS);
        await client.query('UPDATE usuario SET password_hash = $2 WHERE id = $1', [userId, passwordHash]);
      }

      await client.query('COMMIT');

      const updated = await this.getUserById(userId);
      const token = signAccessToken(updated);

      logger.info(`Usuario ${userId} actualizo su perfil`);

      return {
        user: updated,
        token,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async uploadProfilePicture(userId, file) {
    if (!file) {
      throw buildError('No file provided', 400, 'FILE_REQUIRED');
    }

    const existing = await getUserByIdRaw(userId);
    if (!existing) {
      throw buildError('User not found', 404, 'USER_NOT_FOUND');
    }

    const imageUrl = await uploadFile(file);

    await db.query(
      `
      UPDATE persona
      SET foto_url = $1
      WHERE id = $2
      `,
      [imageUrl, existing.persona_id]
    );

    const updated = await this.getUserById(userId);
    const token = signAccessToken(updated);

    logger.info(`Usuario ${userId} actualizo su foto de perfil`);

    return {
      user: updated,
      token,
    };
  }

  static async getAllUsers(filters = {}) {
    const values = [];
    const conditions = [];

    if (filters.role) {
      values.push(toDbRole(filters.role));
      conditions.push(`r.nombre = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${String(filters.search).trim()}%`);
      conditions.push(
        `(u.email_login ILIKE $${values.length} OR p.nombres ILIKE $${values.length} OR p.apellidos ILIKE $${values.length} OR p.rut ILIKE $${values.length})`
      );
    }

    const query = `
      SELECT
        u.id,
        u.persona_id,
        u.email_login AS email,
        u.estado,
        u.creado_en AS created_at,
        p.nombres AS first_name,
        p.apellidos AS last_name,
        p.rut,
        p.telefono AS phone_number,
        p.foto_url AS profile_picture_url,
        t.id AS trabajador_id,
        t.cargo,
        ARRAY_REMOVE(ARRAY_AGG(r.nombre), NULL) AS roles
      FROM usuario u
      LEFT JOIN persona p ON p.id = u.persona_id
      LEFT JOIN trabajador t ON t.usuario_id = u.id
      LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
      LEFT JOIN rol r ON r.id = ur.rol_id
      ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
      GROUP BY u.id, p.id, t.id
      ORDER BY p.nombres ASC NULLS LAST, p.apellidos ASC NULLS LAST, u.email_login ASC
    `;

    const { rows } = await db.query(query, values);
    return rows.map(mapUsuarioRecord);
  }

  static async getUsersByClientId(_clientId) {
    logger.warn('Endpoint /users/by-client legacy invoked. Returning trabajadores as compatibility response.');
    return this.getAllUsers({ role: 'trabajador' });
  }

  static async createUser(userData) {
    const email = normalizeEmail(userData.email || userData.email_login);
    const firstName = String(userData.first_name || userData.nombres || '').trim();
    const lastName = String(userData.last_name || userData.apellidos || '').trim();
    const phoneNumber = String(userData.phone_number || userData.telefono || '').trim();
    const rut = normalizeRut(userData.rut);
    const roleName = toDbRole(userData.role || 'supervisor');

    if (!email) {
      throw buildError('Email is required', 400, 'EMAIL_REQUIRED');
    }

    if (!firstName || !lastName) {
      throw buildError('First name and last name are required', 400, 'NAME_REQUIRED');
    }

    if (!userData.password) {
      throw buildError('Password is required', 400, 'PASSWORD_REQUIRED');
    }

    if (rut.length > MAX_RUT_LENGTH) {
      throw buildError(`RUT must not exceed ${MAX_RUT_LENGTH} characters`, 400, 'RUT_TOO_LONG');
    }

    const existingUser = await UsuarioModel.findByEmailLogin(email);
    if (existingUser) {
      throw buildError('User with this email already exists', 400, 'EMAIL_IN_USE');
    }

    const existingPersona = await PersonaModel.findByRut(rut);
    if (existingPersona) {
      throw buildError('Person with this RUT already exists', 400, 'RUT_IN_USE');
    }

    const role = await RolModel.findByNombre(roleName);
    if (!role) {
      throw buildError(`Role "${roleName}" is not valid`, 400, 'ROLE_INVALID');
    }

    const passwordHash = await bcrypt.hash(userData.password, PASSWORD_CONFIG.BCRYPT_ROUNDS);

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const personaResult = await client.query(
        `
        INSERT INTO persona (rut, nombres, apellidos, telefono, email, estado)
        VALUES ($1, $2, $3, $4, $5, 'activo')
        RETURNING id
        `,
        [rut, firstName, lastName, phoneNumber || null, email]
      );

      const personaId = personaResult.rows[0].id;

      const usuarioResult = await client.query(
        `
        INSERT INTO usuario (persona_id, email_login, password_hash, estado)
        VALUES ($1, $2, $3, 'activo')
        RETURNING id
        `,
        [personaId, email, passwordHash]
      );

      const usuarioId = usuarioResult.rows[0].id;

      await client.query(
        `
        INSERT INTO usuario_rol (usuario_id, rol_id)
        VALUES ($1, $2)
        `,
        [usuarioId, role.id]
      );

      await ensureWorkerRecord(client, usuarioId, personaId, roleName === 'trabajador');

      await client.query('COMMIT');

      return this.getUserById(usuarioId);
    } catch (error) {
      await client.query('ROLLBACK');

      if (error?.code === '22001') {
        throw buildError(
          'Uno de los campos excede el largo permitido en base de datos.',
          400,
          'FIELD_LENGTH_EXCEEDED'
        );
      }

      if (error?.code === '23505') {
        throw buildError(
          'El usuario ya existe con uno de los identificadores únicos (email o RUT).',
          400,
          'DUPLICATE_VALUE'
        );
      }

      throw error;
    } finally {
      client.release();
    }
  }

  static async updateUser(userId, updateData) {
    const existing = await getUserByIdRaw(userId);
    if (!existing) {
      throw buildError('User not found', 404, 'USER_NOT_FOUND');
    }

    const nextEmail =
      updateData.email !== undefined || updateData.email_login !== undefined
        ? normalizeEmail(updateData.email || updateData.email_login)
        : existing.email;

    if (!nextEmail) {
      throw buildError('Email is required', 400, 'EMAIL_REQUIRED');
    }

    if (nextEmail !== existing.email) {
      const emailInUse = await UsuarioModel.findByEmailLogin(nextEmail);
      if (emailInUse) {
        throw buildError('Email already in use by another user', 400, 'EMAIL_IN_USE');
      }
    }

    const nextRoleName = updateData.role ? toDbRole(updateData.role) : null;
    let role = null;
    if (nextRoleName) {
      role = await RolModel.findByNombre(nextRoleName);
      if (!role) {
        throw buildError(`Role "${nextRoleName}" is not valid`, 400, 'ROLE_INVALID');
      }
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `
        UPDATE usuario
        SET
          email_login = $1,
          estado = COALESCE($2, estado)
        WHERE id = $3
        `,
        [nextEmail, updateData.estado, userId]
      );

      if (updateData.password) {
        const passwordHash = await bcrypt.hash(updateData.password, PASSWORD_CONFIG.BCRYPT_ROUNDS);
        await client.query('UPDATE usuario SET password_hash = $2 WHERE id = $1', [userId, passwordHash]);
      }

      if (
        updateData.first_name !== undefined ||
        updateData.last_name !== undefined ||
        updateData.rut !== undefined ||
        updateData.phone_number !== undefined
      ) {
        await client.query(
          `
          UPDATE persona
          SET
            nombres = COALESCE($1, nombres),
            apellidos = COALESCE($2, apellidos),
            rut = COALESCE(NULLIF($3, ''), rut),
            telefono = COALESCE(NULLIF($4, ''), telefono)
          WHERE id = $5
          `,
          [
            updateData.first_name,
            updateData.last_name,
            updateData.rut,
            updateData.phone_number,
            existing.persona_id,
          ]
        );
      }

      if (role) {
        await client.query('DELETE FROM usuario_rol WHERE usuario_id = $1', [userId]);
        await client.query(
          `
          INSERT INTO usuario_rol (usuario_id, rol_id)
          VALUES ($1, $2)
          `,
          [userId, role.id]
        );
      }

      const shouldBeWorker = role ? role.nombre === 'trabajador' : normalizeDbRoles(existing.roles).includes('trabajador');
      await ensureWorkerRecord(client, userId, existing.persona_id, shouldBeWorker);

      await client.query('COMMIT');

      return this.getUserById(userId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteUser(userId) {
    const existing = await getUserByIdRaw(userId);
    if (!existing) {
      throw buildError('User not found', 404, 'USER_NOT_FOUND');
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('UPDATE usuario SET estado = $2 WHERE id = $1', [userId, 'inactivo']);
      await client.query('UPDATE persona SET estado = $2 WHERE id = $1', [existing.persona_id, 'inactivo']);
      await client.query('UPDATE trabajador SET estado = $2 WHERE usuario_id = $1', [userId, 'inactivo']);
      await client.query('COMMIT');

      logger.info(`Usuario ${userId} desactivado por admin`);

      return {
        id: userId,
        estado: 'inactivo',
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async isEmailAvailable(email, excludeUserId = null) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return false;
    }

    const user = await UsuarioModel.findByEmailLogin(normalizedEmail);
    if (!user) {
      return true;
    }

    if (excludeUserId && user.id === excludeUserId) {
      return true;
    }

    return false;
  }

  static generateUserToken(user) {
    return signAccessToken(user);
  }
}

module.exports = UserService;
