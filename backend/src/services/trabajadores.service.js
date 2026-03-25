const db = require('../db');
const PersonaModel = require('../models/persona');
const TrabajadorModel = require('../models/trabajador');
const { normalizeRut } = require('../lib/validation');

class TrabajadoresService {
  static async list(filters = {}) {
    return TrabajadorModel.findAll(filters);
  }

  static async getById(id) {
    const { rows } = await db.query(
      `
      SELECT
        t.*,
        p.rut,
        p.nombres,
        p.apellidos,
        p.telefono,
        p.email,
        u.email_login
      FROM trabajador t
      INNER JOIN persona p ON p.id = t.persona_id
      LEFT JOIN usuario u ON u.id = t.usuario_id
      WHERE t.id = $1
      `,
      [id]
    );

    if (!rows.length) {
      const error = new Error('Trabajador not found');
      error.statusCode = 404;
      throw error;
    }

    return rows[0];
  }

  static async create(data) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');
      let personaId = data.persona_id || null;

      if (!personaId) {
        if (!data.rut || !data.nombres || !data.apellidos) {
          const error = new Error('rut, nombres y apellidos son obligatorios si no se informa persona_id');
          error.statusCode = 400;
          throw error;
        }

        // Normalizar RUT antes de insertar
        data.rut = normalizeRut(data.rut);

        const existingPersona = await PersonaModel.findByRut(data.rut);
        if (existingPersona) {
          const error = new Error('Ya existe una persona con ese RUT');
          error.statusCode = 400;
          throw error;
        }

        const personaResult = await client.query(
          `
          INSERT INTO persona (rut, nombres, apellidos, telefono, email, estado)
          VALUES ($1, $2, $3, $4, $5, 'activo')
          RETURNING id
          `,
          [data.rut, data.nombres, data.apellidos, data.telefono || null, data.email || null]
        );
        personaId = personaResult.rows[0].id;
      } else if (data.rut || data.nombres || data.apellidos || data.telefono || data.email) {
        await client.query(
          `
          UPDATE persona
          SET
            rut = COALESCE($1, rut),
            nombres = COALESCE($2, nombres),
            apellidos = COALESCE($3, apellidos),
            telefono = COALESCE($4, telefono),
            email = COALESCE($5, email)
          WHERE id = $6
          `,
          [
            data.rut || null,
            data.nombres || null,
            data.apellidos || null,
            data.telefono || null,
            data.email || null,
            personaId,
          ]
        );
      }

      const trabajadorResult = await client.query(
        `
        INSERT INTO trabajador (
          persona_id, usuario_id, cargo, fecha_ingreso, fecha_salida, estado
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
        `,
        [
          personaId,
          data.usuario_id || null,
          data.cargo || null,
          data.fecha_ingreso || null,
          data.fecha_salida || null,
          data.estado || 'activo',
        ]
      );

      await client.query('COMMIT');
      return this.getById(trabajadorResult.rows[0].id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(id, data) {
    const existing = await TrabajadorModel.findById(id);
    if (!existing) {
      const error = new Error('Trabajador not found');
      error.statusCode = 404;
      throw error;
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      if (data.rut || data.nombres || data.apellidos || data.telefono || data.email || data.persona_estado) {
        // Normalizar RUT si viene en la actualización
        if (data.rut) data.rut = normalizeRut(data.rut);
        await client.query(
          `
          UPDATE persona
          SET
            rut = COALESCE($1, rut),
            nombres = COALESCE($2, nombres),
            apellidos = COALESCE($3, apellidos),
            telefono = COALESCE($4, telefono),
            email = COALESCE($5, email),
            estado = COALESCE($6, estado)
          WHERE id = $7
          `,
          [
            data.rut || null,
            data.nombres || null,
            data.apellidos || null,
            data.telefono || null,
            data.email || null,
            data.persona_estado || null,
            existing.persona_id,
          ]
        );
      }

      const fields = {
        usuario_id: data.usuario_id,
        cargo: data.cargo,
        fecha_ingreso: data.fecha_ingreso,
        fecha_salida: data.fecha_salida,
        estado: data.estado,
      };

      const setParts = [];
      const values = [];
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined) {
          values.push(value);
          setParts.push(`${key} = $${values.length}`);
        }
      });

      if (setParts.length > 0) {
        values.push(id);
        await client.query(
          `UPDATE trabajador SET ${setParts.join(', ')} WHERE id = $${values.length}`,
          values
        );
      }

      await client.query('COMMIT');
      return this.getById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async remove(id) {
    const existing = await TrabajadorModel.findById(id);
    if (!existing) {
      const error = new Error('Trabajador not found');
      error.statusCode = 404;
      throw error;
    }

    await TrabajadorModel.update(id, { estado: 'inactivo' });
    return { id, estado: 'inactivo' };
  }

