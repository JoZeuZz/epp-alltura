const db = require('../db');

const parseMetadata = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

class NotificationModel {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.type = data.type;
    this.title = data.title;
    this.message = data.message;
    this.metadata = parseMetadata(data.metadata);
    this.link = data.link;
    this.is_read = data.is_read;
    this.read_at = data.read_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static fromRow(row) {
    if (!row) {
      return null;
    }
    return new NotificationModel(row);
  }

  static mapRows(rows = []) {
    return rows.map((row) => NotificationModel.fromRow(row));
  }

  static async create(notificationData) {
    const query = `
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        metadata,
        link
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6)
      RETURNING *
    `;

    const values = [
      notificationData.user_id,
      notificationData.type,
      notificationData.title,
      notificationData.message,
      notificationData.metadata ? JSON.stringify(notificationData.metadata) : null,
      notificationData.link || null,
    ];

    const result = await db.query(query, values);
    return NotificationModel.fromRow(result.rows[0]);
  }

  static async createBatch(notifications) {
    if (!notifications || notifications.length === 0) {
      return [];
    }

    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    notifications.forEach((notif) => {
      placeholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}::jsonb, $${paramIndex++})`
      );
      values.push(
        notif.user_id,
        notif.type,
        notif.title,
        notif.message,
        notif.metadata ? JSON.stringify(notif.metadata) : null,
        notif.link || null
      );
    });

    const query = `
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        metadata,
        link
      )
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return NotificationModel.mapRows(result.rows);
  }

  static async getByUser(userId, options = {}) {
    let query = `
      SELECT *
      FROM notifications
      WHERE user_id = $1
    `;
    let totalQuery = `
      SELECT COUNT(*)::int AS total
      FROM notifications
      WHERE user_id = $1
    `;

    const values = [userId];
    let paramIndex = 2;

    if (options.unreadOnly) {
      query += ' AND is_read = false';
      totalQuery += ' AND is_read = false';
    }

    query += ' ORDER BY created_at DESC';

    if (options.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(options.limit);
    }

    if (options.offset) {
      query += ` OFFSET $${paramIndex++}`;
      values.push(options.offset);
    }

    const [result, totalResult] = await Promise.all([
      db.query(query, values),
      db.query(totalQuery, [userId]),
    ]);

    return {
      data: NotificationModel.mapRows(result.rows),
      total: totalResult.rows[0]?.total || 0,
    };
  }

  static async getById(id) {
    const query = 'SELECT * FROM notifications WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return NotificationModel.fromRow(result.rows[0]);
  }

  static async markAsRead(id, userId) {
    const query = `
      UPDATE notifications
      SET is_read = true,
          read_at = NOW(),
          updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [id, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return NotificationModel.fromRow(result.rows[0]);
  }

  static async markAllAsRead(userId) {
    const query = `
      UPDATE notifications
      SET is_read = true,
          read_at = NOW(),
          updated_at = NOW()
      WHERE user_id = $1 AND is_read = false
    `;

    const result = await db.query(query, [userId]);
    return result.rowCount;
  }

  static async getUnreadCount(userId) {
    const query = `
      SELECT COUNT(*)::int AS count
      FROM notifications
      WHERE user_id = $1 AND is_read = false
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0].count;
  }

  static async delete(id, userId) {
    const query = 'DELETE FROM notifications WHERE id = $1 AND user_id = $2';
    const result = await db.query(query, [id, userId]);
    return result.rowCount > 0;
  }

  static async deleteAllRead(userId) {
    const query = 'DELETE FROM notifications WHERE user_id = $1 AND is_read = true';
    const result = await db.query(query, [userId]);
    return result.rowCount;
  }

  static async deleteOld(days = 30) {
    const sanitizedDays = Math.max(1, Number(days) || 30);
    const query = `
      DELETE FROM notifications
      WHERE created_at < NOW() - ($1::int * INTERVAL '1 day')
        AND is_read = true
    `;

    const result = await db.query(query, [sanitizedDays]);
    return result.rowCount;
  }

  static async getByType(userId, type, options = {}) {
    let query = `
      SELECT *
      FROM notifications
      WHERE user_id = $1 AND type = $2
    `;

    const values = [userId, type];
    let paramIndex = 3;

    if (options.unreadOnly) {
      query += ' AND is_read = false';
    }

    query += ' ORDER BY created_at DESC';

    if (options.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(options.limit);
    }

    const result = await db.query(query, values);
    return NotificationModel.mapRows(result.rows);
  }

  static async getStats(userId) {
    const query = `
      SELECT
        COUNT(*)::int AS total,
        COALESCE(SUM(CASE WHEN is_read THEN 1 ELSE 0 END), 0)::int AS read,
        COALESCE(SUM(CASE WHEN NOT is_read THEN 1 ELSE 0 END), 0)::int AS unread,
        COUNT(DISTINCT type)::int AS types_count
      FROM notifications
      WHERE user_id = $1
    `;

    const result = await db.query(query, [userId]);
    const row = result.rows[0];

    return {
      total: row.total,
      read: row.read,
      unread: row.unread,
      types_count: row.types_count,
    };
  }

  static async hasDuplicate(userId, type, metadata, minutes = 5) {
    const sanitizedMinutes = Math.max(1, Number(minutes) || 5);
    const query = `
      SELECT COUNT(*)::int AS count
      FROM notifications
      WHERE user_id = $1
        AND type = $2
        AND metadata = $3::jsonb
        AND created_at > NOW() - ($4::int * INTERVAL '1 minute')
    `;

    const result = await db.query(query, [userId, type, JSON.stringify(metadata), sanitizedMinutes]);
    return result.rows[0].count > 0;
  }
}

module.exports = NotificationModel;
