const DevolucionesService = require('../services/devoluciones.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');
const { uploadFile, deleteFileByUrl, downloadImageBuffer } = require('../lib/googleCloud');
const { bufferPdf, DARK_BLUE, BODY_TEXT, MUTED_GRAY } = require('../lib/pdfGenerator');

const buildRequestMeta = (req) => ({
  ip: req.ip || req.connection?.remoteAddress || null,
  userAgent: req.get('user-agent') || null,
});

const buildSignaturePayload = async (req) => {
  const payload = {
    ...(req.body || {}),
  };

  let uploadedSignatureUrl = null;
  if (req.file) {
    uploadedSignatureUrl = await uploadFile(req.file);
    payload.firma_imagen_url = uploadedSignatureUrl;
  }

  return {
    payload,
    uploadedSignatureUrl,
  };
};

const cleanupUploadedSignature = async (uploadedSignatureUrl) => {
  if (!uploadedSignatureUrl) {
    return;
  }

  try {
    await deleteFileByUrl(uploadedSignatureUrl);
  } catch (cleanupError) {
    logger.warn('No se pudo limpiar firma de devolución tras error', {
      message: cleanupError.message,
      uploadedSignatureUrl,
    });
  }
};

class DevolucionesController {
  static async listEligibleAssets(req, res, next) {
    try {
      const data = await DevolucionesService.listEligibleAssets(req.query || {});
      return sendSuccess(res, {
        message: 'Activos elegibles para devolución obtenidos correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error listing return-eligible assets:', error);
      return next(error);
    }
  }

  static async list(req, res, next) {
    try {
      const data = await DevolucionesService.list(req.query || {});
      return sendSuccess(res, {
        message: 'Devoluciones obtenidas correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error listing devoluciones:', error);
      return next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const data = await DevolucionesService.getById(req.params.id);
      return sendSuccess(res, {
        message: 'Devolución obtenida correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error getting devolución by id:', error);
      return next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const data = await DevolucionesService.create(req.body, req.user.id, req.file);
      return sendSuccess(res, {
        status: 201,
        message: 'Devolución creada correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error creating devolución:', error);
      return next(error);
    }
  }

  static async signInDevice(req, res, next) {
    let uploadedSignatureUrl = null;

    try {
      const { payload, uploadedSignatureUrl: uploadedUrl } = await buildSignaturePayload(req);
      uploadedSignatureUrl = uploadedUrl;

      const data = await DevolucionesService.signInDevice(
        req.params.id,
        payload,
        buildRequestMeta(req),
        {
          id: req.user.id,
          role: req.user.role,
          roles: req.user.roles || [],
        }
      );

      return sendSuccess(res, {
        status: 201,
        message: 'Firma de devolución registrada correctamente',
        data,
      });
    } catch (error) {
      await cleanupUploadedSignature(uploadedSignatureUrl);
      logger.error('Error signing devolucion in device:', error);
      return next(error);
    }
  }

  static async confirm(req, res, next) {
    try {
      const data = await DevolucionesService.confirm(req.params.id, req.user.id);
      return sendSuccess(res, {
        message: 'Devolución confirmada correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error confirming devolución:', error);
      return next(error);
    }
  }

  static async anular(req, res, next) {
    try {
      const data = await DevolucionesService.anular(req.params.id, req.body || {}, req.user.id);
      return sendSuccess(res, {
        message: 'Devolución anulada correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error cancelling devolución:', error);
      return next(error);
    }
  }
  static async exportPdf(req, res, next) {
    try {
      const { id } = req.params;
      const data = await DevolucionesService.getById(id);
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `acta-devolucion-${id.slice(0, 8)}-${timestamp}.pdf`;

      const pdfBuffer = await bufferPdf('Acta de Devolución', async (doc) => {
        // Partes
        doc.fontSize(10).fillColor(DARK_BLUE).text('Partes involucradas', { underline: true });
        doc.fontSize(9).fillColor(BODY_TEXT);
        const devueltoPor = [data.nombres, data.apellidos].filter(Boolean).join(' ') || '—';
        const recibidoPor = [data.receptor_nombres, data.receptor_apellidos].filter(Boolean).join(' ') || '—';
        doc.text(`Devuelto por: ${devueltoPor}${data.rut ? ` — RUT: ${data.rut}` : ''}`)
           .text(`Recibido por: ${recibidoPor}`)
           .text(`Fecha: ${new Date(data.creado_en).toLocaleDateString('es-CL')}`)
           .text(`Estado: ${data.estado}`)
           .moveDown(0.5);

        // Artículos
        if (data.detalles && data.detalles.length > 0) {
          doc.fontSize(10).fillColor(DARK_BLUE).text('Detalle de ítems devueltos', { underline: true }).moveDown(0.3);
          const headers = ['Artículo', 'Código', 'Condición entrada', 'Disposición', 'Notas'];
          const rows = data.detalles.map((d) => [
            d.articulo_nombre ?? '—',
            d.codigo ?? '—',
            d.condicion_entrada ?? '—',
            d.disposicion ?? '—',
            d.notas ?? '',
          ]);
          await doc.table({ headers, rows }, {
            columnsSize: [130, 80, 90, 80, 100],
            prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8),
            prepareRow: () => doc.font('Helvetica').fontSize(8),
          });
          doc.moveDown(0.5);
        }

        // Evidencia
        if (data.evidencia_foto_url) {
          const imgBuf = await downloadImageBuffer(data.evidencia_foto_url).catch(() => null);
          if (imgBuf) {
            doc.fontSize(10).fillColor(DARK_BLUE).text('Foto de evidencia', { underline: true }).moveDown(0.2);
            doc.image(imgBuf, { fit: [400, 200], align: 'center' }).moveDown(0.5);
          }
        }

        // Firma
        doc.fontSize(10).fillColor(DARK_BLUE).text('Firma del trabajador', { underline: true }).moveDown(0.2);
        if (data.firma_imagen_url) {
          const sigBuf = await downloadImageBuffer(data.firma_imagen_url).catch(() => null);
          if (sigBuf) {
            doc.image(sigBuf, { fit: [200, 80], align: 'left' }).moveDown(0.2);
          }
          doc.fontSize(9).fillColor(BODY_TEXT)
             .text(`Firmado el: ${new Date(data.firmado_en).toLocaleString('es-CL')}`);
        } else {
          doc.fontSize(9).fillColor(MUTED_GRAY).text('Firma: pendiente.');
        }

        // Texto de aceptación
        if (data.texto_aceptacion) {
          doc.moveDown(0.5);
          doc.fontSize(10).fillColor(DARK_BLUE).text('Texto de aceptación', { underline: true }).moveDown(0.2);
          let displayText = data.texto_aceptacion;
          try {
            const parsed = JSON.parse(data.texto_aceptacion);
            displayText = parsed.general || data.texto_aceptacion;
          } catch {
            // plain text, use as-is
          }
          doc.fontSize(8).fillColor(BODY_TEXT).text(displayText, { width: 480 });
        }
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Error exporting devolucion PDF:', error);
      return next(error);
    }
  }
}

module.exports = DevolucionesController;
