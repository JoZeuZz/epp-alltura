const db = require('../db');

/**
 * Modelo Notification
 * Gestiona las notificaciones in-app persistentes
 */
class Notification {
  /**
   * Crear una nueva notificación
   * @param {Object} notificationData - Datos de la notificación
   * @param {number} notificationData.user_id - ID del usuario destinatario
   * @param {string} notificationData.type - Tipo de notificación
   * @param {string} notificationData.title - Título de la notificación
   * @param {string} notificationData.message - Mensaje de la notificación
   * @param {Object} [notificationData.metadata] - Metadata adicional (JSON)
   * @param {string} [notificationData.link] - URL de enlace (opcional)
   * @returns {Promise<Object>} Notificación creada
   */
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
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      notificationData.user_id,
      notificationData.type,
      notificationData.title,
      notificationData.message,
      notificationData.metadata ? JSON.stringify(notificationData.metadata) : null,
      notificationData.link || null
    ];
    
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Crear notificaciones en batch para múltiples usuarios
   * @param {Array<Object>} notifications - Array de objetos de notificación
   * @returns {Promise<Array>} Notificaciones creadas
   */
  static async createBatch(notifications) {
    if (!notifications || notifications.length === 0) {
      return [];
    }

    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    notifications.forEach((notif) => {
      placeholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
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
    return result.rows;
  }

  /**
   * Obtener notificaciones de un usuario
   * @param {number} userId - ID del usuario
   * @param {Object} options - Opciones de filtrado
   * @param {boolean} [options.unreadOnly] - Solo no leídas
   * @param {number} [options.limit] - Límite de resultados
   * @param {number} [options.offset] - Offset para paginación
   * @returns {Promise<Array>} Array de notificaciones
   */
  static async getByUser(userId, options = {}) {
    let query = `
      SELECT *
      FROM notifications
      WHERE user_id = $1
    `;
    
    const values = [userId];
    let paramIndex = 2;
    
    if (options.unreadOnly) {
      query += ' AND is_read = false';
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
    
    const result = await db.query(query, values);
    
    // Parsear metadata JSON
    return result.rows.map(row => ({
      ...row,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null
    }));
  }

  /**
   * Obtener notificación por ID
   * @param {number} id - ID de la notificación
   * @returns {Promise<Object|null>} Notificación o null
   */
  static async getById(id) {
    const query = 'SELECT * FROM notifications WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const notification = result.rows[0];
    return {
      ...notification,
      metadata: notification.metadata ? 
        (typeof notification.metadata === 'string' ? JSON.parse(notification.metadata) : notification.metadata) : 
        null
    };
  }

  /**
   * Marcar notificación como leída
   * @param {number} id - ID de la notificación
   * @param {number} userId - ID del usuario (validación de propiedad)
   * @returns {Promise<Object|null>} Notificación actualizada o null
   */
  static async markAsRead(id, userId) {
    const query = `
      UPDATE notifications
      SET is_read = true,
          read_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [id, userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const notification = result.rows[0];
    return {
      ...notification,
      metadata: notification.metadata ? 
        (typeof notification.metadata === 'string' ? JSON.parse(notification.metadata) : notification.metadata) : 
        null
    };
  }

  /**
   * Marcar todas las notificaciones de un usuario como leídas
   * @param {number} userId - ID del usuario
   * @returns {Promise<number>} Cantidad de notificaciones actualizadas
   */
  static async markAllAsRead(userId) {
    const query = `
      UPDATE notifications
      SET is_read = true,
          read_at = NOW()
      WHERE user_id = $1 AND is_read = false
    `;
    
    const result = await db.query(query, [userId]);
    return result.rowCount;
  }

  /**
   * Obtener cantidad de notificaciones no leídas
   * @param {number} userId - ID del usuario
   * @returns {Promise<number>} Cantidad de no leídas
   */
  static async getUnreadCount(userId) {
    const query = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 AND is_read = false
    `;
    
    const result = await db.query(query, [userId]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Eliminar notificación
   * @param {number} id - ID de la notificación
   * @param {number} userId - ID del usuario (validación de propiedad)
   * @returns {Promise<boolean>} true si se eliminó
   */
  static async delete(id, userId) {
    const query = 'DELETE FROM notifications WHERE id = $1 AND user_id = $2';
    const result = await db.query(query, [id, userId]);
    return result.rowCount > 0;
  }

  /**
   * Eliminar todas las notificaciones leídas de un usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<number>} Cantidad eliminada
   */
  static async deleteAllRead(userId) {
    const query = 'DELETE FROM notifications WHERE user_id = $1 AND is_read = true';
    const result = await db.query(query, [userId]);
    return result.rowCount;
  }

  /**
   * Eliminar notificaciones antiguas (más de X días)
   * @param {number} days - Días de antigüedad (por defecto 30)
   * @returns {Promise<number>} Cantidad eliminada
   */
  static async deleteOld(days = 30) {
    const query = `
      DELETE FROM notifications
      WHERE created_at < NOW() - INTERVAL '${days} days'
        AND is_read = true
    `;
    
    const result = await db.query(query);
    return result.rowCount;
  }

  /**
   * Obtener notificaciones por tipo
   * @param {number} userId - ID del usuario
   * @param {string} type - Tipo de notificación
   * @param {Object} options - Opciones de filtrado
   * @returns {Promise<Array>} Array de notificaciones
   */
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
    
    return result.rows.map(row => ({
      ...row,
      metadata: row.metadata ? 
        (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : 
        null
    }));
  }

  /**
   * Obtener estadísticas de notificaciones de un usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<Object>} Estadísticas
   */
  static async getStats(userId) {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_read THEN 1 ELSE 0 END) as read,
        SUM(CASE WHEN NOT is_read THEN 1 ELSE 0 END) as unread,
        COUNT(DISTINCT type) as types_count
      FROM notifications
      WHERE user_id = $1
    `;
    
    const result = await db.query(query, [userId]);
    const row = result.rows[0];
    
    return {
      total: parseInt(row.total, 10),
      read: parseInt(row.read, 10),
      unread: parseInt(row.unread, 10),
      types_count: parseInt(row.types_count, 10)
    };
  }

  /**
   * Verificar si existe una notificación duplicada reciente
   * (Evitar spam de notificaciones)
   * @param {number} userId - ID del usuario
   * @param {string} type - Tipo de notificación
   * @param {Object} metadata - Metadata para comparar
   * @param {number} [minutes] - Ventana de tiempo en minutos (por defecto 5)
   * @returns {Promise<boolean>} true si existe duplicado
   */
  static async hasDuplicate(userId, type, metadata, minutes = 5) {
    const query = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 
        AND type = $2
        AND metadata = $3
        AND created_at > NOW() - INTERVAL '${minutes} minutes'
    `;
    
    const result = await db.query(query, [
      userId,
      type,
      JSON.stringify(metadata)
    ]);
    
    return parseInt(result.rows[0].count, 10) > 0;
  }
}

module.exports = Notification;
