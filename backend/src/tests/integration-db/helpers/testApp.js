const express = require('express');
const errorHandler = require('../../../middleware/errorHandler');

const comprasRoutes = require('../../../routes/compras.routes');
const entregasRoutes = require('../../../routes/entregas.routes');
const firmasRoutes = require('../../../routes/firmas.routes');
const devolucionesRoutes = require('../../../routes/devoluciones.routes');
const inventarioRoutes = require('../../../routes/inventario.routes');

const buildTestApp = () => {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/compras', comprasRoutes);
  app.use('/api/entregas', entregasRoutes);
  app.use('/api/firmas', firmasRoutes);
  app.use('/api/devoluciones', devolucionesRoutes);
  app.use('/api/inventario', inventarioRoutes);

  app.use(errorHandler);

  return app;
};

module.exports = {
  buildTestApp,
};
