# Cambios del chat (estado actual)

Resumen consolidado de mejoras recientes. Este documento se mantiene actualizado para reflejar el estado actual del repositorio.

## Backend
- Auth: `/api/auth/refresh` con rotación de refresh tokens (Redis) y validaciones dedicadas. Login devuelve `accessToken` + `refreshToken`.
- Seguridad: redacción de datos sensibles en logs (`password`, `refreshToken`, `authorization`, `token`, `apiKey`, etc.) desde `errorHandler`.
- Imágenes privadas: `/uploads` ya no se expone como estático; evidencia se sirve vía `/api/image-proxy` con token firmado.
- PDF: fotos de montaje/desmontaje por andamio con layout adaptable; notas reordenadas; footer removido para evitar páginas en blanco.
- Excel: m³ adicionales se exportan como fila adicional (no columna), con formato y encabezados consistentes.
- Healthcheck: endpoint `/health/ready` (incluye DB + Redis) para health real.
- Rate limiting: ajustes para image-proxy, reportes y login.
- DB pool parametrizable por env (max, idle, conn timeout, max uses).
- Scaffolds: normalización de `disassembly_image_url` en modelo/allowedFields; bloqueo de creación si el proyecto no tiene usuario cliente asignado.

## Frontend
- Sesiones largas: interceptor Axios reintenta con `/api/auth/refresh` ante 401 y persiste tokens en `localStorage`.
- DevTools: sourcemaps desactivados en build; `.map` bloqueados desde Nginx.
- Subida de imágenes con progreso real + estado de compresión en formularios con foto.
- Galería de fotos por proyecto (admin y cliente).
- Modal de andamio: carril de fotos montaje/desmontaje como fuente principal; comparador antes/después eliminado; foto de desmontaje fuera del bloque de info.
- Admin/Scaffolds: panel más compacto (filtros colapsables, acciones en iconos, estadísticas al final, foco en cards).
- Supervisor: “Volver a Mis Proyectos” navega a `/supervisor/dashboard` (no usa history back).
- UX: textos de contraseña ajustados a mínimo 12 caracteres.
- Limpieza: `NewReportPage` removida para evitar deuda/confusión.

## Guías / Tours
- Sistema de onboarding + guías contextuales por rol (admin/supervisor/cliente).
- Botón “Guía” dispara pasos de la página actual; overlay más ligero y mejor comportamiento móvil.
- `data-tour` en páginas clave: dashboard, clientes, usuarios, proyectos, andamios, galerías, historial, perfil, notificaciones, creación y desmontaje.
- Admin Dashboard incluye guía por cada card/segmento (proyectos, clientes, andamios, nuevos 24h, m³ y tarjetas).

## Infra / Deploy
- Nginx: cache-control agresivo para assets y no-store para index.html; timeouts altos para `/api` en PDF/Excel e imágenes grandes.
- Dockerfile backend: healthcheck apunta a `/health/ready`.
- Dockerfile frontend: `VITE_IMAGE_MAX_MB` se inyecta en build.
- Nota operativa: mantener `package-lock.json` sincronizado cuando se ajustan `@types/react`/`@types/react-dom`.
- Nginx frontend bloquea `.map` para no exponer código en producción.

## Variables de entorno relevantes
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
- Métricas persistentes.
- Comparador antes/después (removido por baja relevancia).

