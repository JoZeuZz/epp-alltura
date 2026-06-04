const InventarioService = require('../services/inventario.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');
const { bufferPdf, bufferInforme, drawSectionLabel, drawTableHeader, DARK_BLUE, BODY_TEXT, MUTED_GRAY } = require('../lib/pdfGenerator');

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

      const pdfBuffer = await bufferPdf(`Inventario: ${label} — ${timestamp}`, async (doc) => {
        if (activos.length === 0) {
          doc.fontSize(9).fillColor(MUTED_GRAY).text('Sin activos registrados para esta categoría.');
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
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
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

      const ESTADO_LABEL = {
        en_stock: 'En stock', asignado: 'Asignado', mantencion: 'Mantención',
        dado_de_baja: 'Dado de baja', perdido: 'Perdido',
      };

      const pdfBuffer = await bufferInforme(`Ficha de Activo: ${profile.nombre}`, async (doc) => {
        // ── Datos del Activo ──────────────────────────────────────────────────
        drawSectionLabel(doc, 'Datos del Activo');

        const dataRows = [
          ['Código',         profile.codigo ?? '—'],
          ['Nombre',         profile.nombre ?? '—'],
          ['Estado',         ESTADO_LABEL[profile.estado] ?? profile.estado ?? '—'],
          ['Valor',          profile.valor > 0 ? `$${Number(profile.valor).toLocaleString('es-CL')} CLP` : '—'],
          ['Bodega',         profile.bodega_nombre ?? '—'],
          ['Proyecto',       profile.proyecto_nombre ?? '—'],
          ['Ingreso',        profile.creado_en ? new Date(profile.creado_en).toLocaleDateString('es-CL') : '—'],
          ['Registrado por', profile.creado_por_email ?? '—'],
        ];

        await doc.table(
          { headers: ['Campo', 'Valor'], rows: dataRows },
          {
            columnsSize: [155, 360],
            hideHeader: true,
            prepareRow: (row, indexColumn) => {
              if (indexColumn === 0) {
                doc.font('Helvetica').fontSize(8).fillColor(MUTED_GRAY);
              } else {
                doc.font('Helvetica-Bold').fontSize(8.5).fillColor(DARK_BLUE);
              }
            },
          }
        );

        // ── Custodia Activa ────────────────────────────────────────────────────
        if (profile.custodia_activa) {
          doc.moveDown(0.7);
          drawSectionLabel(doc, 'Custodia Activa');
          const ca = profile.custodia_activa;
          const custodioRows = [
            ['Custodio',        ca.trabajador_nombre ?? '—'],
            ['Días en custodia', String(ca.dias_en_custodia ?? 0)],
          ];
          await doc.table(
            { headers: ['Campo', 'Valor'], rows: custodioRows },
            {
              columnsSize: [155, 360],
              hideHeader: true,
              prepareRow: (row, indexColumn) => {
                if (indexColumn === 0) {
                  doc.font('Helvetica').fontSize(8).fillColor(MUTED_GRAY);
                } else {
                  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(DARK_BLUE);
                }
              },
            }
          );
        }

        // ── Historial de Movimientos ───────────────────────────────────────────
        if (profile.timeline && profile.timeline.length > 0) {
          doc.moveDown(0.7);
          drawSectionLabel(doc, 'Historial de Movimientos');
          const TABLE_WIDTH = 515;
          drawTableHeader(doc, TABLE_WIDTH);
          const movHeaders = ['Tipo', 'Fecha', 'Origen', 'Destino', 'Responsable'];
          const movRows = profile.timeline.slice(0, 50).map((m) => [
            m.tipo ?? '—',
            m.fecha_movimiento ? new Date(m.fecha_movimiento).toLocaleDateString('es-CL') : '—',
            m.bodega_origen_nombre ?? m.proyecto_origen_nombre ?? '—',
            m.bodega_destino_nombre ?? m.proyecto_destino_nombre ?? '—',
            m.responsable_email ?? '—',
          ]);
          await doc.table(
            { headers: movHeaders, rows: movRows },
            {
              columnsSize: [70, 70, 105, 105, 165],
              prepareHeader: () => doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF'),
              prepareRow: (row, indexColumn, indexRow, rectRow) => {
                if (indexColumn === 0 && indexRow % 2 !== 0 && rectRow) {
                  doc.save()
                     .rect(rectRow.x, rectRow.y, rectRow.width, rectRow.height)
                     .fill('#F0F4FA')
                     .restore();
                }
                doc.font('Helvetica').fontSize(7.5).fillColor(BODY_TEXT);
              },
            }
          );
          doc.moveDown(0.3);
          doc.fontSize(8).fillColor(MUTED_GRAY)
             .text(`Total: ${profile.timeline.length} movimiento(s)`, { align: 'right' });
        }
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Error exporting activo PDF:', error);
      return next(error);
    }
  }
}

module.exports = InventarioController;
