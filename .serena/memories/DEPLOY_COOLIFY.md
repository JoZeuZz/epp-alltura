# Deploy Coolify (memoria compacta)

- Esta memoria se mantiene por compatibilidad de nombre.
- La guía canónica y completa de despliegue está en: `DEPLOYMENT_COOLIFY_CLOUDFLARE`.

## Puntos clave rápidos
- Exponer públicamente frontend; backend/DB/Redis en red interna.
- Frontend debe consumir API same-origin por `/api`.
- Tunnel Cloudflare debe apuntar al proxy público de Coolify.
- Validar health backend (`/health/ready`) y variables críticas (JWT, DB, REDIS, CLIENT_URL/BACKEND_URL).
