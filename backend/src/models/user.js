const db = require('../db');
const bcrypt = require('bcrypt');
const { PASSWORD_CONFIG } = require('../middleware/passwordPolicy');

class User {
  constructor(data) {
    this.id = data.id;
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.email = data.email;
    this.password_hash = data.password_hash;
    this.role = data.role;
    this.created_at = data.created_at;
    this.rut = data.rut;
    this.phone_number = data.phone_number;
    this.profile_picture_url = data.profile_picture_url;
    this.must_change_password = data.must_change_password;
    this.failed_login_attempts = data.failed_login_attempts;
    this.account_locked_until = data.account_locked_until;
    this.last_login_at = data.last_login_at;
    this.last_login_ip = data.last_login_ip;
    this.last_login_user_agent = data.last_login_user_agent;
  }

  static async create({ first_name, last_name, email, password, role }) {
    const password_hash = await bcrypt.hash(password, PASSWORD_CONFIG.BCRYPT_ROUNDS);

    const { rows } = await db.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [first_name, last_name, email, password_hash, role]
    );
    return new User(rows[0]);
  }

  static async findByEmail(email) {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows.length ? new User(rows[0]) : null;
  }

  static async findById(id) {
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows.length ? new User(rows[0]) : null;
  }

  static async getAll(filters = {}) {
    let query = 'SELECT id, first_name, last_name, email, role FROM users';
    const queryParams = [];
    
    if (filters.role) {
      query += ' WHERE role = $1';
      queryParams.push(filters.role);
    }
    
    query += ' ORDER BY first_name, last_name';
    
    const { rows } = await db.query(query, queryParams);
    return rows;
  }

  static async update(id, { first_name, last_name, email, role, password, rut, phone_number, profile_picture_url }) {
    const fields = [];
    const values = [];
    let query = 'UPDATE users SET ';

    const addField = (name, value) => {
      if (value !== undefined) {
        values.push(value);
        fields.push(`${name} = $${values.length}`);
      }
    };

    addField('first_name', first_name);
    addField('last_name', last_name);
    addField('email', email);
    addField('role', role);
    addField('rut', rut);
    addField('phone_number', phone_number);
    addField('profile_picture_url', profile_picture_url);

    if (password) {
      const password_hash = await bcrypt.hash(password, PASSWORD_CONFIG.BCRYPT_ROUNDS);
      addField('password_hash', password_hash);
    }

    if (fields.length === 0) {
      // Nothing to update, just return the user
      return User.findById(id);
    }

    query += fields.join(', ');
    values.push(id);
    query += ` WHERE id = $${values.length} RETURNING *`;

    const { rows } = await db.query(query, values);
    return new User(rows[0]);
  }

  static async delete(id) {
    const { rows } = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return rows[0];
  }

  async comparePassword(plainPassword) {
    return await bcrypt.compare(plainPassword, this.password_hash);
  }

  /**
   * Actualiza la última fecha de login del usuario
   */
  static async updateLastLogin(userId, ip, userAgent) {
    await db.query(
      `UPDATE users 
       SET last_login_at = NOW(), 
           last_login_ip = $1, 
           last_login_user_agent = $2 
       WHERE id = $3`,
      [ip, userAgent, userId]
    );
  }

  /**
   * Actualiza la contraseña del usuario
   */
  static async updatePassword(userId, newPassword) {
    const password_hash = await bcrypt.hash(newPassword, PASSWORD_CONFIG.BCRYPT_ROUNDS);
    await db.query(
      'UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2',
      [password_hash, userId]
    );
  }

  /**
   * Marca que el usuario debe cambiar su contraseña
   */
  static async setPasswordChangeRequired(userId) {
    await db.query(
      'UPDATE users SET must_change_password = TRUE WHERE id = $1',
      [userId]
    );
  }

  /**
   * Limpia el flag de cambio de contraseña
   */
  static async clearPasswordChangeFlag(userId) {
    await db.query(
      'UPDATE users SET must_change_password = FALSE WHERE id = $1',
      [userId]
    );
  }

  /**
   * Incrementa el contador de intentos fallidos
   */
  static async incrementFailedAttempts(userId) {
    await db.query(
      'UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1',
      [userId]
    );
  }

  /**
   * Resetea el contador de intentos fallidos
   */
  static async resetFailedAttempts(userId) {
    await db.query(
      'UPDATE users SET failed_login_attempts = 0, account_locked_until = NULL WHERE id = $1',
      [userId]
    );
  }

  /**
   * Bloquea temporalmente la cuenta del usuario
   */
  static async lockAccount(userId, lockDurationMinutes = 30) {
    await db.query(
      `UPDATE users 
       SET account_locked_until = NOW() + INTERVAL '${lockDurationMinutes} minutes' 
       WHERE id = $1`,
      [userId]
    );
  }

  /**
   * Verifica si la cuenta está bloqueada
   */
  async isAccountLocked() {
    if (!this.account_locked_until) {
      return false;
    }
    return new Date(this.account_locked_until) > new Date();
  }
}

module.exports = User;