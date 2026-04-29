const db = require('../db');

class StockModel {
  constructor(data) {
    this.id = data.id;
    this.ubicacion_id = data.ubicacion_id;
    this.articulo_id = data.articulo_id;
    this.cantidad_disponible = data.cantidad_disponible;
    this.cantidad_reservada = data.cantidad_reservada;
    this.actualizado_en = data.actualizado_en;
  }

  static async getByClave({ ubicacion_id, articulo_id }) {
    const { rows } = await db.query(
      `
      SELECT *
      FROM stock
      WHERE ubicacion_id = $1
        AND articulo_id = $2
        AND lote_id IS NULL
      `,
      [ubicacion_id, articulo_id]
    );

    return rows.length ? new StockModel(rows[0]) : null;
  }

  static async upsertDelta({
    ubicacion_id,
    articulo_id,
    disponible_delta = 0,
    reservada_delta = 0,
  }) {
    const query = `
      INSERT INTO stock (
        ubicacion_id, articulo_id, lote_id, cantidad_disponible, cantidad_reservada
      )
      VALUES ($1, $2, NULL, GREATEST($3, 0), GREATEST($4, 0))
      ON CONFLICT (ubicacion_id, articulo_id) WHERE lote_id IS NULL
      DO UPDATE SET
        cantidad_disponible = GREATEST(stock.cantidad_disponible + $3, 0),
        cantidad_reservada = GREATEST(stock.cantidad_reservada + $4, 0),
        actualizado_en = NOW()
      RETURNING *
    `;

    const params = [ubicacion_id, articulo_id, disponible_delta, reservada_delta];
    const { rows } = await db.query(query, params);
    return new StockModel(rows[0]);
  }

  static async listByUbicacion(ubicacionId) {
    const { rows } = await db.query(
      `
      SELECT
        s.*,
        a.nombre AS articulo_nombre,
        a.grupo_principal AS articulo_tipo
      FROM stock s
      INNER JOIN articulo a ON a.id = s.articulo_id
      WHERE s.ubicacion_id = $1
        AND s.lote_id IS NULL
      ORDER BY a.nombre ASC
      `,
      [ubicacionId]
    );

    return rows;
  }
}

module.exports = StockModel;
