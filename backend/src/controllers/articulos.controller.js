'use strict';

const { ArticulosService } = require('../services/articulos.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');
const XLSX = require('xlsx');
const { bufferInforme, drawSectionLabel, drawTableHeader, BODY_TEXT, MUTED_GRAY } = require('../lib/pdfGenerator');

class ArticulosController {
  static async list(req, res, next) {
    try {
      const data = await ArticulosService.list(req.query || {});
      return sendSuccess(res, { message: 'Artículos obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error listing articulos:', error);
      return next(error);
    }
  }

  static async export(req, res, next) {
    try {
      const { tipo, formato, estado, search, ciudad } = req.query;
      const timestamp = new Date().toISOString().slice(0, 10);

      const { items: allItems } = await ArticulosService.list({
        tipo,
        ...(estado && { estado }),
        ...(search && { search }),
        limit: 5000,
      });

      const items = applyCiudadFilter(allItems, ciudad);

      const TIPO_LABEL = { epp: 'EPP', herramienta: 'Herramientas', equipo: 'Equipos' };
      const label = TIPO_LABEL[tipo] ?? tipo;
      const filename = `inventario-${tipo}-${timestamp}.${formato === 'excel' ? 'xlsx' : 'pdf'}`;

      if (formato === 'excel') {
        const buffer = buildExcelBuffer(items);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        return res.send(buffer);
      }

      const pdfBuffer = await bufferInforme(`Inventario: ${label}`, async (doc) => {
        if (items.length === 0) {
          doc.fontSize(9).fillColor(MUTED_GRAY).text('Sin artículos para los filtros seleccionados.');
          return;
        }

        drawSectionLabel(doc, `${label} — ${items.length} artículo(s)`);

        const TABLE_WIDTH = 515;
        drawTableHeader(doc, TABLE_WIDTH);

        const headers = ['Código', 'Nombre', 'Marca/Modelo', 'Estado', 'Ubicación', 'Valor'];
        const rows = items.map((a) => [
          a.codigo ?? '—',
          a.nombre ?? '—',
          [a.marca, a.modelo].filter(Boolean).join(' · ') || '—',
          ESTADO_LABEL[a.estado] ?? a.estado,
          a.bodega_nombre ?? a.proyecto_nombre ?? '—',
          a.valor > 0 ? `$${a.valor.toLocaleString('es-CL')}` : '—',
        ]);

        await doc.table({ headers, rows }, {
          columnsSize: [60, 140, 100, 70, 100, 45],
          prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF'),
          prepareRow: (row, indexColumn, indexRow, rectRow) => {
            if (indexColumn === 0 && indexRow % 2 !== 0 && rectRow) {
              doc.save()
                 .rect(rectRow.x, rectRow.y, rectRow.width, rectRow.height)
                 .fill('#F0F4FA')
                 .restore();
            }
            doc.font('Helvetica').fontSize(8).fillColor(BODY_TEXT);
          },
        });

        doc.moveDown(0.3);
        doc.fontSize(8).fillColor(MUTED_GRAY)
           .text(`Total: ${items.length} artículo(s)`, { align: 'right' });
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    } catch (error) {
      logger.error('Error exporting articulos:', error);
      return next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const data = await ArticulosService.getById(req.params.id);
      return sendSuccess(res, { message: 'Artículo obtenido correctamente', data });
    } catch (error) {
      logger.error('Error getting articulo by id:', error);
      return next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const data = await ArticulosService.create(req.body, req.user.id, req.files || {});
      return sendSuccess(res, { status: 201, message: 'Artículo creado correctamente', data });
    } catch (error) {
      logger.error('Error creating articulo:', error);
      return next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const data = await ArticulosService.update(req.params.id, req.body, req.user.id, req.files || {});
      return sendSuccess(res, { message: 'Artículo actualizado correctamente', data });
    } catch (error) {
      logger.error('Error updating articulo:', error);
      return next(error);
    }
  }

  static async removePermanent(req, res, next) {
    try {
      await ArticulosService.deletePermanent(req.params.id, req.user.id);
      return sendSuccess(res, { message: 'Artículo eliminado permanentemente' });
    } catch (error) {
      logger.error('Error deleting articulo permanently:', error);
      return next(error);
    }
  }

  static async cambiarEstado(req, res, next) {
    try {
      const data = await ArticulosService.cambiarEstado(req.params.id, req.body, req.user.id);
      return sendSuccess(res, { message: 'Estado del artículo actualizado', data });
    } catch (error) {
      logger.error('Error changing articulo state:', error);
      return next(error);
    }
  }

  static async addCertificacion(req, res, next) {
    try {
      if (!req.file) {
        const error = new Error('Se requiere un archivo PDF para la certificación');
        error.statusCode = 400;
        return next(error);
      }
      const data = await ArticulosService.addCertificacion(
        req.params.id,
        req.file,
        req.body.nombre || null,
        req.user.id
      );
      return sendSuccess(res, { status: 201, message: 'Certificación agregada', data });
    } catch (error) {
      logger.error('Error adding certificacion:', error);
      return next(error);
    }
  }

  static async deleteCertificacion(req, res, next) {
    try {
      const data = await ArticulosService.deleteCertificacion(
        req.params.id,
        req.params.certId,
        req.user.id
      );
      return sendSuccess(res, { message: 'Certificación eliminada', data });
    } catch (error) {
      logger.error('Error deleting certificacion:', error);
      return next(error);
    }
  }
}

const ESTADO_LABEL = {
  en_stock:     'En stock',
  asignado:     'Asignado',
  mantencion:   'Mantención',
  dado_de_baja: 'Dado de baja',
  perdido:      'Perdido',
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

function buildExcelBuffer(items) {
  const rows = items.map((a) => ({
    'Código':         a.codigo ?? '—',
    'Nombre':         a.nombre ?? '—',
    'Marca/Modelo':   [a.marca, a.modelo].filter(Boolean).join(' · ') || '—',
    'Estado':         ESTADO_LABEL[a.estado] ?? a.estado,
    'Ubicación':      a.bodega_nombre ?? a.proyecto_nombre ?? '—',
    'Valor (CLP)':    a.valor ?? 0,
    'Fecha Compra':   formatDate(a.fecha_compra),
    'Proveedor':      a.proveedor_nombre ?? '—',
    'Especialidades': (a.especialidades ?? []).join(', '),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function applyCiudadFilter(items, ciudad) {
  if (!ciudad) return items;
  if (ciudad === '__none__') {
    return items.filter((a) => a.bodega_ciudad == null && a.proyecto_ciudad == null);
  }
  return items.filter((a) => a.bodega_ciudad === ciudad || a.proyecto_ciudad === ciudad);
}

module.exports = ArticulosController;
