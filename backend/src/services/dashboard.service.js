const db = require('../db');

class DashboardService {
  static async getDashboardSummary() {
    const [
      activosResult,
      entregasResult,
      devolucionesResult,
      firmasResult,
      stockResult,
      movimientosStockRecentResult,
      movimientosActivoRecentResult,
      articulosTopResult,
    ] = await Promise.all([
      db.query(
        `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE estado = 'en_stock')::int AS en_stock,
          COUNT(*) FILTER (WHERE estado = 'asignado')::int AS asignado,
          COUNT(*) FILTER (WHERE estado = 'mantencion')::int AS mantencion,
          COUNT(*) FILTER (WHERE estado = 'perdido')::int AS perdido,
          COUNT(*) FILTER (WHERE estado = 'dado_de_baja')::int AS dado_de_baja
        FROM activo
        `
      ),
      db.query(
        `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE estado = 'borrador')::int AS borrador,
          COUNT(*) FILTER (WHERE estado = 'pendiente_firma')::int AS pendiente_firma,
          COUNT(*) FILTER (WHERE estado = 'confirmada')::int AS confirmada,
          COUNT(*) FILTER (WHERE confirmada_en >= NOW() - INTERVAL '30 days')::int AS confirmadas_30d
        FROM entrega
        `
      ),
      db.query(
        `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE estado = 'borrador')::int AS borrador,
          COUNT(*) FILTER (WHERE estado = 'confirmada')::int AS confirmada,
          COUNT(*) FILTER (WHERE estado = 'anulada')::int AS anulada,
          COUNT(*) FILTER (WHERE confirmada_en >= NOW() - INTERVAL '30 days')::int AS confirmadas_30d
        FROM devolucion
        `
      ),
      db.query(
        `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE firmado_en >= NOW() - INTERVAL '30 days')::int AS firmadas_30d
        FROM firma_entrega
        `
      ),
      db.query(
        `
        SELECT
          COALESCE(SUM(cantidad_disponible), 0) AS total_disponible,
          COALESCE(SUM(cantidad_reservada), 0) AS total_reservado,
          COUNT(*) FILTER (WHERE cantidad_disponible <= 0)::int AS registros_agotados
        FROM stock
        `
      ),
      db.query(
        `
        SELECT
          ms.id,
          'stock' AS origen,
          ms.fecha_movimiento,
          ms.tipo,
          ms.cantidad,
          a.nombre AS articulo_nombre,
          uo.nombre AS ubicacion_origen_nombre,
          ud.nombre AS ubicacion_destino_nombre
        FROM movimiento_stock ms
        INNER JOIN articulo a ON a.id = ms.articulo_id
        LEFT JOIN ubicacion uo ON uo.id = ms.ubicacion_origen_id
        LEFT JOIN ubicacion ud ON ud.id = ms.ubicacion_destino_id
        ORDER BY ms.fecha_movimiento DESC
        LIMIT 8
        `
      ),
      db.query(
        `
        SELECT
          ma.id,
          'activo' AS origen,
          ma.fecha_movimiento,
          ma.tipo,
          a.codigo AS activo_codigo,
          ar.nombre AS articulo_nombre,
          uo.nombre AS ubicacion_origen_nombre,
          ud.nombre AS ubicacion_destino_nombre
        FROM movimiento_activo ma
        INNER JOIN activo a ON a.id = ma.activo_id
        INNER JOIN articulo ar ON ar.id = a.articulo_id
        LEFT JOIN ubicacion uo ON uo.id = ma.ubicacion_origen_id
        LEFT JOIN ubicacion ud ON ud.id = ma.ubicacion_destino_id
        ORDER BY ma.fecha_movimiento DESC
        LIMIT 8
        `
      ),
      db.query(
        `
        SELECT
          a.id,
          a.nombre,
          COUNT(ms.id)::int AS movimientos_30d,
          COALESCE(SUM(ms.cantidad), 0) AS cantidad_30d
        FROM articulo a
        LEFT JOIN movimiento_stock ms ON ms.articulo_id = a.id
          AND ms.fecha_movimiento >= NOW() - INTERVAL '30 days'
        GROUP BY a.id
        ORDER BY movimientos_30d DESC, cantidad_30d DESC
        LIMIT 8
        `
      ),
    ]);

    const activos = activosResult.rows[0];
    const entregas = entregasResult.rows[0];
    const devoluciones = devolucionesResult.rows[0];
    const firmas = firmasResult.rows[0];
    const stock = stockResult.rows[0];

    return {
      activos: {
        total: activos.total || 0,
        en_stock: activos.en_stock || 0,
        asignado: activos.asignado || 0,
        mantencion: activos.mantencion || 0,
        perdido: activos.perdido || 0,
        dado_de_baja: activos.dado_de_baja || 0,
      },
      entregas: {
        total: entregas.total || 0,
        borrador: entregas.borrador || 0,
        pendiente_firma: entregas.pendiente_firma || 0,
        confirmada: entregas.confirmada || 0,
        confirmadas_30d: entregas.confirmadas_30d || 0,
      },
      devoluciones: {
        total: devoluciones.total || 0,
        borrador: devoluciones.borrador || 0,
        confirmada: devoluciones.confirmada || 0,
        anulada: devoluciones.anulada || 0,
        confirmadas_30d: devoluciones.confirmadas_30d || 0,
      },
      firmas: {
        total: firmas.total || 0,
        firmadas_30d: firmas.firmadas_30d || 0,
      },
      stock: {
        total_disponible: Number(stock.total_disponible || 0),
        total_reservado: Number(stock.total_reservado || 0),
        registros_agotados: stock.registros_agotados || 0,
      },
      movimientos_recientes: {
        stock: movimientosStockRecentResult.rows,
        activos: movimientosActivoRecentResult.rows,
      },
      articulos_top_movimiento_30d: articulosTopResult.rows,
    };
  }

