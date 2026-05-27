const EntregasService = require('../services/entregas.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');
const { bufferPdf, DARK_BLUE, BODY_TEXT, MUTED_GRAY } = require('../lib/pdfGenerator');
const { downloadImageBuffer } = require('../lib/googleCloud');

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
      const data = await EntregasService.create(req.body, req.user.id, req.file);
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

      const pdfBuffer = await bufferPdf('Acta de Entrega', async (doc) => {
        // Partes
        doc.fontSize(10).fillColor(DARK_BLUE).text('Partes involucradas', { underline: true });
        doc.fontSize(9).fillColor(BODY_TEXT);
        const entregadoPor = [data.creador_nombres, data.creador_apellidos].filter(Boolean).join(' ') || '—';
        const recibidoPor = [data.nombres, data.apellidos].filter(Boolean).join(' ') || '—';
        doc.text(`Entregado por: ${entregadoPor}`)
           .text(`Recibido por: ${recibidoPor}${data.rut ? ` — RUT: ${data.rut}` : ''}`)
           .text(`Fecha: ${new Date(data.creado_en).toLocaleDateString('es-CL')}`)
           .text(`Estado: ${data.estado}`)
           .moveDown(0.5);

        // Artículos
        if (data.detalles && data.detalles.length > 0) {
          doc.fontSize(10).fillColor(DARK_BLUE).text('Detalle de ítems', { underline: true }).moveDown(0.3);
          const headers = ['Artículo', 'Código', 'Condición', 'Notas'];
          const rows = data.detalles.map((d) => [
            d.articulo_nombre ?? '—',
            d.codigo ?? d.activo_codigo ?? '—',
            d.condicion_salida ?? '—',
            d.notas ?? '',
          ]);
          await doc.table({ headers, rows }, {
            columnsSize: [160, 100, 80, 140],
            prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8),
            prepareRow: () => doc.font('Helvetica').fontSize(8),
          });
          doc.moveDown(0.5);
        }

        // Evidencia de entrega
        if (data.evidencia_foto_url_raw) {
          const imgBuf = await downloadImageBuffer(data.evidencia_foto_url_raw).catch(() => null);
          if (imgBuf) {
            doc.fontSize(10).fillColor(DARK_BLUE).text('Foto de evidencia', { underline: true }).moveDown(0.2);
            doc.image(imgBuf, { fit: [400, 200], align: 'center' }).moveDown(0.5);
          }
        }

        // Firma
        doc.fontSize(10).fillColor(DARK_BLUE).text('Firma del receptor', { underline: true }).moveDown(0.2);
        if (data.firma_imagen_url_raw) {
          const sigBuf = await downloadImageBuffer(data.firma_imagen_url_raw).catch(() => null);
          if (sigBuf) {
            doc.image(sigBuf, { fit: [200, 80], align: 'left' }).moveDown(0.2);
          }
          doc.fontSize(9).fillColor(BODY_TEXT)
             .text(`Firmado el: ${new Date(data.firmado_en).toLocaleString('es-CL')}`);
        } else {
          doc.fontSize(9).fillColor(MUTED_GRAY).text('Firma: pendiente.');
        }
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Error exporting entrega PDF:', error);
      return next(error);
    }
  }
}

module.exports = EntregasController;
