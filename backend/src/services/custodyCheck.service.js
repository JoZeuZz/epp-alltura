const db = require('../db');
const NotificationService = require('./notification.service');
const { logger } = require('../lib/logger');

/**
 * Servicio de verificación diaria de custodias.
 * Genera notificaciones para admins/supervisores cuando hay custodias
 * próximas a vencer (amarillo: 70-90%) o vencidas/urgentes (rojo: >90%).
 */
class CustodyCheckService {
  /**
   * Obtiene IDs de usuarios admin y supervisor activos.
   */
  static async getAdminSupervisorIds() {
    const { rows } = await db.query(`
      SELECT DISTINCT u.id
      FROM usuario u
      JOIN usuario_rol ur ON ur.usuario_id = u.id
      JOIN rol r ON r.id = ur.rol_id
      WHERE r.nombre IN ('admin', 'supervisor')
        AND u.estado = 'activo'
    `);
    return rows.map((r) => r.id);
  }

  /**
   * Busca custodias activas con fecha_devolucion_esperada y calcula semáforo.
   * Solo retorna amarillo y rojo (verde no genera notificación).
   */
  static async getCustodiasAlerta() {
    const { rows } = await db.query(`
      SELECT
        ca.id            AS custodia_id,
        ca.activo_id,
        ca.trabajador_id,
        ca.desde_en,
        ca.fecha_devolucion_esperada,
        a.codigo         AS activo_codigo,
        art.nombre       AS articulo_nombre,
        p.nombres        AS trabajador_nombres,
        p.apellidos      AS trabajador_apellidos,
        EXTRACT(EPOCH FROM (NOW() - ca.desde_en))
          / NULLIF(EXTRACT(EPOCH FROM (ca.fecha_devolucion_esperada - ca.desde_en)), 0)
          AS porcentaje,
        GREATEST(0, EXTRACT(DAY FROM (ca.fecha_devolucion_esperada - NOW())))::int
          AS dias_restantes
      FROM custodia_activo ca
      JOIN activo a ON a.id = ca.activo_id
      JOIN articulo art ON art.id = a.articulo_id
      JOIN trabajador t ON t.id = ca.trabajador_id
      JOIN persona p ON p.id = t.persona_id
      WHERE ca.estado = 'activa'
        AND ca.fecha_devolucion_esperada IS NOT NULL
        AND EXTRACT(EPOCH FROM (NOW() - ca.desde_en))
            / NULLIF(EXTRACT(EPOCH FROM (ca.fecha_devolucion_esperada - ca.desde_en)), 0)
            >= 0.70
      ORDER BY porcentaje DESC
    `);
    return rows;
  }

  /**
   * Ejecuta la verificación diaria y genera notificaciones.
   */
  static async runDailyCheck() {
    logger.info('[CustodyCheck] Iniciando verificación diaria de custodias...');

    try {
      const [userIds, alertas] = await Promise.all([
        this.getAdminSupervisorIds(),
        this.getCustodiasAlerta(),
      ]);

      if (userIds.length === 0) {
        logger.info('[CustodyCheck] No hay usuarios admin/supervisor activos.');
        return;
      }

      if (alertas.length === 0) {
        logger.info('[CustodyCheck] No hay custodias en alerta.');
        return;
      }

      const notifications = [];

      for (const alerta of alertas) {
        const pct = parseFloat(alerta.porcentaje);
        const semaforo = pct >= 0.90 ? 'rojo' : 'amarillo';
        const diasRestantes = alerta.dias_restantes;

        const type = semaforo === 'rojo' ? 'custodia_vencida' : 'custodia_proxima_vencer';

        const title =
          semaforo === 'rojo'
            ? `⚠️ Custodia vencida: ${alerta.activo_codigo}`
            : `🟡 Custodia por vencer: ${alerta.activo_codigo}`;

        const trabajadorNombre = `${alerta.trabajador_nombres} ${alerta.trabajador_apellidos}`;
        const message =
          semaforo === 'rojo'
            ? `El activo ${alerta.activo_codigo} (${alerta.articulo_nombre}) asignado a ${trabajadorNombre} ha superado el plazo de devolución.`
            : `El activo ${alerta.activo_codigo} (${alerta.articulo_nombre}) asignado a ${trabajadorNombre} vence en ${diasRestantes} día(s).`;

        for (const userId of userIds) {
          notifications.push({
            user_id: userId,
            type,
            title,
            message,
            metadata: {
              custodia_id: alerta.custodia_id,
              activo_id: alerta.activo_id,
              trabajador_id: alerta.trabajador_id,
              semaforo,
              fecha: new Date().toISOString().split('T')[0],
            },
            link: `/admin/trabajadores?perfil=${alerta.trabajador_id}`,
          });
        }
      }

      if (notifications.length > 0) {
        await NotificationService.createBatchInAppNotifications(notifications);
        logger.info(
          `[CustodyCheck] ${notifications.length} notificaciones generadas (${alertas.length} custodia(s) en alerta, ${userIds.length} usuario(s)).`
        );
      }
    } catch (error) {
      logger.error('[CustodyCheck] Error en verificación diaria:', error);
    }
  }
}

module.exports = CustodyCheckService;
