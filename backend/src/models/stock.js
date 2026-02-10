const db = require('../db');

class StockModel {
  constructor(data) {
    this.id = data.id;
    this.ubicacion_id = data.ubicacion_id;
    this.articulo_id = data.articulo_id;
    this.lote_id = data.lote_id;
    this.cantidad_disponible = data.cantidad_disponible;
    this.cantidad_reservada = data.cantidad_reservada;
    this.actualizado_en = data.actualizado_en;
  }

  static async getByClave({ ubicacion_id, articulo_id, lote_id = null }) {
    const { rows } = await db.query(
      `
      SELECT *
      FROM stock
      WHERE ubicacion_id = $1
        AND articulo_id = $2
        AND lote_id IS NOT DISTINCT FROM $3
      `,
      [ubicacion_id, articulo_id, lote_id]
    );

    return rows.length ? new StockModel(rows[0]) : null;
  }

  static async upsertDelta({
    ubicacion_id,
    articulo_id,
    lote_id = null,
    disponible_delta = 0,
    reservada_delta = 0,
  }) {
    const hasLote = Boolean(lote_id);

    const query = hasLote
      ? `
        INSERT INTO stock (
          ubicacion_id, articulo_id, lote_id, cantidad_disponible, cantidad_reservada
        )
        VALUES ($1, $2, $3, GREATEST($4, 0), GREATEST($5, 0))
        ON CONFLICT (ubicacion_id, articulo_id, lote_id) WHERE lote_id IS NOT NULL
        DO UPDATE SET
          cantidad_disponible = GREATEST(stock.cantidad_disponible + $4, 0),
          cantidad_reservada = GREATEST(stock.cantidad_reservada + $5, 0),
          actualizado_en = NOW()
        RETURNING *
      `
      : `
        INSERT INTO stock (
          ubicacion_id, articulo_id, lote_id, cantidad_disponible, cantidad_reservada
        )
        VALUES ($1, $2, NULL, GREATEST($4, 0), GREATEST($5, 0))
        ON CONFLICT (ubicacion_id, articulo_id) WHERE lote_id IS NULL
        DO UPDATE SET
          cantidad_disponible = GREATEST(stock.cantidad_disponible + $4, 0),
          cantidad_reservada = GREATEST(stock.cantidad_reservada + $5, 0),
          actualizado_en = NOW()
        RETURNING *
      `;

    const params = [ubicacion_id, articulo_id, lote_id, disponible_delta, reservada_delta];
    const { rows } = await db.query(query, params);
    return new StockModel(rows[0]);
  }

  static async listByUbicacion(ubicacionId) {
    const { rows } = await db.query(
      `
      SELECT
        s.*,
        a.nombre AS articulo_nombre,
        a.tipo AS articulo_tipo,
        l.codigo_lote
      FROM stock s
      INNER JOIN articulo a ON a.id = s.articulo_id
      LEFT JOIN lote l ON l.id = s.lote_id
      WHERE s.ubicacion_id = $1
      ORDER BY a.nombre ASC
      `,
      [ubicacionId]
    );

    return rows;
  }
}

module.exports = StockModel;
