const InventarioService = require('../services/inventario.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');
const { uploadDocument, deleteFileByUrl } = require('../lib/googleCloud');
const { createDoc, DARK_BLUE, BODY_TEXT, MUTED_GRAY } = require('../lib/pdfGenerator');

class InventarioController {
  static async listIngresos(req, res, next) {
    try {
      const data = await InventarioService.getIngresos(req.query || {});
      return sendSuccess(res, {
        message: 'Ingresos de inventario obtenidos correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error listing inventory ingresos:', error);
      return next(error);
    }
  }

  static async createIngreso(req, res, next) {
    let uploadedDocumentUrl = null;

    try {
      const payload = {
        ...(req.body || {}),
      };

      if (payload.fecha_ingreso && !payload.fecha_compra) {
        payload.fecha_compra = payload.fecha_ingreso;
      }
      delete payload.fecha_ingreso;

      if (req.file) {
        uploadedDocumentUrl = await uploadDocument(req.file);
        payload.documento_compra = {
          ...(payload.documento_compra || {}),
          archivo_url: uploadedDocumentUrl,
        };
      }

      const data = await InventarioService.createIngreso(payload, req.user.id);
      return sendSuccess(res, {
        status: 201,
        message: 'Ingreso de inventario registrado correctamente',
        data,
      });
    } catch (error) {
      if (uploadedDocumentUrl) {
        try {
          await deleteFileByUrl(uploadedDocumentUrl);
        } catch (cleanupError) {
          logger.warn('No se pudo limpiar documento de ingreso tras error', {
            message: cleanupError.message,
            uploadedDocumentUrl,
          });
        }
      }
      logger.error('Error creating inventory ingreso:', error);
      return next(error);
    }
  }

  static async getStock(req, res, next) {
    try {
      const data = await InventarioService.getStock(req.query || {});
      return sendSuccess(res, { message: 'Stock obtenido correctamente', data });
    } catch (error) {
      logger.error('Error fetching stock:', error);
      return next(error);
    }
  }

  static async getStockSummary(req, res, next) {
    try {
      const data = await InventarioService.getStockSummary(req.query || {});
      return sendSuccess(res, { message: 'Resumen de stock obtenido correctamente', data });
    } catch (error) {
      logger.error('Error fetching stock summary:', error);
      return next(error);
    }
  }

  static async getStockPaged(req, res, next) {
    try {
      const data = await InventarioService.getStockPaged(req.query || {});
      return sendSuccess(res, { message: 'Detalle de stock obtenido correctamente', data });
    } catch (error) {
      logger.error('Error fetching paged stock detail:', error);
      return next(error);
    }
  }

  static async getStockMovements(req, res, next) {
    try {
      const data = await InventarioService.getStockMovements(req.query || {});
      return sendSuccess(res, { message: 'Movimientos de stock obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error fetching stock movements:', error);
      return next(error);
    }
  }

  static async exportStockMovementsCsv(req, res, next) {
    try {
      const csvContent = await InventarioService.exportStockMovementsCsv(req.query || {});
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const filename = `movimientos-stock-${timestamp}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(`\uFEFF${csvContent}`);
    } catch (error) {
      logger.error('Error exporting stock movements CSV:', error);
      return next(error);
    }
  }

  static async getAssetMovements(req, res, next) {
    try {
      const data = await InventarioService.getAssetMovements(req.query || {});
      return sendSuccess(res, { message: 'Movimientos de activos obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error fetching asset movements:', error);
      return next(error);
    }
  }

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

  static async deleteIngreso(req, res, next) {
    try {
      await InventarioService.deleteIngreso(req.params.id, req.user.id);
      return sendSuccess(res, { message: 'Ingreso eliminado correctamente. Stock y movimientos revertidos.' });
    } catch (error) {
      logger.error('Error deleting ingreso:', error);
      return next(error);
    }
  }

  static async listEgresos(req, res, next) {
    try {
      const data = await InventarioService.getEgresos(req.query || {});
      return sendSuccess(res, { message: 'Egresos de inventario obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error listing egresos:', error);
      return next(error);
    }
  }

  static async getEgresoById(req, res, next) {
    try {
      const data = await InventarioService.getEgresoById(req.params.id);
      return sendSuccess(res, { message: 'Egreso obtenido correctamente', data });
    } catch (error) {
      logger.error('Error getting egreso by id:', error);
      return next(error);
    }
  }

  static async createEgreso(req, res, next) {
    try {
      const data = await InventarioService.createEgreso(req.body, req.user.id);
      return sendSuccess(res, {
        status: 201,
        message: 'Egreso de inventario registrado correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error creating egreso:', error);
      return next(error);
    }
  }

  static async deleteEgreso(req, res, next) {
    try {
      await InventarioService.deleteEgreso(req.params.id, req.user.id);
      return sendSuccess(res, { message: 'Egreso eliminado correctamente. Stock revertido.' });
    } catch (error) {
      logger.error('Error deleting egreso:', error);
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

  static async cambiarEstadoActivo(req, res, next) {
    try {
      const data = await InventarioService.cambiarEstadoActivo(req.params.id, req.body, req.user.id);
      return sendSuccess(res, { message: 'Estado del activo actualizado correctamente', data });
    } catch (error) {
      logger.error('Error changing activo state:', error);
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

  static async editarActivo(req, res, next) {
    try {
      const data = await InventarioService.editarActivo(req.params.id, req.body);
      return sendSuccess(res, { message: 'Activo actualizado correctamente', data });
    } catch (error) {
      logger.error('Error updating activo:', error);
      return next(error);
    }
  }

  static async exportInventarioPdf(req, res, next) {
    try {
      const { categoria } = req.query;
      const activos = await InventarioService.getActivos({ tipo_activo: categoria, limit: 500 });
      const timestamp = new Date().toISOString().slice(0, 10);
      const label = { epp: 'EPP', herramientas: 'Herramientas', equipos: 'Equipos' }[categoria] ?? categoria;
      const filename = `inventario-${categoria}-${timestamp}.pdf`;
      const doc = createDoc(`Inventario: ${label} — ${timestamp}`, res, filename);

      if (activos.length === 0) {
        doc.fontSize(9).fillColor(MUTED_GRAY).text('Sin activos registrados para esta categoría.');
        doc.end();
        return;
      }

      const headers = ['Código', 'Artículo', 'Estado', 'Ubicación', 'Asignado a'];
      const rows = activos.map((a) => [
        a.codigo ?? '—',
        a.articulo_nombre ?? '—',
        a.estado ?? '—',
        a.bodega_nombre ?? '—',
        a.custodio_nombres ? `${a.custodio_nombres} ${a.custodio_apellidos}` : '—',
      ]);

      await doc.table({ headers, rows }, {
        columnsSize: [80, 150, 70, 100, 120],
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
      const doc = createDoc(`Ficha de Activo: ${profile.articulo_nombre}`, res, filename);

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
          .text(`Custodio: ${ca.custodio_nombres} ${ca.custodio_apellidos}`)
          .text(`Días en custodia: ${ca.dias_en_custodia ?? 0}`)
          .moveDown(0.5);
      }

      if (profile.timeline && profile.timeline.length > 0) {
        doc.fontSize(10).fillColor(DARK_BLUE).text('Historial de movimientos', { underline: true }).moveDown(0.3);
        const headers = ['Tipo', 'Fecha', 'Origen', 'Destino', 'Responsable'];
        const rows = profile.timeline.slice(0, 50).map((m) => [
          m.tipo,
          new Date(m.fecha_movimiento).toLocaleDateString('es-CL'),
          m.origen_nombre ?? '—',
          m.destino_nombre ?? '—',
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