  static async getOperationalIndicators() {
    const [stockMovementsResult, assetMovementsResult] = await Promise.all([
      db.query(
        `
        SELECT
          COUNT(*)::int AS total_movimientos,
          COUNT(*) FILTER (WHERE tipo = 'entrada')::int AS entradas,
          COUNT(*) FILTER (WHERE tipo = 'entrega')::int AS entregas,
          COUNT(*) FILTER (WHERE tipo = 'devolucion')::int AS devoluciones,
          COUNT(*) FILTER (WHERE tipo = 'baja')::int AS bajas,
          COALESCE(SUM(cantidad), 0) AS cantidad_total
        FROM movimiento_stock
        WHERE fecha_movimiento >= NOW() - INTERVAL '30 days'
        `
      ),
      db.query(
        `
        SELECT
          COUNT(*)::int AS total_movimientos,
          COUNT(*) FILTER (WHERE tipo = 'entrada')::int AS entradas,
          COUNT(*) FILTER (WHERE tipo = 'entrega')::int AS entregas,
          COUNT(*) FILTER (WHERE tipo = 'devolucion')::int AS devoluciones,
          COUNT(*) FILTER (WHERE tipo = 'mantencion')::int AS mantenciones,
          COUNT(*) FILTER (WHERE tipo = 'baja')::int AS bajas
        FROM movimiento_activo
        WHERE fecha_movimiento >= NOW() - INTERVAL '30 days'
        `
      ),
    ]);

    const stock = stockMovementsResult.rows[0];
    const activos = assetMovementsResult.rows[0];

    return {
      periodo: '30d',
      movimientos_stock: {
        total: stock.total_movimientos || 0,
        entradas: stock.entradas || 0,
        entregas: stock.entregas || 0,
        devoluciones: stock.devoluciones || 0,
        bajas: stock.bajas || 0,
        cantidad_total: Number(stock.cantidad_total || 0),
      },
      movimientos_activo: {
        total: activos.total_movimientos || 0,
        entradas: activos.entradas || 0,
        entregas: activos.entregas || 0,
        devoluciones: activos.devoluciones || 0,
        mantenciones: activos.mantenciones || 0,
        bajas: activos.bajas || 0,
      },
    };
  }

  static async getLocationDashboardSummary(ubicacionId) {
    const [stockResult, activosResult, entregasResult] = await Promise.all([
      db.query(
        `
        SELECT
          COUNT(*)::int AS registros_stock,
          COALESCE(SUM(cantidad_disponible), 0) AS total_disponible,
          COALESCE(SUM(cantidad_reservada), 0) AS total_reservado
        FROM stock
        WHERE ubicacion_id = $1
        `,
        [ubicacionId]
      ),
      db.query(
        `
        SELECT
          COUNT(*)::int AS total_activos,
          COUNT(*) FILTER (WHERE estado = 'en_stock')::int AS en_stock,
          COUNT(*) FILTER (WHERE estado = 'asignado')::int AS asignado,
          COUNT(*) FILTER (WHERE estado = 'mantencion')::int AS mantencion
        FROM activo
        WHERE ubicacion_actual_id = $1
        `,
        [ubicacionId]
      ),
      db.query(
        `
        SELECT
          COUNT(*)::int AS total_entregas,
          COUNT(*) FILTER (WHERE estado = 'pendiente_firma')::int AS pendientes_firma,
          COUNT(*) FILTER (WHERE estado = 'confirmada')::int AS confirmadas
        FROM entrega
        WHERE ubicacion_origen_id = $1
           OR ubicacion_destino_id = $1
        `,
        [ubicacionId]
      ),
    ]);

    return {
      ubicacion_id: ubicacionId,
      stock: {
        registros_stock: stockResult.rows[0].registros_stock || 0,
        total_disponible: Number(stockResult.rows[0].total_disponible || 0),
        total_reservado: Number(stockResult.rows[0].total_reservado || 0),
      },
      activos: {
        total: activosResult.rows[0].total_activos || 0,
        en_stock: activosResult.rows[0].en_stock || 0,
        asignado: activosResult.rows[0].asignado || 0,
        mantencion: activosResult.rows[0].mantencion || 0,
      },
      entregas: {
        total: entregasResult.rows[0].total_entregas || 0,
        pendientes_firma: entregasResult.rows[0].pendientes_firma || 0,
        confirmadas: entregasResult.rows[0].confirmadas || 0,
      },
    };
  }

  static async getCubicMetersDetailedStats() {
    return this.getOperationalIndicators();
  }

  static async getProjectDashboardSummary(ubicacionId) {
    return this.getLocationDashboardSummary(ubicacionId);
  }
}

module.exports = DashboardService;