  static async getProfile(id) {
    // 1. Datos base del trabajador
    const trabajador = await this.getById(id);

    // 2. Custodias activas con semáforo de devolución
    const { rows: custodias } = await db.query(
      `
      SELECT
        ca.id AS custodia_id,
        ca.activo_id,
        ca.entrega_id,
        ca.desde_en,
        ca.fecha_devolucion_esperada,
        a.codigo,
        a.nro_serie,
        a.estado AS activo_estado,
        ar.id AS articulo_id,
        ar.nombre AS articulo_nombre,
        ar.tipo AS articulo_tipo,
        ar.retorno_mode,
        u.nombre AS ubicacion_nombre,
        GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - ca.desde_en)) / 86400))::int AS dias_en_custodia,
        CASE
          WHEN ca.fecha_devolucion_esperada IS NULL THEN 'sin_plazo'
          ELSE (
            SELECT CASE
              WHEN pct >= 0.9 THEN 'rojo'
              WHEN pct >= 0.7 THEN 'amarillo'
              ELSE 'verde'
            END
            FROM (
              SELECT EXTRACT(EPOCH FROM (NOW() - ca.desde_en))
                   / NULLIF(EXTRACT(EPOCH FROM (ca.fecha_devolucion_esperada - ca.desde_en)), 0) AS pct
            ) sub
          )
        END AS semaforo,
        CASE
          WHEN ca.fecha_devolucion_esperada IS NULL THEN NULL
          ELSE GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (ca.fecha_devolucion_esperada - NOW())) / 86400))::int
        END AS dias_restantes
      FROM custodia_activo ca
      INNER JOIN activo a ON a.id = ca.activo_id
      INNER JOIN articulo ar ON ar.id = a.articulo_id
      LEFT JOIN ubicacion u ON u.id = ca.ubicacion_destino_id
      WHERE ca.trabajador_id = $1 AND ca.estado = 'activa'
      ORDER BY
        CASE
          WHEN ca.fecha_devolucion_esperada IS NULL THEN 1 ELSE 0
        END,
        ca.fecha_devolucion_esperada ASC,
        ca.desde_en ASC
      `,
      [id]
    );

    // 3. Historial de consumibles entregados
    const { rows: consumibles } = await db.query(
      `
      SELECT
        ed.id AS detalle_id,
        ed.cantidad,
        ar.id AS articulo_id,
        ar.nombre AS articulo_nombre,
        ar.tipo AS articulo_tipo,
        ar.unidad_medida,
        l.codigo_lote,
        e.id AS entrega_id,
        e.confirmada_en
      FROM entrega_detalle ed
      INNER JOIN entrega e ON e.id = ed.entrega_id
      INNER JOIN articulo ar ON ar.id = ed.articulo_id
      LEFT JOIN lote l ON l.id = ed.lote_id
      WHERE e.trabajador_id = $1
        AND e.estado = 'confirmada'
        AND ed.activo_id IS NULL
      ORDER BY e.confirmada_en DESC
      `,
      [id]
    );

    // 4. Estadísticas
    const { rows: statsRows } = await db.query(
      `
      SELECT
        (SELECT COUNT(*)::int FROM custodia_activo WHERE trabajador_id = $1 AND estado = 'activa') AS activos_en_custodia,
        (SELECT COUNT(*)::int FROM custodia_activo WHERE trabajador_id = $1) AS total_custodias,
        (SELECT COUNT(DISTINCT e.id)::int
         FROM entrega e
         WHERE e.trabajador_id = $1 AND e.estado = 'confirmada') AS total_entregas,
        (SELECT COALESCE(AVG(
          EXTRACT(DAY FROM COALESCE(ca2.hasta_en, NOW()) - ca2.desde_en)
        )::int, 0)
         FROM custodia_activo ca2 WHERE ca2.trabajador_id = $1) AS dias_promedio_custodia,
        (SELECT COUNT(*)::int
         FROM custodia_activo ca3
         WHERE ca3.trabajador_id = $1 AND ca3.estado = 'activa'
           AND ca3.fecha_devolucion_esperada IS NOT NULL
           AND EXTRACT(EPOCH FROM (NOW() - ca3.desde_en))
             / NULLIF(EXTRACT(EPOCH FROM (ca3.fecha_devolucion_esperada - ca3.desde_en)), 0) >= 0.9
        ) AS activos_vencidos_o_proximos
      `,
      [id]
    );

    return {
      ...trabajador,
      custodias,
      consumibles_entregados: consumibles,
      stats: statsRows[0],
    };
  }
}

module.exports = TrabajadoresService;
