const db = require('../db');

const buildError = (message, statusCode = 400, code = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) {
    error.code = code;
  }
  return error;
};

const toQuantity = (value) => {
  const qty = Number(value);
  if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
    throw buildError('La cantidad debe ser mayor que cero', 400, 'INVALID_QUANTITY');
  }
  return qty;
};

const toCost = (value) => {
  const cost = Number(value);
  if (!Number.isFinite(cost) || cost < 0) {
    throw buildError('El costo unitario debe ser mayor o igual a cero', 400, 'INVALID_COST');
  }
  return Math.round(cost);
};

class ComprasService {
  static async list(filters = {}) {
    const values = [];
    const conditions = [];

    if (filters.creado_por_usuario_id) {
      values.push(filters.creado_por_usuario_id);
      conditions.push(`c.creado_por_usuario_id = $${values.length}`);
    }

    if (filters.proveedor_id) {
      values.push(filters.proveedor_id);
      conditions.push(`dc.proveedor_id = $${values.length}`);
    }

    let query = `
      SELECT
        c.*,
        dc.tipo AS documento_tipo,
        dc.numero AS documento_numero,
        dc.fecha AS documento_fecha,
        p.nombre AS proveedor_nombre,
        COUNT(cd.id)::int AS cantidad_items,
        COALESCE(SUM(cd.cantidad), 0) AS cantidad_total
      FROM compra c
      LEFT JOIN documento_compra dc ON dc.id = c.documento_compra_id
      LEFT JOIN proveedor p ON p.id = dc.proveedor_id
      LEFT JOIN compra_detalle cd ON cd.compra_id = c.id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
      GROUP BY c.id, dc.id, p.id
      ORDER BY c.creado_en DESC
    `;

    const { rows } = await db.query(query, values);
    return rows;
  }

  static async getById(id) {
    const compraResult = await db.query(
      `
      SELECT
        c.*,
        dc.tipo AS documento_tipo,
        dc.numero AS documento_numero,
        dc.fecha AS documento_fecha,
        dc.archivo_url AS documento_archivo_url,
        p.id AS proveedor_id,
        p.nombre AS proveedor_nombre,
        p.rut AS proveedor_rut,
        p.email AS proveedor_email,
        p.telefono AS proveedor_telefono
      FROM compra c
      LEFT JOIN documento_compra dc ON dc.id = c.documento_compra_id
      LEFT JOIN proveedor p ON p.id = dc.proveedor_id
      WHERE c.id = $1
      `,
      [id]
    );

    if (!compraResult.rows.length) {
      throw buildError('Compra no encontrada', 404, 'PURCHASE_NOT_FOUND');
    }

    const detallesResult = await db.query(
      `
      SELECT
        cd.*,
        a.nombre AS articulo_nombre,
        a.tracking_mode,
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', ac.id,
                'codigo', ac.codigo,
                'nro_serie', ac.nro_serie,
                'estado', ac.estado,
                'ubicacion_actual_id', ac.ubicacion_actual_id,
                'fecha_vencimiento', ac.fecha_vencimiento
              )
            ),
            '[]'::json
          )
          FROM activo ac
          WHERE ac.compra_detalle_id = cd.id
        ) AS activos
      FROM compra_detalle cd
      INNER JOIN articulo a ON a.id = cd.articulo_id
      WHERE cd.compra_id = $1
      ORDER BY cd.id
      `,
      [id]
    );

    return {
      ...compraResult.rows[0],
      detalles: detallesResult.rows,
    };
  }

