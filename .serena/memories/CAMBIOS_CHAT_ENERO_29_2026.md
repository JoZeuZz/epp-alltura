# Cambios del chat - Enero 29, 2026

Resumen de los cambios implementados durante este hilo para reportes, imagenes, UX y deploy.

## Backend
- PDF: fotos de montaje/desmontaje por andamio con layout adaptable; notas reordenadas; se removio el footer ("Emitido" y numeracion) para evitar paginas en blanco.
- Excel: m3 adicionales se exportan como fila adicional (no columna), con formato y encabezados consistentes.
- Imagenes: integracion GCS + image-proxy con TTL y cache control; limite y compresion configurables; strip de metadatos opcional.
- Healthcheck: endpoint /health/ready (incluye DB + Redis) para health real.
- Rate limiting: ajustes para image-proxy y reportes, mas login.
- DB pool parametrizable por env (max, idle, conn timeout, max uses).

## Frontend
- Subida de imagenes con progreso real y estado de compresion en todos los formularios con foto.
- Galeria de fotos por proyecto (solo admin y cliente).
- Modal de andamio: carril de fotos montaje/desmontaje como fuente principal; comparador antes/despues eliminado; foto de desmontaje fuera del bloque de info.
- Admin/Scaffolds: panel mas compacto (filtros colapsables, acciones en iconos, estadisticas al final, mayor foco en cards).
- Supervisor: "Volver a Mis Proyectos" ahora navega a /supervisor/dashboard (no usa history back).

## Infra / Deploy
- Nginx: cache-control agresivo para assets y no-store para index.html; timeouts mas altos para /api en PDF/Excel e imagenes grandes.
- Dockerfile backend: healthcheck apunta a /health/ready.
- Dockerfile frontend: VITE_IMAGE_MAX_MB se inyecta en build.
- Nota operativa: mantener package-lock.json sincronizado cuando se ajustan @types/react/@types/react-dom.

## Variables de entorno nuevas
- DB_POOL_MAX
- DB_POOL_IDLE_MS
- DB_POOL_CONN_TIMEOUT_MS
- DB_POOL_MAX_USES (opcional)
- LOG_LEVEL
- IMAGE_PROXY_RATE_LIMIT_MAX
- IMAGE_PROXY_RATE_LIMIT_WINDOW_MS
- REPORT_RATE_LIMIT_MAX
- REPORT_RATE_LIMIT_WINDOW_MS
- IMAGE_CACHE_CONTROL
- IMAGE_MAX_BYTES
- IMAGE_STRIP_METADATA
- IMAGE_JPEG_QUALITY
- VITE_IMAGE_MAX_MB

## Fuera de alcance (postergado)
- Brotli en Nginx.
- Metricas persistentes.
- Comparador antes/despues (removido por baja relevancia).
