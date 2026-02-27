const db = require('../db');
const { writeAuditEvent } = require('../lib/auditoriaDb');

const buildError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const ROUTE_RULES = {
  entrega: { origen: 'bodega', destino: 'planta' },
  prestamo: { origen: 'bodega', destino: 'planta' },
  traslado: { origen: 'bodega', destino: 'bodega' },
};

class EntregasService {
  static async validateWorkerActive(client, trabajadorId) {
    const { rows } = await client.query(
      `
      SELECT t.id, t.estado, p.estado AS persona_estado
      FROM trabajador t
      INNER JOIN persona p ON p.id = t.persona_id
      WHERE t.id = $1
      LIMIT 1
      `,
      [trabajadorId]
    );

    if (!rows.length) {
      throw buildError('Trabajador no encontrado', 400);
    }

    const worker = rows[0];
    if (worker.estado !== 'activo' || worker.persona_estado !== 'activo') {
      throw buildError('El trabajador debe estar activo para recibir movimientos', 400);
    }
  }

  static async list(filters = {}) {
    const values = [];
    const conditions = [];

    if (filters.estado) {
      values.push(filters.estado);
      conditions.push(`e.estado = $${values.length}`);
    }

    if (filters.trabajador_id) {
      values.push(filters.trabajador_id);
      conditions.push(`e.trabajador_id = $${values.length}`);
    }

    if (filters.creado_por_usuario_id) {
      values.push(filters.creado_por_usuario_id);
      conditions.push(`e.creado_por_usuario_id = $${values.length}`);
    }

    let query = `
      SELECT
        e.*,
        p.nombres,
        p.apellidos
      FROM entrega e
      INNER JOIN trabajador t ON t.id = e.trabajador_id
      INNER JOIN persona p ON p.id = t.persona_id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY e.creado_en DESC';

    const { rows } = await db.query(query, values);
    return rows;
  }

  static async getById(id) {
    const entregaResult = await db.query(
      `
      SELECT
        e.*,
        p.rut,
        p.nombres,
        p.apellidos
      FROM entrega e
      INNER JOIN trabajador t ON t.id = e.trabajador_id
      INNER JOIN persona p ON p.id = t.persona_id
      WHERE e.id = $1
      `,
      [id]
    );

    if (!entregaResult.rows.length) {
      throw buildError('Entrega not found', 404);
    }

    const detalleResult = await db.query(
      `
      SELECT
        d.*,
        a.nombre AS articulo_nombre,
        a.tracking_mode,
        a.retorno_mode,
        ac.codigo AS activo_codigo,
        l.codigo_lote
      FROM entrega_detalle d
      INNER JOIN articulo a ON a.id = d.articulo_id
      LEFT JOIN activo ac ON ac.id = d.activo_id
      LEFT JOIN lote l ON l.id = d.lote_id
      WHERE d.entrega_id = $1
      ORDER BY d.id
      `,
      [id]
    );

    return {
      ...entregaResult.rows[0],
      detalles: detalleResult.rows,
    };
  }

  static async getLocationsByIds(client, locationIds) {
    if (!locationIds.length) {
      return new Map();
    }

    const { rows } = await client.query(
      `
      SELECT id, tipo, estado
      FROM ubicacion
      WHERE id = ANY($1::uuid[])
      `,
      [locationIds]
    );

    return new Map(rows.map((row) => [row.id, row]));
  }

  static async validateMovementRoute(client, entregaLike) {
    const rule = ROUTE_RULES[entregaLike.tipo];
    if (!rule) {
      throw buildError(`Tipo de movimiento no soportado: ${entregaLike.tipo}`, 400);
    }

    if (entregaLike.ubicacion_origen_id === entregaLike.ubicacion_destino_id) {
      throw buildError('La ubicación de origen y destino deben ser diferentes', 400);
    }

    const locations = await this.getLocationsByIds(client, [
      entregaLike.ubicacion_origen_id,
      entregaLike.ubicacion_destino_id,
    ]);

    const origen = locations.get(entregaLike.ubicacion_origen_id);
    const destino = locations.get(entregaLike.ubicacion_destino_id);

    if (!origen) {
      throw buildError('La ubicación de origen no existe', 400);
    }

    if (!destino) {
      throw buildError('La ubicación de destino no existe', 400);
    }

    if (origen.estado !== 'activo' || destino.estado !== 'activo') {
      throw buildError('Las ubicaciones de origen y destino deben estar activas', 400);
    }

    if (origen.tipo !== rule.origen || destino.tipo !== rule.destino) {
      throw buildError(
        `Ruta inválida para "${entregaLike.tipo}": se requiere ${rule.origen} → ${rule.destino}`,
        400
      );
    }
  }

  static async validateDetailRules(client, detalles) {
    const articleIds = Array.from(new Set(detalles.map((item) => item.articulo_id).filter(Boolean)));
    const activeIds = Array.from(new Set(detalles.map((item) => item.activo_id).filter(Boolean)));

    const articleResult = await client.query(
      `
      SELECT id, nombre, tracking_mode, retorno_mode
      FROM articulo
      WHERE id = ANY($1::uuid[])
      `,
      [articleIds]
    );

    const articleMap = new Map(articleResult.rows.map((row) => [row.id, row]));

    let activeMap = new Map();
    if (activeIds.length) {
      const activeResult = await client.query(
        `
        SELECT id, articulo_id
        FROM activo
        WHERE id = ANY($1::uuid[])
        `,
        [activeIds]
      );

      activeMap = new Map(activeResult.rows.map((row) => [row.id, row]));
    }

    for (const detalle of detalles) {
      const article = articleMap.get(detalle.articulo_id);
      if (!article) {
        throw buildError(`Artículo ${detalle.articulo_id} no encontrado`, 400);
      }

      const quantity = Number(detalle.cantidad);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw buildError(`Cantidad inválida para artículo ${detalle.articulo_id}`, 400);
      }

      if (article.retorno_mode === 'consumible' && detalle.activo_id) {
        throw buildError(
          `El artículo ${article.nombre} es consumible y no puede entregarse por activo_id`,
          400
        );
      }

      if (article.tracking_mode === 'serial') {
        if (!detalle.activo_id) {
          throw buildError(
            `El artículo ${article.nombre} requiere activo_id por ser tracking_mode "serial"`,
            400
          );
        }

        if (quantity !== 1) {
          throw buildError(
            `El artículo ${article.nombre} con tracking serial requiere cantidad 1`,
            400
          );
        }
      } else if (detalle.activo_id) {
        throw buildError(
          `El artículo ${article.nombre} no usa tracking serial y no admite activo_id`,
          400
        );
      }

      if (article.retorno_mode === 'retornable' && article.tracking_mode !== 'serial') {
        throw buildError(
          `Configuración inconsistente del artículo ${article.nombre}: retornable debe ser serial`,
          400
        );
      }

      if (detalle.activo_id) {
        const active = activeMap.get(detalle.activo_id);
        if (!active) {
          throw buildError(`Activo ${detalle.activo_id} no encontrado`, 400);
        }

        if (active.articulo_id !== detalle.articulo_id) {
          throw buildError(
            `El activo ${detalle.activo_id} no corresponde al artículo ${detalle.articulo_id}`,
            400
          );
        }
      }
    }
  }

  static async create(payload, userId) {
    const detalles = Array.isArray(payload.detalles) ? payload.detalles : [];
    if (detalles.length === 0) {
      throw buildError('Debe incluir al menos un detalle en la entrega', 400);
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      await this.validateMovementRoute(client, payload);
      await this.validateWorkerActive(client, payload.trabajador_id);

      if (payload.transportista_trabajador_id) {
        await this.validateWorkerActive(client, payload.transportista_trabajador_id);
      }

      if (payload.receptor_trabajador_id) {
        await this.validateWorkerActive(client, payload.receptor_trabajador_id);
      }

      await this.validateDetailRules(client, detalles);

      const entregaResult = await client.query(
        `
        INSERT INTO entrega (
          creado_por_usuario_id,
          trabajador_id,
          transportista_trabajador_id,
          receptor_trabajador_id,
          ubicacion_origen_id,
          ubicacion_destino_id,
          tipo,
          estado,
          nota_destino
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'borrador', $8)
        RETURNING id
        `,
        [
          userId,
          payload.trabajador_id,
          payload.transportista_trabajador_id || payload.trabajador_id,
          payload.receptor_trabajador_id || null,
          payload.ubicacion_origen_id,
          payload.ubicacion_destino_id,
          payload.tipo,
          payload.nota_destino || null,
        ]
      );

      const entregaId = entregaResult.rows[0].id;

      for (const detalle of detalles) {
        await client.query(
          `
          INSERT INTO entrega_detalle (
            entrega_id, articulo_id, activo_id, lote_id, cantidad, condicion_salida, notas
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            entregaId,
            detalle.articulo_id,
            detalle.activo_id || null,
            detalle.lote_id || null,
            detalle.cantidad,
            detalle.condicion_salida || 'ok',
            detalle.notas || null,
          ]
        );
      }

      await writeAuditEvent({
        client,
        entidadTipo: 'entrega',
        entidadId: entregaId,
        accion: 'crear',
        usuarioId: userId,
        diff: {
          tipo: payload.tipo,
          trabajador_id: payload.trabajador_id,
          transportista_trabajador_id: payload.transportista_trabajador_id || null,
          receptor_trabajador_id: payload.receptor_trabajador_id || null,
          ubicacion_origen_id: payload.ubicacion_origen_id,
          ubicacion_destino_id: payload.ubicacion_destino_id,
          detalles_count: detalles.length,
        },
      });

      await client.query('COMMIT');
      return this.getById(entregaId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async confirm(id, userId) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const entregaResult = await client.query(
        `
        SELECT *
        FROM entrega
        WHERE id = $1
        FOR UPDATE
        `,
        [id]
      );

      if (!entregaResult.rows.length) {
        throw buildError('Entrega not found', 404);
      }

      const entrega = entregaResult.rows[0];
      if (!['borrador', 'pendiente_firma'].includes(entrega.estado)) {
        throw buildError(`No se puede confirmar una entrega en estado "${entrega.estado}"`, 400);
      }

      const signatureResult = await client.query(
        `
        SELECT id
        FROM firma_entrega
        WHERE entrega_id = $1
        LIMIT 1
        `,
        [id]
      );

      if (!signatureResult.rows.length) {
        throw buildError(
          'No se puede confirmar la entrega sin una firma de recepción registrada',
          400
        );
      }

      const detalleResult = await client.query(
        `
        SELECT *
        FROM entrega_detalle
        WHERE entrega_id = $1
        ORDER BY id
        `,
        [id]
      );

      const detalles = detalleResult.rows;
      if (detalles.length === 0) {
        throw buildError('La entrega no tiene detalles', 400);
      }

      await this.validateMovementRoute(client, entrega);
      await this.validateDetailRules(client, detalles);

      const movementType = entrega.tipo === 'traslado' ? 'traslado' : 'entrega';

      for (const detalle of detalles) {
        if (detalle.activo_id) {
          const activoResult = await client.query(
            `
            SELECT *
            FROM activo
            WHERE id = $1
            FOR UPDATE
            `,
            [detalle.activo_id]
          );

          if (!activoResult.rows.length) {
            throw buildError(`Activo ${detalle.activo_id} no encontrado`, 400);
          }

          const activo = activoResult.rows[0];
          if (activo.estado !== 'en_stock') {
            throw buildError(`Activo ${detalle.activo_id} no está disponible para entrega`, 400);
          }

          if (activo.ubicacion_actual_id !== entrega.ubicacion_origen_id) {
            throw buildError(`Activo ${detalle.activo_id} no está en la ubicación de origen`, 400);
          }

          const newAssetState = entrega.tipo === 'traslado' ? 'en_traslado' : 'asignado';
          const newAssetLocation = entrega.tipo === 'traslado'
            ? entrega.ubicacion_origen_id
            : entrega.ubicacion_destino_id;

          await client.query(
            `
            UPDATE activo
            SET estado = $1, ubicacion_actual_id = $2
            WHERE id = $3
            `,
            [newAssetState, newAssetLocation, detalle.activo_id]
          );

          await client.query(
            `
            INSERT INTO movimiento_activo (
              activo_id,
              tipo,
              ubicacion_origen_id,
              ubicacion_destino_id,
              responsable_usuario_id,
              entrega_id,
              notas
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            `,
            [
              detalle.activo_id,
              movementType,
              entrega.ubicacion_origen_id,
              entrega.ubicacion_destino_id,
              userId,
              entrega.id,
              detalle.notas || null,
            ]
          );

          if (entrega.tipo !== 'traslado') {
            await client.query(
              `
              INSERT INTO custodia_activo (
                activo_id,
                trabajador_id,
                ubicacion_destino_id,
                entrega_id,
                estado
              )
              VALUES ($1, $2, $3, $4, 'activa')
              `,
              [
                detalle.activo_id,
                entrega.trabajador_id,
                entrega.ubicacion_destino_id,
                entrega.id,
              ]
            );
          }
        } else {
          const originStockResult = await client.query(
            `
            SELECT *
            FROM stock
            WHERE ubicacion_id = $1
              AND articulo_id = $2
              AND lote_id IS NOT DISTINCT FROM $3
            FOR UPDATE
            `,
            [entrega.ubicacion_origen_id, detalle.articulo_id, detalle.lote_id]
          );

          if (!originStockResult.rows.length) {
            throw buildError(
              `No existe stock de artículo ${detalle.articulo_id} en la ubicación origen`,
              400
            );
          }

          const originStock = originStockResult.rows[0];
          const qty = Number(detalle.cantidad);
          if (Number(originStock.cantidad_disponible) < qty) {
            throw buildError(
              `Stock insuficiente para artículo ${detalle.articulo_id} en ubicación origen`,
              400
            );
          }

          await client.query(
            `
            UPDATE stock
            SET cantidad_disponible = cantidad_disponible - $1,
                actualizado_en = NOW()
            WHERE id = $2
            `,
            [qty, originStock.id]
          );

          if (detalle.lote_id) {
            await client.query(
              `
              INSERT INTO stock (
                ubicacion_id, articulo_id, lote_id, cantidad_disponible, cantidad_reservada
              )
              VALUES ($1, $2, $3, $4, 0)
              ON CONFLICT (ubicacion_id, articulo_id, lote_id) WHERE lote_id IS NOT NULL
              DO UPDATE SET
                cantidad_disponible = stock.cantidad_disponible + EXCLUDED.cantidad_disponible,
                actualizado_en = NOW()
              `,
              [entrega.ubicacion_destino_id, detalle.articulo_id, detalle.lote_id, qty]
            );
          } else {
            await client.query(
              `
              INSERT INTO stock (
                ubicacion_id, articulo_id, lote_id, cantidad_disponible, cantidad_reservada
              )
              VALUES ($1, $2, NULL, $3, 0)
              ON CONFLICT (ubicacion_id, articulo_id) WHERE lote_id IS NULL
              DO UPDATE SET
                cantidad_disponible = stock.cantidad_disponible + EXCLUDED.cantidad_disponible,
                actualizado_en = NOW()
              `,
              [entrega.ubicacion_destino_id, detalle.articulo_id, qty]
            );
          }

          await client.query(
            `
            INSERT INTO movimiento_stock (
              articulo_id,
              lote_id,
              tipo,
              ubicacion_origen_id,
              ubicacion_destino_id,
              cantidad,
              responsable_usuario_id,
              entrega_id,
              notas
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `,
            [
              detalle.articulo_id,
              detalle.lote_id || null,
              movementType,
              entrega.ubicacion_origen_id,
              entrega.ubicacion_destino_id,
              qty,
              userId,
              entrega.id,
              detalle.notas || null,
            ]
          );
        }
      }

      await client.query(
        `
        UPDATE entrega
        SET estado = $2,
            confirmada_en = CASE WHEN $2 = 'confirmada' THEN NOW() ELSE confirmada_en END
        WHERE id = $1
        `,
        [id, entrega.tipo === 'traslado' ? 'en_transito' : 'confirmada']
      );

      await writeAuditEvent({
        client,
        entidadTipo: 'entrega',
        entidadId: id,
        accion: 'actualizar',
        usuarioId: userId,
        diff: {
          estado_anterior: entrega.estado,
          estado_nuevo: entrega.tipo === 'traslado' ? 'en_transito' : 'confirmada',
          tipo: entrega.tipo,
        },
      });

      await client.query('COMMIT');
      return this.getById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async anular(id, userId, motivo) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const normalizedMotivo = String(motivo || '').trim();
      if (normalizedMotivo.length < 5) {
        throw buildError('Debe indicar un motivo de anulación de al menos 5 caracteres', 400);
      }

      const entregaResult = await client.query(
        `SELECT * FROM entrega WHERE id = $1 FOR UPDATE`,
        [id]
      );

      if (!entregaResult.rows.length) {
        throw buildError('Entrega no encontrada', 404);
      }

      const entrega = entregaResult.rows[0];
      if (!['borrador', 'pendiente_firma'].includes(entrega.estado)) {
        throw buildError(
          `No se puede anular una entrega en estado "${entrega.estado}"`,
          400
        );
      }

      await client.query(
        `
        UPDATE entrega
        SET estado = 'anulada',
            motivo_anulacion = $2
        WHERE id = $1
        `,
        [id, normalizedMotivo]
      );

      await writeAuditEvent({
        client,
        entidadTipo: 'entrega',
        entidadId: id,
        accion: 'actualizar',
        usuarioId: userId,
        diff: {
          estado_anterior: entrega.estado,
          estado_nuevo: 'anulada',
          tipo: entrega.tipo,
          motivo_anulacion: normalizedMotivo,
        },
      });

      // No se revierten movimientos de stock porque la entrega nunca fue confirmada
      await client.query('COMMIT');
      return this.getById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async recibirTraslado(id, userId, payload = {}) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const entregaResult = await client.query(
        `
        SELECT *
        FROM entrega
        WHERE id = $1
        FOR UPDATE
        `,
        [id]
      );

      if (!entregaResult.rows.length) {
        throw buildError('Entrega no encontrada', 404);
      }

      const entrega = entregaResult.rows[0];
      if (entrega.tipo !== 'traslado') {
        throw buildError('Solo se puede recibir formalmente un movimiento de tipo traslado', 400);
      }

      if (entrega.estado !== 'en_transito') {
        throw buildError(
          `No se puede recibir un traslado en estado "${entrega.estado}"`,
          400
        );
      }

      await this.validateMovementRoute(client, entrega);

      if (payload.receptor_trabajador_id) {
        await this.validateWorkerActive(client, payload.receptor_trabajador_id);
      }

      const detalleResult = await client.query(
        `
        SELECT *
        FROM entrega_detalle
        WHERE entrega_id = $1
        ORDER BY id
        FOR UPDATE
        `,
        [id]
      );

      const detalles = detalleResult.rows;
      for (const detalle of detalles) {
        if (!detalle.activo_id) {
          continue;
        }

        const activoResult = await client.query(
          `
          SELECT *
          FROM activo
          WHERE id = $1
          FOR UPDATE
          `,
          [detalle.activo_id]
        );

        if (!activoResult.rows.length) {
          throw buildError(`Activo ${detalle.activo_id} no encontrado`, 400);
        }

        await client.query(
          `
          UPDATE activo
          SET estado = 'en_stock',
              ubicacion_actual_id = $2
          WHERE id = $1
          `,
          [detalle.activo_id, entrega.ubicacion_destino_id]
        );
      }

      await client.query(
        `
        UPDATE entrega
        SET estado = 'recibido',
            receptor_trabajador_id = COALESCE($2, receptor_trabajador_id),
            recibido_por_usuario_id = $3,
            recibido_en = NOW(),
            confirmada_en = NOW()
        WHERE id = $1
        `,
        [id, payload.receptor_trabajador_id || null, userId]
      );

      await writeAuditEvent({
        client,
        entidadTipo: 'entrega',
        entidadId: id,
        accion: 'actualizar',
        usuarioId: userId,
        diff: {
          estado_anterior: entrega.estado,
          estado_nuevo: 'recibido',
          tipo: entrega.tipo,
          receptor_trabajador_id: payload.receptor_trabajador_id || entrega.receptor_trabajador_id || null,
        },
      });

      await client.query('COMMIT');
      return this.getById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = EntregasService;
