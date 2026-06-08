'use strict';

const ArticuloModel   = require('../models/articulo');
const TrabajadorModel = require('../models/trabajador');
const ProyectoModel   = require('../models/proyecto');
const BodegaModel     = require('../models/bodega');

const ENTITY_MAP = {
  articulos:    { exportAll: () => ArticuloModel.exportAll(),     upsertBatch: (r) => ArticuloModel.upsertBatch(r)   },
  trabajadores: { exportAll: () => TrabajadorModel.exportAll(),   upsertBatch: (r) => TrabajadorModel.upsertBatch(r) },
  proyectos:    { exportAll: () => ProyectoModel.exportAll(),     upsertBatch: (r) => ProyectoModel.upsertBatch(r)   },
  bodegas:      { exportAll: () => BodegaModel.exportAll(),       upsertBatch: (r) => BodegaModel.upsertBatch(r)     },
};

const DevController = {
  async exportEntity(req, res, next) {
    try {
      const { entity } = req.params;
      const handler = ENTITY_MAP[entity];
      if (!handler) return res.status(400).json({ message: `Entidad desconocida: ${entity}` });

      const data = await handler.exportAll();
      return res.json({
        entity,
        count: data.length,
        exported_at: new Date().toISOString(),
        data,
      });
    } catch (err) {
      return next(err);
    }
  },

  async importEntity(req, res, next) {
    try {
      const { entity } = req.params;
      const handler = ENTITY_MAP[entity];
      if (!handler) return res.status(400).json({ message: `Entidad desconocida: ${entity}` });

      const { data } = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ message: 'Body debe tener campo "data" array' });
      }

      const result = await handler.upsertBatch(data);
      return res.json({ entity, ...result });
    } catch (err) {
      return next(err);
    }
  },
};

module.exports = DevController;
