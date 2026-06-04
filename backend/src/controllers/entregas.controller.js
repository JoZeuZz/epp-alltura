const EntregasService = require('../services/entregas.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');
const { bufferActa, DARK_BLUE, BODY_TEXT, MUTED_GRAY } = require('../lib/pdfGenerator');
const { downloadImageBuffer, uploadPdfBuffer } = require('../lib/googleCloud');
const { findActaUrl, saveActaUrl } = require('../services/documentoService');

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
      const regenerar = req.query.regenerar === 'true';

      if (regenerar && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo administradores pueden forzar la regeneración del PDF.',
        });
      }

      const data = await EntregasService.getById(id);
      const isFirmado = !!data.firmado_en;
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `acta-entrega-${id.slice(0, 8)}-${timestamp}.pdf`;

      // Cache read — only for signed actas
      if (isFirmado && !regenerar) {
        const cachedUrl = await findActaUrl('acta_entrega', 'entrega', id);
        if (cachedUrl) {
          const cachedBuf = await downloadImageBuffer(cachedUrl).catch(() => null);
          if (cachedBuf) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', cachedBuf.length);
            res.setHeader('X-PDF-Cache', 'hit');
            return res.send(cachedBuf);
          }
          // cachedBuf null = GCS unavailable → fall through to regenerate
        }
      }

      const pdfBuffer = await bufferActa('Acta de Entrega de EPP/Herramientas', async (doc) => {
        const entregadoPor = [data.creador_nombres, data.creador_apellidos].filter(Boolean).join(' ') || '—';
        const recibidoPor  = [data.nombres, data.apellidos].filter(Boolean).join(' ') || '—';
        const rut          = data.rut || '—';

        // ── 1. Partes ──────────────────────────────────────────────────────
        doc.fontSize(10).fillColor(DARK_BLUE)
           .text('1. IDENTIFICACIÓN DE LAS PARTES', { underline: true })
           .moveDown(0.3);
        doc.fontSize(9).fillColor(BODY_TEXT)
           .text(`Entregado por: ${entregadoPor}`)
           .text(`Recibido por:  ${recibidoPor} — RUT: ${rut}`)
           .text(`Fecha:         ${new Date(data.creado_en).toLocaleDateString('es-CL')}`)
           .moveDown(0.7);

        // ── 2. Detalle ─────────────────────────────────────────────────────
        doc.fontSize(10).fillColor(DARK_BLUE)
           .text('2. DETALLE DEL ARTÍCULO ENTREGADO', { underline: true })
           .moveDown(0.3);
        if (data.detalles && data.detalles.length > 0) {
          const headers = ['Artículo', 'Código', 'Condición de salida', 'Valor (CLP)'];
          const rows = data.detalles.map((d) => [
            d.articulo_nombre ?? '—',
            d.codigo ?? d.activo_codigo ?? '—',
            d.condicion_salida ?? '—',
            d.valor != null ? `$${Number(d.valor).toLocaleString('es-CL')} CLP` : '—',
          ]);
          await doc.table({ headers, rows }, {
            columnsSize: [160, 100, 110, 110],
            prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8),
            prepareRow:    () => doc.font('Helvetica').fontSize(8),
          });
        } else {
          doc.fontSize(9).fillColor(MUTED_GRAY).text('Sin detalle de artículos registrado.');
        }
        doc.moveDown(0.7);

        // ── 3. Declaración ─────────────────────────────────────────────────
        const det        = data.detalles?.[0] ?? {};
        const artNombre  = det.articulo_nombre ?? '(artículo)';
        const artCodigo  = det.codigo ?? det.activo_codigo ?? '—';
        const artValor   = det.valor != null
          ? `$${Number(det.valor).toLocaleString('es-CL')} CLP`
          : '(valor no definido)';
        const artCondicion = det.condicion_salida ?? '—';

        doc.fontSize(10).fillColor(DARK_BLUE)
           .text('3. DECLARACIÓN Y ACEPTACIÓN', { underline: true })
           .moveDown(0.3);
        const declaracion =
          `Yo, ${recibidoPor}, RUT ${rut}, declaro haber recibido en esta fecha el artículo ` +
          `${artNombre} (Código: ${artCodigo}), con un valor declarado de ${artValor}, en condición ` +
          `de salida: ${artCondicion}.\n\n` +
          `Declaro conocer y aceptar que soy responsable del cuidado, custodia y uso adecuado del artículo ` +
          `recibido. En caso de pérdida, extravío, robo no denunciado o daño por uso inadecuado, me comprometo ` +
          `a responder económicamente por el valor del artículo al momento del incidente. Esta entrega fue ` +
          `efectuada en conformidad con las condiciones informadas en persona por mi supervisor y acepto ` +
          `íntegramente los términos comunicados.`;
        doc.fontSize(9).fillColor(BODY_TEXT).text(declaracion, { width: 515, align: 'justify' });
        doc.moveDown(0.7);

        // ── 4. FIRMA DE CONFORMIDAD ───────────────────────────────────────────────
        doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK_BLUE)
           .text('4. FIRMA DE CONFORMIDAD')
           .moveDown(0.3);
        if (data.firma_imagen_url_raw) {
          const sigBuf = await downloadImageBuffer(data.firma_imagen_url_raw).catch(() => null);
          const sigStartY = doc.y;
          // Draw line first — signature image renders on top (handwritten-on-paper effect)
          doc.moveTo(40, sigStartY + 45).lineTo(240, sigStartY + 45)
             .strokeColor(DARK_BLUE).lineWidth(0.5).stroke()
             .strokeColor('#000000').lineWidth(1);
          if (sigBuf) {
            try {
              doc.image(sigBuf, 40, sigStartY, { width: 160, opacity: 0.9 });
            } catch { /* invalid img format */ }
          }
          doc.y = sigStartY + 55;
          doc.moveDown(0.3);
          doc.fontSize(9).font('Helvetica').fillColor(BODY_TEXT)
             .text(`${recibidoPor} — RUT: ${rut}`)
             .text(`Firmado el: ${new Date(data.firmado_en).toLocaleString('es-CL')}`);
        } else {
          doc.fontSize(9).font('Helvetica').fillColor(MUTED_GRAY)
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
      }, { folio: id.slice(0, 8).toUpperCase() });

      // Cache write — fire-and-forget, never blocks response
      if (isFirmado) {
        uploadPdfBuffer(pdfBuffer, filename, { folder: 'actas' })
          .then((url) => saveActaUrl('acta_entrega', 'entrega', id, url, req.user.id))
          .catch((err) => logger.warn('PDF cache write failed (non-fatal):', err.message));
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    } catch (error) {
      logger.error('Error exporting entrega PDF:', error);
      return next(error);
    }
  }
}

module.exports = EntregasController;
