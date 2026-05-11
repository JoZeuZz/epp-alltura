const EntregasService = require('../services/entregas.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');
const { createDoc } = require('../lib/pdfGenerator');

class EntregasController {
  static async list(req, res, next) {
    try {
      const data = await EntregasService.list(req.query || {});
      return sendSuccess(res, {
        message: 'Entregas obtenidas correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error listing entregas:', error);
      return next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const data = await EntregasService.getById(req.params.id);
      return sendSuccess(res, {
        message: 'Entrega obtenida correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error getting entrega by id:', error);
      return next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const data = await EntregasService.create(req.body, req.user.id);
      return sendSuccess(res, {
        status: 201,
        message: 'Entrega creada correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error creating entrega:', error);
      return next(error);
    }
  }

  static async confirm(req, res, next) {
    try {
      const data = await EntregasService.confirm(req.params.id, req.user.id);
      return sendSuccess(res, {
        message: 'Entrega confirmada correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error confirming entrega:', error);
      return next(error);
    }
  }

  static async anular(req, res, next) {
    try {
      const data = await EntregasService.anular(req.params.id, req.body || {}, req.user.id);
      return sendSuccess(res, {
        message: 'Entrega anulada correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error cancelling entrega:', error);
      return next(error);
    }
  }
  static async exportPdf(req, res, next) {
    try {
      const { id } = req.params;
      const data = await EntregasService.getById(id);
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `acta-entrega-${id.slice(0, 8)}-${timestamp}.pdf`;
      const doc = createDoc('Acta de Entrega', res, filename);

      doc.fontSize(10).fillColor('#1E2A4A').text('Trabajador', { underline: true });
      doc.fontSize(9).fillColor('#333333')
        .text(`Nombre: ${data.nombres} ${data.apellidos}`)
        .text(`RUT: ${data.rut ?? '—'}`)
        .text(`Estado: ${data.estado}`)
        .text(`Fecha: ${new Date(data.creado_en).toLocaleDateString('es-CL')}`)
        .moveDown(0.5);

      if (data.detalles && data.detalles.length > 0) {
        doc.fontSize(10).fillColor('#1E2A4A').text('Detalle de items', { underline: true }).moveDown(0.3);
        const headers = ['Artículo', 'Código activo', 'Cant.', 'Condición', 'Notas'];
        const rows = data.detalles.map((d) => [
          d.articulo_nombre ?? '—',
          d.activo_codigo ?? '—',
          String(d.cantidad ?? 1),
          d.condicion_salida ?? '—',
          d.notas ?? '',
        ]);
        await doc.table({ headers, rows }, {
          columnsSize: [140, 100, 40, 80, 120],
          prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8),
          prepareRow: () => doc.font('Helvetica').fontSize(8),
        });
      }

      doc.moveDown();
      if (data.firmado_en) {
        doc.fontSize(9).fillColor('#333333')
          .text(`Firmado el: ${new Date(data.firmado_en).toLocaleString('es-CL')}`);
      } else {
        doc.fontSize(9).fillColor('#888888').text('Firma: pendiente.');
      }

      doc.end();
    } catch (error) {
      logger.error('Error exporting entrega PDF:', error);
      return next(error);
    }
  }
}

module.exports = EntregasController;
