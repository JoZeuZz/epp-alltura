'use strict';

const { ArticulosService } = require('../services/articulos.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');
const ExcelJS = require('exceljs');
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
      const { tipo, formato, estado, search, ubicacion } = req.query;
      const timestamp = new Date().toISOString().slice(0, 10);

      const { items: allItems } = await ArticulosService.list({
        tipo,
        ...(estado && { estado }),
        ...(search && { search }),
        limit: 5000,
      });

      const items = applyLocationFilter(allItems, ubicacion);

      const TIPO_LABEL = { epp: 'EPP', herramienta: 'Herramientas', equipo: 'Equipos' };
      const label = TIPO_LABEL[tipo] ?? tipo;
      const filename = `inventario-${tipo}-${timestamp}.${formato === 'excel' ? 'xlsx' : 'pdf'}`;

      if (formato === 'excel') {
        const buffer = await buildExcelBuffer(items);
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

  static async createBatch(req, res, next) {
    try {
      const data = await ArticulosService.createBatch(req.body, req.user.id, req.files || {});
      return sendSuccess(res, { status: 201, message: `${data.created} artículo(s) creados`, data });
    } catch (error) {
      logger.error('Error creating articulos batch:', error);
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

async function buildExcelBuffer(items) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Inventario');
  ws.columns = [
    { header: 'Código',         key: 'codigo' },
    { header: 'Nombre',         key: 'nombre' },
    { header: 'Marca/Modelo',   key: 'marca_modelo' },
    { header: 'Estado',         key: 'estado' },
    { header: 'Ubicación',      key: 'ubicacion' },
    { header: 'Valor (CLP)',    key: 'valor' },
    { header: 'Fecha Compra',   key: 'fecha_compra' },
    { header: 'Proveedor',      key: 'proveedor' },
    { header: 'Especialidades', key: 'especialidades' },
  ];
  ws.addRows(items.map((a) => ({
    codigo:         a.codigo ?? '—',
    nombre:         a.nombre ?? '—',
    marca_modelo:   [a.marca, a.modelo].filter(Boolean).join(' · ') || '—',
    estado:         ESTADO_LABEL[a.estado] ?? a.estado,
    ubicacion:      a.bodega_nombre ?? a.proyecto_nombre ?? '—',
    valor:          a.valor ?? 0,
    fecha_compra:   formatDate(a.fecha_compra),
    proveedor:      a.proveedor_nombre ?? '—',
    especialidades: (a.especialidades ?? []).join(', '),
  })));
  return wb.xlsx.writeBuffer();
}

function applyLocationFilter(items, ubicacion) {
  if (!ubicacion) return items;
  if (ubicacion === '__none__') {
    return items.filter((a) => a.bodega_nombre == null && a.proyecto_nombre == null);
  }
  return items.filter((a) => a.bodega_nombre === ubicacion || a.proyecto_nombre === ubicacion);
}

module.exports = ArticulosController;
