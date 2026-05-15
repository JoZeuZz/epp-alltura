const db = require('../db');

class DashboardService {
  static async getDashboardSummary() {
    const [
      activosResult,
      entregasResult,
      devolucionesResult,
      firmasResult,
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
        FROM articulo
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
          a.id,
          a.nombre,
          a.tipo,
          COUNT(e.id)::int AS entregas_30d,
          COUNT(d.id)::int AS devoluciones_30d
        FROM articulo a
        LEFT JOIN entrega_detalle ed ON ed.articulo_id = a.id
        LEFT JOIN entrega e ON e.id = ed.entrega_id
          AND e.confirmada_en >= NOW() - INTERVAL '30 days'
        LEFT JOIN devolucion_detalle dd ON dd.articulo_id = a.id
        LEFT JOIN devolucion d ON d.id = dd.devolucion_id
          AND d.confirmada_en >= NOW() - INTERVAL '30 days'
        GROUP BY a.id
        ORDER BY (COUNT(e.id) + COUNT(d.id)) DESC
        LIMIT 8
        `
      ),
    ]);

    const activos = activosResult.rows[0];
    const entregas = entregasResult.rows[0];
    const devoluciones = devolucionesResult.rows[0];
    const firmas = firmasResult.rows[0];

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
      articulos_top_movimiento_30d: articulosTopResult.rows,
    };
  }

  static async getOperationalIndicators() {
    const [entregasResult, devolucionesResult, articulosResult, ubicacionesResult, firmasResult] = await Promise.all([
      db.query(
        `
        SELECT
          COUNT(*)::int AS total_entregas,
          COUNT(*) FILTER (WHERE estado = 'confirmada')::int AS confirmadas,
          COUNT(*) FILTER (WHERE estado = 'pendiente_firma')::int AS pendientes_firma,
          COUNT(*) FILTER (WHERE confirmada_en >= NOW() - INTERVAL '30 days')::int AS confirmadas_30d
        FROM entrega
        WHERE creado_en >= NOW() - INTERVAL '30 days'
           OR confirmada_en >= NOW() - INTERVAL '30 days'
        `
      ),
      db.query(
        `
        SELECT
          COUNT(*)::int AS total_devoluciones,
          COUNT(*) FILTER (WHERE estado = 'confirmada')::int AS confirmadas,
          COUNT(*) FILTER (WHERE estado = 'anulada')::int AS anuladas,
          COUNT(*) FILTER (WHERE confirmada_en >= NOW() - INTERVAL '30 days')::int AS confirmadas_30d
        FROM devolucion
        WHERE creado_en >= NOW() - INTERVAL '30 days'
           OR confirmada_en >= NOW() - INTERVAL '30 days'
        `
      ),
      db.query(
        `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE estado = 'en_stock')::int AS en_stock,
          COUNT(*) FILTER (WHERE estado = 'asignado')::int AS asignado,
          COUNT(*) FILTER (WHERE estado = 'mantencion')::int AS mantencion,
          COUNT(*) FILTER (WHERE estado = 'dado_de_baja')::int AS dado_de_baja,
          COUNT(*) FILTER (WHERE estado = 'perdido')::int AS perdido,
          COALESCE(SUM(valor), 0) AS valor_total
        FROM articulo
        `
      ),
      db.query(
        `
        SELECT COUNT(*)::int AS bodegas_activas
        FROM bodegas
        WHERE estado = 'activo'
        `
      ),
      db.query(
        `
        SELECT
          COUNT(*)::int AS actas_firmadas_30d
        FROM firma_entrega
        WHERE firmado_en >= NOW() - INTERVAL '30 days'
        `
      ),
    ]);

    const entregas = entregasResult.rows[0];
    const devoluciones = devolucionesResult.rows[0];
    const articulos = articulosResult.rows[0];
    const ubicaciones = ubicacionesResult.rows[0];
    const firmas = firmasResult.rows[0];

    return {
      periodo: '30d',
      entregas_recientes: {
        total: entregas.total_entregas || 0,
        confirmadas: entregas.confirmadas || 0,
        pendientes_firma: entregas.pendientes_firma || 0,
        confirmadas_30d: entregas.confirmadas_30d || 0,
      },
      devoluciones_recientes: {
        total: devoluciones.total_devoluciones || 0,
        confirmadas: devoluciones.confirmadas || 0,
        anuladas: devoluciones.anuladas || 0,
        confirmadas_30d: devoluciones.confirmadas_30d || 0,
      },
      articulos: {
        total: articulos.total || 0,
        en_stock: articulos.en_stock || 0,
        asignado: articulos.asignado || 0,
        mantencion: articulos.mantencion || 0,
        dado_de_baja: articulos.dado_de_baja || 0,
        perdido: articulos.perdido || 0,
        valor_total: Number(articulos.valor_total || 0),
      },
      ubicaciones: {
        total: ubicaciones.bodegas_activas || 0,
        bodegas_activas: ubicaciones.bodegas_activas || 0,
      },
      firmas: {
        actas_firmadas_30d: firmas.actas_firmadas_30d || 0,
      },
    };
  }

  static async getLocationDashboardSummary(ubicacionId) {
    const [articulosResult, entregasResult] = await Promise.all([
      db.query(
        `
        SELECT
          COUNT(*)::int AS total_articulos,
          COUNT(*) FILTER (WHERE estado = 'en_stock')::int AS en_stock,
          COUNT(*) FILTER (WHERE estado = 'asignado')::int AS asignado,
          COUNT(*) FILTER (WHERE estado = 'mantencion')::int AS mantencion,
          COALESCE(SUM(valor), 0) AS valor_total
        FROM articulo
        WHERE bodega_actual_id = $1
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
        WHERE bodega_origen_id = $1
        `,
        [ubicacionId]
      ),
    ]);

    return {
      bodega_id: ubicacionId,
      articulos: {
        total: articulosResult.rows[0].total_articulos || 0,
        en_stock: articulosResult.rows[0].en_stock || 0,
        asignado: articulosResult.rows[0].asignado || 0,
        mantencion: articulosResult.rows[0].mantencion || 0,
        valor_total: Number(articulosResult.rows[0].valor_total || 0),
      },
      entregas: {
        total: entregasResult.rows[0].total_entregas || 0,
        pendientes_firma: entregasResult.rows[0].pendientes_firma || 0,
        confirmadas: entregasResult.rows[0].confirmadas || 0,
      },
    };
  }
}

module.exports = DashboardService;
