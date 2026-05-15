const InventarioService = require('../services/inventario.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');
const { createDoc, DARK_BLUE, BODY_TEXT, MUTED_GRAY } = require('../lib/pdfGenerator');

class InventarioController {
  static async getActivos(req, res, next) {
    try {
      const data = await InventarioService.getActivos(req.query || {});
      return sendSuccess(res, { message: 'Activos obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error fetching activos:', error);
      return next(error);
    }
  }

  static async getActivosPaged(req, res, next) {
    try {
      const data = await InventarioService.getActivosPaged(req.query || {});
      return sendSuccess(res, { message: 'Activos paginados obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error fetching paged activos:', error);
      return next(error);
    }
  }

  static async getActivosDisponibles(req, res, next) {
    try {
      const data = await InventarioService.getActivosDisponibles(req.query || {});
      return sendSuccess(res, { message: 'Activos disponibles obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error fetching available activos:', error);
      return next(error);
    }
  }

  static async getAuditoria(req, res, next) {
    try {
      const data = await InventarioService.getAuditoria(req.query || {});
      return sendSuccess(res, { message: 'Auditoría obtenida correctamente', data });
    } catch (error) {
      logger.error('Error fetching auditoria:', error);
      return next(error);
    }
  }

  static async getActivoProfile(req, res, next) {
    try {
      const data = await InventarioService.getActivoProfile(req.params.id);
      return sendSuccess(res, { message: 'Perfil del activo obtenido correctamente', data });
    } catch (error) {
      logger.error('Error fetching activo profile:', error);
      return next(error);
    }
  }

  static async getAssetMovements(req, res, next) {
    try {
      const data = await InventarioService.getAssetMovements(req.params.id, req.query || {});
      return sendSuccess(res, { message: 'Movimientos del activo obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error fetching asset movements:', error);
      return next(error);
    }
  }

  static async getStock(req, res, next) {
    try {
      const data = await InventarioService.getStockSummary(req.query || {});
      return sendSuccess(res, { message: 'Stock obtenido correctamente', data });
    } catch (error) {
      logger.error('Error fetching stock summary:', error);
      return next(error);
    }
  }

  static async getMovimientosActivo(req, res, next) {
    try {
      const data = await InventarioService.getMovimientosActivo(req.query || {});
      return sendSuccess(res, { message: 'Movimientos de activo obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error fetching activo movements:', error);
      return next(error);
    }
  }

  static async reubicarActivo(req, res, next) {
    try {
      const data = await InventarioService.reubicarActivo(req.params.id, req.body, req.user.id);
      return sendSuccess(res, { message: 'Activo reubicado correctamente', data });
    } catch (error) {
      logger.error('Error relocating activo:', error);
      return next(error);
    }
  }

  static async exportInventarioPdf(req, res, next) {
    try {
      const { categoria } = req.query;
      // Normalize plural query param to singular articulo.tipo values
      const TIPO_MAP = { herramientas: 'herramienta', equipos: 'equipo', epp: 'epp' };
      const tipoFiltro = TIPO_MAP[categoria] ?? categoria;
      const activos = await InventarioService.getActivos({ tipo: tipoFiltro, limit: 500 });
      const timestamp = new Date().toISOString().slice(0, 10);
      const label = { epp: 'EPP', herramientas: 'Herramientas', equipos: 'Equipos' }[categoria] ?? categoria;
      const filename = `inventario-${categoria}-${timestamp}.pdf`;
      const doc = createDoc(`Inventario: ${label} — ${timestamp}`, res, filename);

      if (activos.length === 0) {
        doc.fontSize(9).fillColor(MUTED_GRAY).text('Sin activos registrados para esta categoría.');
        doc.end();
        return;
      }

      const headers = ['Código', 'Nombre', 'Estado', 'Ubicación'];
      const rows = activos.map((a) => [
        a.codigo ?? '—',
        a.nombre ?? '—',
        a.estado ?? '—',
        a.bodega_nombre ?? a.proyecto_nombre ?? '—',
      ]);

      await doc.table({ headers, rows }, {
        columnsSize: [80, 200, 70, 130],
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8),
        prepareRow: () => doc.font('Helvetica').fontSize(8),
      });

      doc.moveDown();
      doc.fontSize(8).fillColor(MUTED_GRAY).text(`Total: ${activos.length} activo(s)`);
      doc.end();
    } catch (error) {
      logger.error('Error exporting inventario PDF:', error);
      return next(error);
    }
  }

  static async exportActivoPdf(req, res, next) {
    try {
      const { id } = req.params;
      const profile = await InventarioService.getActivoProfile(id);
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `ficha-activo-${profile.codigo}-${timestamp}.pdf`;
      const doc = createDoc(`Ficha de Activo: ${profile.nombre}`, res, filename);

      doc.fontSize(9).fillColor(BODY_TEXT)
        .text(`Código: ${profile.codigo}`)
        .text(`Serie: ${profile.nro_serie ?? '—'}`)
        .text(`Estado: ${profile.estado}`)
        .text(`Bodega: ${profile.bodega_nombre ?? '—'}`)
        .text(`Ingreso: ${profile.creado_en ? new Date(profile.creado_en).toLocaleDateString('es-CL') : '—'}`)
        .moveDown(0.5);

      if (profile.custodia_activa) {
        const ca = profile.custodia_activa;
        doc.fontSize(10).fillColor(DARK_BLUE).text('Custodia activa', { underline: true });
        doc.fontSize(9).fillColor(BODY_TEXT)
          .text(`Custodio: ${ca.trabajador_nombre ?? '—'}`)
          .text(`Días en custodia: ${ca.dias_en_custodia ?? 0}`)
          .moveDown(0.5);
      }

      if (profile.timeline && profile.timeline.length > 0) {
        doc.fontSize(10).fillColor(DARK_BLUE).text('Historial de movimientos', { underline: true }).moveDown(0.3);
        const headers = ['Tipo', 'Fecha', 'Origen', 'Destino', 'Responsable'];
        const rows = profile.timeline.slice(0, 50).map((m) => [
          m.tipo,
          new Date(m.fecha_movimiento).toLocaleDateString('es-CL'),
          m.bodega_origen_nombre ?? m.proyecto_origen_nombre ?? '—',
          m.bodega_destino_nombre ?? m.proyecto_destino_nombre ?? '—',
          m.responsable_email ?? '—',
        ]);
        await doc.table({ headers, rows }, {
          columnsSize: [70, 70, 100, 100, 120],
          prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8),
          prepareRow: () => doc.font('Helvetica').fontSize(8),
        });
      }

      doc.end();
    } catch (error) {
      logger.error('Error exporting activo PDF:', error);
      return next(error);
    }
  }
}

module.exports = InventarioController;
