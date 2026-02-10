const db = require('../db');

const parseSubscriptionData = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

class PushSubscriptionModel {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.subscription_data = parseSubscriptionData(data.subscription_data);
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static fromRow(row) {
    if (!row) {
      return null;
    }
    return new PushSubscriptionModel(row);
  }

  static async upsert(userId, subscriptionData) {
    const query = `
      INSERT INTO push_subscriptions (user_id, subscription_data)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (user_id)
      DO UPDATE SET
        subscription_data = EXCLUDED.subscription_data,
        updated_at = NOW()
      RETURNING *
    `;

    const { rows } = await db.query(query, [userId, JSON.stringify(subscriptionData)]);
    return PushSubscriptionModel.fromRow(rows[0]);
  }

  static async findByUserId(userId) {
    const { rows } = await db.query(
      'SELECT * FROM push_subscriptions WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    return rows.length ? PushSubscriptionModel.fromRow(rows[0]) : null;
  }

  static async removeByUserId(userId) {
    const result = await db.query('DELETE FROM push_subscriptions WHERE user_id = $1', [userId]);
    return result.rowCount > 0;
  }
}

module.exports = PushSubscriptionModel;
