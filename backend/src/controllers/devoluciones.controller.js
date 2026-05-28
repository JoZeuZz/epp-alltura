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
    uploadedSignatureUrl = await uploadFile(req.file, { folder: 'firmas/devoluciones' });
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

      const pdfBuffer = await bufferPdf('Acta de Devolución de EPP/Herramientas', async (doc) => {
        const devueltoPor = [data.nombres, data.apellidos].filter(Boolean).join(' ') || '—';
        const recibidoPor = [data.receptor_nombres, data.receptor_apellidos].filter(Boolean).join(' ') || '—';
        const rut         = data.rut || '—';

        // Folio
        doc.fontSize(9).fillColor(MUTED_GRAY)
           .text(`Folio: ${id.slice(0, 8).toUpperCase()}`, { align: 'right' })
           .moveDown(0.5);

        // ── 1. Partes ──────────────────────────────────────────────────────
        doc.fontSize(10).fillColor(DARK_BLUE)
           .text('1. IDENTIFICACIÓN DE LAS PARTES', { underline: true })
           .moveDown(0.3);
        doc.fontSize(9).fillColor(BODY_TEXT)
           .text(`Devuelto por: ${devueltoPor} — RUT: ${rut}`)
           .text(`Recibido por: ${recibidoPor}`)
           .text(`Fecha:        ${new Date(data.creado_en).toLocaleDateString('es-CL')}`)
           .moveDown(0.7);

        // ── 2. Detalle ─────────────────────────────────────────────────────
        doc.fontSize(10).fillColor(DARK_BLUE)
           .text('2. DETALLE DEL ARTÍCULO DEVUELTO', { underline: true })
           .moveDown(0.3);
        if (data.detalles && data.detalles.length > 0) {
          const headers = ['Artículo', 'Código', 'Condición entrada', 'Disposición', 'Valor (CLP)'];
          const rows = data.detalles.map((d) => [
            d.articulo_nombre ?? '—',
            d.codigo ?? '—',
            d.condicion_entrada ?? '—',
            d.disposicion ?? '—',
            d.valor != null ? `$${Number(d.valor).toLocaleString('es-CL')} CLP` : '—',
          ]);
          await doc.table({ headers, rows }, {
            columnsSize: [120, 80, 90, 80, 100],
            prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8),
            prepareRow:    () => doc.font('Helvetica').fontSize(8),
          });
        } else {
          doc.fontSize(9).fillColor(MUTED_GRAY).text('Sin detalle de artículos registrado.');
        }
        doc.moveDown(0.7);

        // ── 3. Declaración ─────────────────────────────────────────────────
        const det          = data.detalles?.[0] ?? {};
        const artNombre    = det.articulo_nombre ?? '(artículo)';
        const artCodigo    = det.codigo ?? '—';
        const artCondicion = det.condicion_entrada ?? '—';

        doc.fontSize(10).fillColor(DARK_BLUE)
           .text('3. DECLARACIÓN DE DEVOLUCIÓN', { underline: true })
           .moveDown(0.3);
        const declaracion =
          `Yo, ${devueltoPor}, RUT ${rut}, declaro devolver en esta fecha el artículo ` +
          `${artNombre} (Código: ${artCodigo}), en condición de entrada: ${artCondicion}, ` +
          `recibido en conformidad por ${recibidoPor}.\n\n` +
          `Con la firma de este documento, quedo liberado de responsabilidad sobre el artículo ` +
          `devuelto a partir de esta fecha, salvo las observaciones indicadas en el detalle del acta.`;
        doc.fontSize(9).fillColor(BODY_TEXT).text(declaracion, { width: 480, align: 'justify' });
        doc.moveDown(0.7);

        // ── 4. Firma ───────────────────────────────────────────────────────
        doc.fontSize(10).fillColor(DARK_BLUE)
           .text('4. FIRMA DE CONFORMIDAD', { underline: true })
           .moveDown(0.3);
        if (data.firma_imagen_url_raw) {
          const sigBuf = await downloadImageBuffer(data.firma_imagen_url_raw).catch(() => null);
          if (sigBuf) {
            try { doc.image(sigBuf, { fit: [200, 80], align: 'left' }); } catch { /* invalid img */ }
          }
          const lineY = doc.y + 4;
          doc.moveTo(40, lineY).lineTo(240, lineY)
             .strokeColor(DARK_BLUE).lineWidth(0.5).stroke()
             .strokeColor('#000000').lineWidth(1);
          doc.moveDown(0.3);
          doc.fontSize(9).fillColor(BODY_TEXT)
             .text(`${devueltoPor} — RUT: ${rut}`)
             .text(`Firmado el: ${new Date(data.firmado_en).toLocaleString('es-CL')}`);
        } else {
          doc.fontSize(9).fillColor(MUTED_GRAY)
             .text('Firma: pendiente de validación digital.');
        }

        // ── Anexo: Evidencia ───────────────────────────────────────────────
        if (data.evidencia_foto_url_raw) {
          const imgBuf = await downloadImageBuffer(data.evidencia_foto_url_raw).catch(() => null);
          if (imgBuf) {
            doc.moveDown(1);
            const sepY = doc.y;
            doc.moveTo(40, sepY).lineTo(doc.page.width - 40, sepY)
               .strokeColor('#CCCCCC').lineWidth(0.5).stroke()
               .strokeColor('#000000').lineWidth(1);
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor(DARK_BLUE)
               .text('ANEXO: FOTOGRAFÍAS DE EVIDENCIA', { underline: true })
               .moveDown(0.3);
            try { doc.image(imgBuf, { fit: [450, 300], align: 'center' }); } catch { /* invalid img */ }
            doc.moveDown(0.3);
            doc.fontSize(8).fillColor(MUTED_GRAY)
               .text(
                 `Fotografía de evidencia — ${new Date(data.creado_en).toLocaleDateString('es-CL')}`,
                 { align: 'center' }
               );
          }
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
