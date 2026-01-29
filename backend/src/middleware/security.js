/**
 * Security Middleware Configuration
 * Implementa headers de seguridad HTTP siguiendo OWASP Secure Headers Project
 * y configuración de Content Security Policy (CSP) estricta
 * 
 * Referencias:
 * - OWASP Secure Headers: https://owasp.org/www-project-secure-headers/
 * - CSP Level 3: https://www.w3.org/TR/CSP3/
 * - Helmet.js: https://helmetjs.github.io/
 * 
 * Remedia:
 * - CVE-ALLTURA-006: Missing Security Headers (CVSS 5.3)
 * - CVE-ALLTURA-008: XSS via Reflected Content (CVSS 7.5)
 */

const helmet = require('helmet');
const { logger } = require('../lib/logger');

/**
 * Configuración de Content Security Policy
 * Política estricta con nonces para scripts inline cuando sea necesario
 * 
 * Niveles de seguridad:
 * - default-src 'none': Bloquea todo por defecto (allowlist approach)
 * - script-src: Solo scripts del mismo origen + nonces específicos
 * - style-src: Solo estilos del mismo origen + inline necesarios
 * - img-src: Imágenes propias + data URIs para bases64
 * - connect-src: APIs permitidas
 * - font-src: Fuentes del mismo origen
 * - frame-ancestors 'none': Previene clickjacking
 * - base-uri 'self': Previene ataques base-href injection
 * - form-action 'self': Solo formularios a mismo origen
 */
const getCSPDirectives = (env = 'production') => {
  const isDevelopment = env === 'development';
  
  const directives = {
    defaultSrc: ["'none'"], // Deny all por defecto
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline necesario para algunos frameworks
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    frameAncestors: ["'none'"], // Previene iframe embedding (X-Frame-Options equivalente)
    baseUri: ["'self'"],
    formAction: ["'self'"],
    manifestSrc: ["'self'"],
    workerSrc: ["'self'"],
    childSrc: ["'none'"],
  };

  // En desarrollo, permitir herramientas como React DevTools, HMR de Vite
  if (isDevelopment) {
    directives.scriptSrc.push("'unsafe-eval'"); // Para HMR y source maps
    directives.connectSrc.push('ws:', 'wss:'); // WebSockets para HMR
    logger.warn('CSP: Development mode - unsafe-eval enabled for HMR');
  }

  return directives;
};

/**
 * Configuración completa de Helmet
 * Implementa OWASP Secure Headers recommendations
 */
const configureHelmet = (env = 'production') => {
  const isDevelopment = env === 'development';

  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      useDefaults: false,
      directives: getCSPDirectives(env),
      reportOnly: isDevelopment, // Solo reportar en dev, bloquear en prod
    },

    // Cross-Origin Embedder Policy
    // Requiere que todos los recursos cargados sean del mismo origen o con CORS
    crossOriginEmbedderPolicy: !isDevelopment, // Deshabilitado en dev por herramientas

    // Cross-Origin Opener Policy
    // Previene ataques Spectre via window.open
    crossOriginOpenerPolicy: {
      policy: 'same-origin',
    },

    // Cross-Origin Resource Policy
    // Control fino de qué orígenes pueden cargar este recurso
    crossOriginResourcePolicy: {
      policy: 'same-origin',
    },

    // DNS Prefetch Control
    // Previene leaks de información via DNS prefetching
    dnsPrefetchControl: {
      allow: false,
    },

    // Expect-CT (deprecated pero aún útil para navegadores antiguos)
    // Certificate Transparency enforcement
    expectCt: {
      enforce: true,
      maxAge: 86400, // 24 horas
    },

    // X-Frame-Options (legacy, CSP frame-ancestors es preferido)
    frameguard: {
      action: 'deny',
    },

    // Hide Powered-By Header
    // Previene information disclosure sobre tecnología usada
    hidePoweredBy: true,

    // HTTP Strict Transport Security
    // Fuerza HTTPS por 1 año, incluye subdomains, permite preload
    hsts: {
      maxAge: 31536000, // 1 año en segundos
      includeSubDomains: true,
      preload: true,
    },

    // IE No Open
    // Previene que IE ejecute descargas en el contexto del sitio
    ieNoOpen: true,

    // X-Content-Type-Options
    // Previene MIME sniffing attacks
    noSniff: true,

    // Origin-Agent-Cluster
    // Aísla el contexto de ejecución del agente
    originAgentCluster: true,

    // Permissions Policy (antes Feature Policy)
    // Control fino de APIs del navegador permitidas
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none',
    },

    // Referrer Policy
    // Control de qué información se envía en el header Referer
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },

    // X-XSS-Protection (legacy, CSP es preferido)
    // Habilitado para navegadores antiguos que no soportan CSP
    xssFilter: true,
  });
};

