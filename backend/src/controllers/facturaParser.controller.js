'use strict';

const fs = require('fs');
const { parseFactura } = require('../services/facturaParser.service');
const { logger } = require('../lib/logger');

const safeUnlink = async (filePath) => {
  if (!filePath) return;
  try { await fs.promises.unlink(filePath); } catch { /* ignorar */ }
};

class FacturaParserController {
  static async parse(req, res, next) {
    const file = req.file;
    try {
      if (!file) {
        return res.status(400).json({ error: 'Se requiere un archivo PDF (campo: factura)' });
      }

      const articuloNombre = String(req.body?.articulo_nombre || '');
      const result = await parseFactura(file.path, articuloNombre);

      await safeUnlink(file.path);
      return res.json({ ok: true, data: result });
    } catch (err) {
      await safeUnlink(file?.path);
      logger.warn('[facturaParser] Error al parsear factura', { error: err.message });
      return res.json({
        ok: true,
        data: {
          proveedor_id:     null,
          proveedor_nombre: null,
          proveedor_creado: false,
          fecha_compra:     null,
          valor:            null,
          extractado_ok:    false,
        },
      });
    }
  }
}

module.exports = FacturaParserController;