  static async create(payload, userId) {
    const detalles = Array.isArray(payload.detalles) ? payload.detalles : [];
    if (!detalles.length) {
      throw buildError('Debe incluir al menos un detalle en la compra', 400, 'DETAIL_REQUIRED');
    }

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const documentInfo = await this.resolvePurchaseDocument(client, payload);
      const compraResult = await client.query(
        `
        INSERT INTO compra (
          documento_compra_id,
          creado_por_usuario_id,
          notas
        )
        VALUES ($1, $2, $3)
        RETURNING id
        `,
        [documentInfo.documentoCompraId, userId, payload.notas || null]
      );

      const compraId = compraResult.rows[0].id;
      const purchaseDate = payload.fecha_compra || documentInfo.documentoFecha || null;

      for (const detalle of detalles) {
        const qty = toQuantity(detalle.cantidad);
        const cost = toCost(detalle.costo_unitario);

        if (!detalle.ubicacion_id) {
          throw buildError(
            'Cada detalle de compra debe incluir ubicacion_id para ingreso de inventario',
            400,
            'LOCATION_REQUIRED'
          );
        }

        const ubicacionResult = await client.query(
          `
          SELECT id
          FROM ubicacion
          WHERE id = $1
          `,
          [detalle.ubicacion_id]
        );

        if (!ubicacionResult.rows.length) {
          throw buildError(
            `Ubicación ${detalle.ubicacion_id} no encontrada`,
            400,
            'LOCATION_NOT_FOUND'
          );
        }

        const articuloResult = await client.query(
          `
          SELECT *
          FROM articulo
          WHERE id = $1
          FOR UPDATE
          `,
          [detalle.articulo_id]
        );

        if (!articuloResult.rows.length) {
          throw buildError(`Artículo ${detalle.articulo_id} no encontrado`, 400, 'ARTICLE_NOT_FOUND');
        }

        const articulo = articuloResult.rows[0];

        const compraDetalleResult = await client.query(
          `
          INSERT INTO compra_detalle (
            compra_id,
            articulo_id,
            cantidad,
            costo_unitario,
            notas
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
          `,
          [compraId, detalle.articulo_id, qty, cost, detalle.notas || null]
        );

        const compraDetalleId = compraDetalleResult.rows[0].id;

        if (articulo.tracking_mode === 'serial') {
          await this.ingresarArticulosSerializados(client, {
            compraId,
            compraDetalleId,
            articulo,
            detalle,
            qty,
            userId,
            purchaseDate,
          });
        } else {
          await this.ingresarArticulosConStock(client, {
            compraId,
            compraDetalleId,
            articulo,
            detalle,
            qty,
            userId,
          });
        }
      }

      await client.query('COMMIT');
      return this.getById(compraId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async resolvePurchaseDocument(client, payload) {
    if (payload.documento_compra_id) {
      const existingDocumentResult = await client.query(
        `
        SELECT id, fecha
        FROM documento_compra
        WHERE id = $1
        `,
        [payload.documento_compra_id]
      );

      if (!existingDocumentResult.rows.length) {
        throw buildError('Documento de compra no encontrado', 400, 'DOCUMENT_NOT_FOUND');
      }

      return {
        documentoCompraId: existingDocumentResult.rows[0].id,
        documentoFecha: existingDocumentResult.rows[0].fecha,
      };
    }

    const documentoCompra = payload.documento_compra;
    if (!documentoCompra) {
      return {
        documentoCompraId: null,
        documentoFecha: null,
      };
    }

    const proveedorResult = await client.query(
      `
      SELECT id
      FROM proveedor
      WHERE id = $1
      `,
      [documentoCompra.proveedor_id]
    );

    if (!proveedorResult.rows.length) {
      throw buildError('Proveedor no encontrado', 400, 'SUPPLIER_NOT_FOUND');
    }

    const documentoResult = await client.query(
      `
      INSERT INTO documento_compra (
        proveedor_id,
        tipo,
        numero,
        fecha,
        archivo_url
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (tipo, numero)
      DO UPDATE SET
        proveedor_id = EXCLUDED.proveedor_id,
        fecha = EXCLUDED.fecha,
        archivo_url = COALESCE(EXCLUDED.archivo_url, documento_compra.archivo_url)
      RETURNING id, fecha
      `,
      [
        documentoCompra.proveedor_id,
        documentoCompra.tipo,
        documentoCompra.numero,
        documentoCompra.fecha,
        documentoCompra.archivo_url || null,
      ]
    );

    return {
      documentoCompraId: documentoResult.rows[0].id,
      documentoFecha: documentoResult.rows[0].fecha,
    };
  }

  static async ingresarArticulosSerializados(client, context) {
    const activos = Array.isArray(context.detalle.activos) ? context.detalle.activos : [];
    if (!activos.length) {
      throw buildError(
        `El artículo ${context.articulo.nombre} requiere activos serializados`,
        400,
        'SERIAL_ASSETS_REQUIRED'
      );
    }

    const expectedQty = Number.isInteger(context.qty) ? context.qty : null;
    if (expectedQty !== null && activos.length !== expectedQty) {
      throw buildError(
        `La cantidad de activos (${activos.length}) no coincide con la cantidad declarada (${context.qty})`,
        400,
        'SERIAL_ASSETS_MISMATCH'
      );
    }

    for (const activo of activos) {
      const codigo = String(activo.codigo || '').trim();
      if (!codigo) {
        throw buildError('Cada activo serializado debe incluir codigo', 400, 'ASSET_CODE_REQUIRED');
      }

      const assetResult = await client.query(
        `
        INSERT INTO activo (
          articulo_id,
          compra_detalle_id,
          nro_serie,
          codigo,
          valor,
          estado,
          ubicacion_actual_id,
          fecha_compra,
          fecha_vencimiento
        )
        VALUES ($1, $2, $3, $4, $5, 'en_stock', $6, $7, $8)
        RETURNING id
        `,
        [
          context.articulo.id,
          context.compraDetalleId,
          activo.nro_serie || null,
          codigo,
          activo.valor || null,
          context.detalle.ubicacion_id,
          context.purchaseDate,
          activo.fecha_vencimiento || null,
        ]
      );

      await client.query(
        `
        INSERT INTO movimiento_activo (
          activo_id,
          tipo,
          ubicacion_origen_id,
          ubicacion_destino_id,
          responsable_usuario_id,
          notas
        )
        VALUES ($1, 'entrada', NULL, $2, $3, $4)
        `,
        [
          assetResult.rows[0].id,
          context.detalle.ubicacion_id,
          context.userId,
          `Ingreso por compra ${context.compraId}`,
        ]
      );
    }
  }

  static async ingresarArticulosConStock(client, context) {
    await client.query(
      `
      INSERT INTO stock (
        ubicacion_id,
        articulo_id,
        lote_id,
        cantidad_disponible,
        cantidad_reservada
      )
      VALUES ($1, $2, NULL, $3, 0)
      ON CONFLICT (ubicacion_id, articulo_id) WHERE lote_id IS NULL
      DO UPDATE SET
        cantidad_disponible = stock.cantidad_disponible + EXCLUDED.cantidad_disponible,
        actualizado_en = NOW()
      `,
      [context.detalle.ubicacion_id, context.articulo.id, context.qty]
    );

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
        compra_id,
        notas
      )
      VALUES ($1, $2, 'entrada', NULL, $3, $4, $5, $6, $7)
      `,
      [
        context.articulo.id,
        null,
        context.detalle.ubicacion_id,
        context.qty,
        context.userId,
        context.compraId,
        context.detalle.notas || null,
      ]
    );
  }

  static async deleteIngreso(id, userId) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Verificar que el ingreso existe
      const compraCheck = await client.query(
        `SELECT id, creado_por_usuario_id FROM compra WHERE id = $1`,
        [id]
      );

      if (!compraCheck.rows.length) {
        throw buildError('Ingreso no encontrado', 404, 'INGRESO_NOT_FOUND');
      }

      const actorUserId = userId || compraCheck.rows[0].creado_por_usuario_id;

      // 2. Obtener todos los movimientos de entrada asociados a esta compra
      const movimientosResult = await client.query(
        `
        SELECT
          ms.articulo_id,
          ms.lote_id,
          ms.ubicacion_destino_id AS ubicacion_id,
          ms.cantidad
        FROM movimiento_stock ms
        WHERE ms.compra_id = $1
          AND ms.tipo = 'entrada'
        `,
        [id]
      );

      // 3. Verificar que el stock disponible es suficiente para revertir cada movimiento
      for (const mov of movimientosResult.rows) {
        let stockResult;

        if (mov.lote_id) {
          stockResult = await client.query(
            `
            SELECT cantidad_disponible
            FROM stock
            WHERE articulo_id = $1
              AND lote_id = $2
              AND ubicacion_id = $3
            FOR UPDATE
            `,
            [mov.articulo_id, mov.lote_id, mov.ubicacion_id]
          );
        } else {
          stockResult = await client.query(
            `
            SELECT cantidad_disponible
            FROM stock
            WHERE articulo_id = $1
              AND lote_id IS NULL
              AND ubicacion_id = $2
            FOR UPDATE
            `,
            [mov.articulo_id, mov.ubicacion_id]
          );
        }

        const stockActual = Number(stockResult.rows[0]?.cantidad_disponible ?? 0);
        if (stockActual < Number(mov.cantidad)) {
          throw buildError(
            `No se puede eliminar el ingreso: el stock disponible (${stockActual}) es insuficiente para revertir la cantidad ingresada (${mov.cantidad}). El artículo ya tiene movimientos comprometidos.`,
            409,
            'STOCK_INSUFICIENTE_REVERTIR'
          );
        }
      }

      // 4. Revertir el stock para cada movimiento de entrada
      for (const mov of movimientosResult.rows) {
        if (mov.lote_id) {
          await client.query(
            `
            UPDATE stock
            SET
              cantidad_disponible = cantidad_disponible - $1,
              actualizado_en = NOW()
            WHERE articulo_id = $2
              AND lote_id = $3
              AND ubicacion_id = $4
            `,
            [mov.cantidad, mov.articulo_id, mov.lote_id, mov.ubicacion_id]
          );
        } else {
          await client.query(
            `
            UPDATE stock
            SET
              cantidad_disponible = cantidad_disponible - $1,
              actualizado_en = NOW()
            WHERE articulo_id = $2
              AND lote_id IS NULL
              AND ubicacion_id = $3
            `,
            [mov.cantidad, mov.articulo_id, mov.ubicacion_id]
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
            compra_id,
            notas
          )
          VALUES ($1, $2, 'salida', $3, NULL, $4, $5, $6, $7)
          `,
          [
            mov.articulo_id,
            mov.lote_id,
            mov.ubicacion_id,
            mov.cantidad,
            actorUserId,
            id,
            `[reversion_ingreso:${id}]`,
          ]
        );
      }

      // 5. Eliminar la compra (cascade elimina compra_detalle;
      //    lote.compra_detalle_id queda en NULL por ON DELETE SET NULL)
      await client.query(
        `DELETE FROM compra WHERE id = $1`,
        [id]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = ComprasService;