/**
 * Middleware para agregar headers de seguridad adicionales no cubiertos por Helmet
 */
const additionalSecurityHeaders = (req, res, next) => {
  // Permissions Policy (antes Feature Policy)
  // Control granular de qué features del navegador están disponibles
  res.setHeader(
    'Permissions-Policy',
    [
      'geolocation=()', // Deshabilitar geolocalización
      'microphone=()', // Deshabilitar micrófono
      'camera=()', // Deshabilitar cámara
      'payment=()', // Deshabilitar Payment Request API
      'usb=()', // Deshabilitar WebUSB
      'magnetometer=()', // Deshabilitar magnetómetro
      'gyroscope=()', // Deshabilitar giroscopio
      'accelerometer=()', // Deshabilitar acelerómetro
      'ambient-light-sensor=()', // Deshabilitar sensor de luz
      'autoplay=()', // Deshabilitar autoplay de medios
      'encrypted-media=()', // Deshabilitar EME (DRM)
      'fullscreen=(self)', // Permitir fullscreen solo mismo origen
      'picture-in-picture=(self)', // Permitir PiP solo mismo origen
      'sync-xhr=()', // Deshabilitar XHR síncrono (deprecated)
    ].join(', ')
  );

  // X-Permitted-Cross-Domain-Policies
  // Previene que Flash/PDF carguen políticas cross-domain
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // Clear-Site-Data on logout
  // Se implementará en la ruta de logout específica
  
  next();
};

/**
 * Middleware para logging de violaciones CSP
 * Registra intentos de ejecución de código no permitido
 */
const logCSPViolations = (req, res, next) => {
  if (req.path === '/csp-violation-report' && req.method === 'POST') {
    logger.warn('CSP Violation Report', {
      violation: req.body,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    // Responder sin contenido
    return res.status(204).end();
  }
  next();
};

/**
 * Configuración de CORS
 * Control estricto de qué orígenes pueden acceder a la API
 */
const buildOriginVariants = (value) => {
  if (!value) return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return [trimmed];
  }
  return [`https://${trimmed}`, `http://${trimmed}`];
};

const collectAllowedOrigins = (allowedOrigins, environment = 'production') => {
  const origins = [];

  if (Array.isArray(allowedOrigins) && allowedOrigins.length) {
    origins.push(...allowedOrigins);
  } else {
    origins.push(
      ...buildOriginVariants(process.env.CLIENT_URL),
      ...buildOriginVariants(process.env.SERVICE_URL_FRONTEND),
      ...buildOriginVariants(process.env.SERVICE_FQDN_FRONTEND)
    );
  }

  if (environment === 'development') {
    origins.push(
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    );
  }

  return Array.from(new Set(origins.filter(Boolean)));
};

const configureCORS = (allowedOrigins, environment = 'production') => {
  const cors = require('cors');
  const resolvedOrigins = collectAllowedOrigins(allowedOrigins, environment);
  
  const corsOptions = {
    origin: (origin, callback) => {
      // Permitir requests sin origin (mobile apps, Postman, curl)
      if (!origin) {
        return callback(null, true);
      }

      // Verificar si el origin está en la lista permitida
      if (resolvedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS: Origin blocked', { origin });
        callback(new Error('Not allowed by CORS policy'));
      }
    },
    credentials: true, // Permitir cookies/auth headers
    maxAge: 86400, // Cachear preflight por 24 horas
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    optionsSuccessStatus: 204,
  };

  return cors(corsOptions);
};

/**
 * Middleware para prevenir Parameter Pollution
 * Previene ataques HPP (HTTP Parameter Pollution)
 */
const configureHPP = () => {
  const hpp = require('hpp');
  
  // Lista blanca de parámetros que SÍ pueden ser arrays
  const whitelist = [
    'fields', // Para queries de selección de campos: ?fields[]=name&fields[]=email
    'sort', // Para múltiples criterios de ordenamiento
    'filter', // Para múltiples filtros
    'include', // Para relaciones a incluir
    'ids', // Para operaciones batch: ?ids[]=1&ids[]=2
  ];

  return hpp({
    whitelist,
    checkBody: true, // También revisar el body
    checkQuery: true, // Revisar query string
  });
};

/**
 * Factory para crear middleware stack completo de seguridad
 */
const createSecurityMiddleware = (config = {}) => {
  const {
    environment = process.env.NODE_ENV || 'production',
    allowedOrigins,
  } = config;

  return {
    helmet: configureHelmet(environment),
    cors: configureCORS(allowedOrigins, environment),
    hpp: configureHPP(),
    additionalHeaders: additionalSecurityHeaders,
    cspLogger: logCSPViolations,
  };
};

module.exports = {
  createSecurityMiddleware,
  configureHelmet,
  configureCORS,
  configureHPP,
  additionalSecurityHeaders,
  logCSPViolations,
};
