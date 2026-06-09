'use strict';

const AsignacionesUsuarioService = require('../services/asignacionesUsuario.service');
const { sendSuccess, buildErrorResponse } = require('../lib/apiResponse');

class AsignacionesUsuarioController {
  static async assign(req, res, next) {
    try {
      const result = await AsignacionesUsuarioService.assign(req.body, req.user.id);
      return sendSuccess(res, {
        status: 201,
        message: 'Artículos asignados correctamente',
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  }

  static async getMias(req, res, next) {
    try {
      const result = await AsignacionesUsuarioService.getMias(req.user.id, req.query);
      return sendSuccess(res, {
        message: 'Artículos asignados obtenidos correctamente',
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  }

  static async devolverBodega(req, res, next) {
    try {
      const result = await AsignacionesUsuarioService.devolverBodega(req.body, req.user.id);
      return sendSuccess(res, {
        message: 'Artículos devueltos a bodega correctamente',
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  }

  static async getHistorialByUser(req, res, next) {
    try {
      const { id } = req.params;

      // Admin can see any user; supervisor can only see own
      const userRoles = req.user.roles || req.user.role || [];
      const isAdmin = Array.isArray(userRoles)
        ? userRoles.includes('admin')
        : userRoles === 'admin';

      if (!isAdmin && req.user.id !== id) {
        return res.status(403).json(buildErrorResponse('Acceso denegado', ['FORBIDDEN']));
      }

      const result = await AsignacionesUsuarioService.getHistorial(id, req.query);
      return sendSuccess(res, {
        message: 'Historial de asignaciones obtenido correctamente',
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  }

  static async deliverToTrabajador(req, res, next) {
    try {
      const EntregasService = require('../services/entregas.service');
      const payload = { ...req.body, usuario_origen_id: req.user.id };
      const result = await EntregasService.createFromUsuario(payload, req.user.id, req.file ?? null);
      return sendSuccess(res, {
        status: 201,
        message: 'Entrega a trabajador creada correctamente',
        data: result,
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = AsignacionesUsuarioController;
