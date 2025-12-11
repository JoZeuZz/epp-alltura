/**
 * Cliente Redis Singleton para gestión de tokens y rate limiting
 * 
 * Características:
 * - Singleton pattern para reutilizar conexión
 * - Reconnection automático
 * - Health checks
 * - Manejo de errores robusto
 */

const redis = require('redis');
const { logger } = require('./logger');

class RedisClient {
  constructor() {
    if (RedisClient.instance) {
      return RedisClient.instance;
    }

    this.client = null;
    this.isConnected = false;
    RedisClient.instance = this;
  }

  /**
   * Inicializa la conexión a Redis
   */
  async connect() {
    if (this.isConnected) {
      return this.client;
    }

    try {
      const redisConfig = {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis: Demasiados intentos de reconexión, abortando');
              return new Error('Demasiados intentos de reconexión');
            }
            // Exponential backoff: 50ms, 100ms, 200ms, 400ms, ...
            return Math.min(retries * 50, 2000);
          },
        },
      };

      // Solo agregar password si existe y no está vacío
      if (process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD.trim() !== '') {
        redisConfig.password = process.env.REDIS_PASSWORD;
      }

      this.client = redis.createClient(redisConfig);

      // Event handlers
      this.client.on('error', (err) => {
        logger.error('Redis Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('✅ Redis: Conectando...');
      });

      this.client.on('ready', () => {
        logger.info('✅ Redis: Listo y operacional');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        logger.warn('⚠️  Redis: Reconectando...');
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.warn('⚠️  Redis: Conexión cerrada');
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('Error conectando a Redis:', error);
      throw error;
    }
  }

  /**
   * Obtiene el cliente Redis (singleton)
   */
  async getClient() {
    if (!this.isConnected) {
      await this.connect();
    }
    return this.client;
  }

  /**
   * Health check de Redis
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { healthy: false, message: 'No conectado' };
      }

      const pong = await this.client.ping();
      return {
        healthy: pong === 'PONG',
        message: 'OK',
        latency: 0, // Podrías medir latencia aquí
      };
    } catch (error) {
      return {
        healthy: false,
        message: error.message,
      };
    }
  }

  /**
   * Cierra la conexión a Redis
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis: Desconectado');
    }
  }

  // ============== OPERACIONES DE TOKEN BLACKLIST ==============

  /**
   * Agrega un token a la blacklist
   * @param {string} token - JWT token
   * @param {number} expiresIn - Tiempo de expiración en segundos
   */
  async blacklistToken(token, expiresIn) {
    const client = await this.getClient();
    await client.setEx(`blacklist:${token}`, expiresIn, 'revoked');
    logger.info('Token agregado a blacklist');
  }

  /**
   * Verifica si un token está en la blacklist
   * @param {string} token - JWT token
   * @returns {Promise<boolean>}
   */
  async isTokenBlacklisted(token) {
    const client = await this.getClient();
    const result = await client.get(`blacklist:${token}`);
    return result === 'revoked';
  }

  // ============== OPERACIONES DE REFRESH TOKENS ==============

  /**
   * Almacena un refresh token
   * @param {number} userId
   * @param {string} refreshToken
   * @param {number} expiresIn - Tiempo de expiración en segundos
   */
  async storeRefreshToken(userId, refreshToken, expiresIn) {
    const client = await this.getClient();
    await client.setEx(`refresh:${userId}:${refreshToken}`, expiresIn, 'valid');
    logger.info(`Refresh token almacenado para usuario ${userId}`);
  }

  /**
   * Verifica si un refresh token es válido
   * @param {number} userId
   * @param {string} refreshToken
   * @returns {Promise<boolean>}
   */
  async isRefreshTokenValid(userId, refreshToken) {
    const client = await this.getClient();
    const result = await client.get(`refresh:${userId}:${refreshToken}`);
    return result === 'valid';
  }

  /**
   * Revoca un refresh token
   * @param {number} userId
   * @param {string} refreshToken
   */
  async revokeRefreshToken(userId, refreshToken) {
    const client = await this.getClient();
    await client.del(`refresh:${userId}:${refreshToken}`);
    logger.info(`Refresh token revocado para usuario ${userId}`);
  }

  /**
   * Revoca todos los refresh tokens de un usuario
   * @param {number} userId
   */
  async revokeAllUserRefreshTokens(userId) {
    const client = await this.getClient();
    const keys = await client.keys(`refresh:${userId}:*`);
    if (keys.length > 0) {
      await client.del(keys);
      logger.info(`${keys.length} refresh token(s) revocado(s) para usuario ${userId}`);
    }
  }

  // ============== OPERACIONES DE RATE LIMITING ==============

  /**
   * Incrementa el contador de rate limiting (sliding window)
   * @param {string} key - Identificador único (IP, userId, etc.)
   * @param {number} windowMs - Ventana de tiempo en milisegundos
   * @param {number} max - Máximo de requests permitidos
   * @returns {Promise<{count: number, blocked: boolean}>}
   */
  async rateLimit(key, windowMs, max) {
    const client = await this.getClient();
    const now = Date.now();
    const windowStart = now - windowMs;

    // Usar sorted set para sliding window
    const rateLimitKey = `ratelimit:${key}`;

    // Pipeline para operaciones atómicas
    const pipeline = client.multi();

    // 1. Eliminar requests antiguos fuera de la ventana
    pipeline.zRemRangeByScore(rateLimitKey, 0, windowStart);

    // 2. Contar requests en la ventana actual
    pipeline.zCard(rateLimitKey);

    // 3. Agregar request actual
    pipeline.zAdd(rateLimitKey, { score: now, value: `${now}` });

    // 4. Establecer expiración
    pipeline.expire(rateLimitKey, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();
    const count = results[1]; // Resultado del zCard

    return {
      count: count + 1, // +1 porque el conteo es antes de agregar el actual
      blocked: count >= max,
      remaining: Math.max(0, max - count - 1),
      resetAt: now + windowMs,
    };
  }

  /**
   * Incrementa contador de intentos fallidos de login
   * @param {string} identifier - Email o IP
   * @returns {Promise<number>} - Número de intentos fallidos
   */
  async incrementFailedLogin(identifier) {
    const client = await this.getClient();
    const key = `failed_login:${identifier}`;
    const count = await client.incr(key);
    
    // Expirar después de 15 minutos
    if (count === 1) {
      await client.expire(key, 900); // 15 minutos
    }

    return count;
  }

  /**
   * Reset contador de intentos fallidos
   * @param {string} identifier - Email o IP
   */
  async resetFailedLogin(identifier) {
    const client = await this.getClient();
    await client.del(`failed_login:${identifier}`);
  }

  /**
   * Obtiene contador de intentos fallidos
   * @param {string} identifier - Email o IP
   * @returns {Promise<number>}
   */
  async getFailedLoginCount(identifier) {
    const client = await this.getClient();
    const count = await client.get(`failed_login:${identifier}`);
    return parseInt(count, 10) || 0;
  }

  // ============== OPERACIONES DE ANOMALY DETECTION ==============

  /**
   * Registra información de sesión para detección de anomalías
   * @param {number} userId
   * @param {string} ip
   * @param {string} userAgent
   */
  async recordSession(userId, ip, userAgent) {
    const client = await this.getClient();
    const key = `session:${userId}`;
    const sessionData = JSON.stringify({ ip, userAgent, timestamp: Date.now() });
    
    // Mantener últimas 5 sesiones
    await client.lPush(key, sessionData);
    await client.lTrim(key, 0, 4);
    await client.expire(key, 86400); // 24 horas
  }

  /**
   * Detecta accesos anómalos
   * @param {number} userId
   * @param {string} currentIp
   * @param {string} currentUserAgent
   * @returns {Promise<{anomalous: boolean, reason: string}>}
   */
  async detectAnomaly(userId, currentIp, currentUserAgent) {
    const client = await this.getClient();
    const key = `session:${userId}`;
    const sessions = await client.lRange(key, 0, -1);

    if (sessions.length === 0) {
      return { anomalous: false };
    }

    const recentSessions = sessions.map((s) => JSON.parse(s));
    const uniqueIPs = new Set(recentSessions.map((s) => s.ip));
    const uniqueUserAgents = new Set(recentSessions.map((s) => s.userAgent));

    // Detectar múltiples IPs en corto tiempo
    if (uniqueIPs.size >= 3 && !uniqueIPs.has(currentIp)) {
      return {
        anomalous: true,
        reason: 'Múltiples IPs detectadas en corto período de tiempo',
      };
    }

    // Detectar cambio de user agent
    if (uniqueUserAgents.size === 1 && !uniqueUserAgents.has(currentUserAgent)) {
      return {
        anomalous: true,
        reason: 'Cambio de navegador/dispositivo detectado',
      };
    }

    return { anomalous: false };
  }
}

// Exportar instancia singleton
const redisClient = new RedisClient();

module.exports = redisClient;
