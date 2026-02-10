const DashboardService = require('../services/dashboard.service');
const { logger } = require('../lib/logger');
const { sendSuccess } = require('../lib/apiResponse');

const markDeprecatedEndpoint = (req, res, route) => {
  res.setHeader('X-Deprecated-Endpoint', 'true');
  logger.warn('Deprecated dashboard endpoint invoked', {
    route,
    userId: req.user?.id || null,
    requestId: req.requestId || null,
  });
};

class DashboardController {
  static async getSummary(req, res, next) {
    try {
      const data = await DashboardService.getDashboardSummary();
      return sendSuccess(res, { message: 'Resumen de dashboard obtenido correctamente', data });
    } catch (error) {
      logger.error('Error fetching dashboard summary:', error);
      return next(error);
    }
  }

  static async getOperationalIndicators(req, res, next) {
    try {
      const data = await DashboardService.getOperationalIndicators();
      return sendSuccess(res, { message: 'Indicadores operativos obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error fetching operational indicators:', error);
      return next(error);
    }
  }

  static async getLocationSummary(req, res, next) {
    try {
      const { ubicacionId } = req.params;
      if (!ubicacionId) {
        const error = new Error('ID de ubicación inválido');
        error.statusCode = 400;
        throw error;
      }

      const data = await DashboardService.getLocationDashboardSummary(ubicacionId);
      return sendSuccess(res, {
        message: 'Resumen por ubicación obtenido correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error fetching location dashboard summary:', error);
      return next(error);
    }
  }

  static async getCubicMetersStats(req, res, next) {
    try {
      markDeprecatedEndpoint(req, res, '/api/dashboard/cubic-meters');
      const data = await DashboardService.getOperationalIndicators();
      return sendSuccess(res, { message: 'Indicadores operativos obtenidos correctamente', data });
    } catch (error) {
      logger.error('Error fetching deprecated operational stats:', error);
      return next(error);
    }
  }

  static async getProjectSummary(req, res, next) {
    try {
      const { projectId } = req.params;
      if (!projectId) {
        const error = new Error('ID de ubicación inválido');
        error.statusCode = 400;
        throw error;
      }

      markDeprecatedEndpoint(req, res, '/api/dashboard/project/:projectId');
      const data = await DashboardService.getLocationDashboardSummary(projectId);
      return sendSuccess(res, {
        message: 'Resumen por ubicación obtenido correctamente',
        data,
      });
    } catch (error) {
      logger.error('Error fetching deprecated location dashboard summary:', error);
      return next(error);
    }
  }
}

module.exports = DashboardController;
