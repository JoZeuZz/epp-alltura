# Deploy en Coolify + Cloudflare Tunnel (Docker)

Este documento describe el flujo **que usa este repositorio** para desplegar una SPA (frontend) + API (backend) + PostgreSQL + Redis en **Coolify**, exponiendo el tráfico público mediante **Cloudflare Tunnel**.

La idea clave es que **el navegador solo habla con el dominio público**, y el frontend hace llamadas **same‑origin** a `/api/...` (sin `localhost` hardcodeado). Esto evita CORS y errores tipo `ERR_BLOCKED_BY_CLIENT`.

---

## Arquitectura (flujo de tráfico)

```
Navegador
  │  https://<app.dominio>
  ▼
Cloudflare (DNS/TLS)
  ▼
Cloudflare Tunnel (cloudflared)
  ▼
Reverse proxy de Coolify (Traefik / proxy equivalente)
  ▼
Frontend (Nginx sirviendo SPA)
  └─ /api/*  → proxy interno al backend
             (BACKEND_URL)
  ▼
Backend (Node/Express)
  ├─ PostgreSQL
  └─ Redis
```

---

## Decisiones del repo que habilitan el deploy

### 1) Frontend llama al backend con rutas relativas

En producción, el frontend debe consumir API como:

- ✅ `GET /api/scaffolds/project/1`
- ❌ `GET http://localhost:5000/api/scaffolds/project/1`

Esto es consistente con un frontend servido por Nginx que proxyea `/api/` al backend (ver sección Nginx).

### 2) Nginx del frontend proxyea `/api/` hacia el backend

El `frontend/nginx.conf.template` está diseñado para que `/api/*` se redirija al backend usando `BACKEND_URL` (resuelto al iniciar el contenedor con `envsubst`). En el repo existe una variante que hace:

- Redirect `/api` → `/api/`
- `location /api/ { proxy_pass ${BACKEND_URL}/api/; ... }`

> Nota: en el repo también aparece una variante más simple que hace `proxy_pass ${BACKEND_URL};`. La intención en ambos casos es la misma: que el frontend sirva `/api/*` hacia el backend sin exponer el backend directamente.

### 3) BACKEND_URL se inyecta al arranque (sin rebuild)

El contenedor del frontend reemplaza `BACKEND_URL` en la plantilla de Nginx en runtime:

- Default: `http://backend:5000`
- Render: `envsubst '${BACKEND_URL}' < template > /etc/nginx/conf.d/default.conf`

Eso permite cambiar el destino del backend solo con variables de entorno de Coolify.

### 4) Backend preparado para estar detrás de múltiples proxys

El backend usa `trust proxy` con saltos explícitos (Cloudflare → proxy de Coolify → nginx → backend):

- `app.set('trust proxy', 3);`

Esto es importante para IP real, rate‑limits, cookies seguras, etc.

### 5) Healthcheck del backend

El backend expone `/health/ready` (incluye DB + Redis) y el Dockerfile del backend define un `HEALTHCHECK` contra ese endpoint.

### 6) Imágenes (GCS + image-proxy) y `/uploads` (deshabilitado)

Las imágenes se sirven vía `/api/image-proxy` usando tokens firmados y caché controlada.  
**`/uploads` no se expone públicamente** desde Express: es un storage local interno.

Si necesitas compatibilidad legacy con `/uploads`, debes:
1) Rehabilitar el `express.static` en backend (no recomendado), y
2) Agregar `location /uploads/` en el Nginx del frontend (ver sección opcional).

Por defecto, la app asume **acceso privado a imágenes** vía proxy.

---

## Variables de entorno (referencia práctica)

Este repo trae un `backend/.env.example` con variables esperadas, incluyendo:

- `REDIS_URL`
- VAPID keys (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
- `NODE_ENV`, `PORT`
- `CLIENT_URL` (CORS)

Recomendación operativa en Coolify: guardar todo lo sensible como **Secrets/Environment variables** (no en el repo).

### Generación rápida de secretos (repo)

El repo incluye `scripts/generate-secrets.sh` (usa `openssl rand`) para JWT y password de Postgres.

Para VAPID (web push) el mismo script indica generar con `npx web-push generate-vapid-keys`.

---

## Pasos de deploy en Coolify (patrón recomendado)

Hay 2 formas típicas: “un solo stack Docker Compose” o “servicios separados”. Para este repo, suele ser más simple usar un stack.

1) Crear un Project en Coolify y conectar el repo (branch principal que estás desplegando).

2) Crear un servicio tipo Docker Compose (o equivalente) que incluya:
   - frontend (Nginx)
   - backend (Node/Express)
   - postgres
   - redis
   - volúmenes persistentes para Postgres y Redis (y para uploads si aplica)

3) Variables/envs:
   - Frontend:
     - `BACKEND_URL` (por defecto `http://backend:5000`)
   - Backend:
     - `PORT=5000` (si no lo fija ya el contenedor)
     - `CLIENT_URL=https://<app.dominio>`
     - `REDIS_URL=redis://redis:6379` (o equivalente)
     - credenciales DB/Redis y JWT/VAPID, etc.

4) Exposición pública:
   - Publicar **solo** el frontend a través del proxy de Coolify (Traefik).
   - Mantener backend/DB/Redis sin exposición directa al host.

5) Verificación:
   - Frontend responde `/` (SPA)
   - Backend responde `/health/ready`
   - Frontend puede llamar `/api/...` sin CORS (misma origin)

---

## Cloudflare Tunnel (cloudflared) – patrón de configuración

La idea es que el tunnel apunte al **reverse proxy de Coolify** (HTTP 80 o HTTPS 443), no al backend directo.

Ejemplo (modelo de `config.yml`):

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /etc/cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: <app.dominio>
    service: http://<IP_O_HOST_DEL_PROXY_DE_COOLIFY>:80
  - service: http_status:404
```

DNS (Cloudflare):
- CNAME `<subdominio>` → `<TUNNEL_ID>.cfargotunnel.com` (proxied).

---

## Opcional: proxy `/uploads` en Nginx (solo si re‑habilitas uploads)

Si tu backend entrega URLs tipo `/uploads/archivo.jpg`, el navegador pedirá `https://<app.dominio>/uploads/archivo.jpg`.
Si el frontend (Nginx) no tiene regla, eso da `404`.

Puedes agregar este bloque a `frontend/nginx.conf.template` (mismo enfoque que `/api`):

```nginx
location = /uploads {
  return 301 /uploads/;
}

location /uploads/ {
  proxy_pass ${BACKEND_URL}/uploads/;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_redirect off;
}
```

Requiere re‑habilitar `/uploads` en backend. No es el camino recomendado si quieres privacidad de imágenes.

---

## Nota de seguridad (frontend)

- Sourcemaps desactivados en producción y `.map` bloqueados en Nginx para evitar exponer código fuente en DevTools.

---

## Troubleshooting (síntoma → causa → solución)

- `ERR_BLOCKED_BY_CLIENT` al llamar `http://localhost:5000/...`
  - Causa: hardcode a localhost o requests cross‑origin.
  - Solución: usar rutas relativas `/api/...` y dejar que Nginx proxyee.

- `404` en `/api/...`
  - Causa: Nginx no está proxyando `/api/` al backend o `BACKEND_URL` mal configurado.
  - Solución: revisar `nginx.conf.template` y el entrypoint/envsubst.

- `404` en `/uploads/...`
  - Causa: falta proxy `/uploads` en Nginx (o falta compartir volumen).
  - Solución: agregar el bloque “Opcional: proxy /uploads” o montar volumen.

- `502/504` desde el dominio público
  - Causa: backend no healthy / no alcanzable desde frontend/proxy.
  - Solución: revisar healthcheck `/health/ready` y logs del backend.

- Rate limiting / IP real incorrecta
  - Causa: `trust proxy` mal seteado.
  - Solución: mantener `app.set('trust proxy', 3)` o ajustar al número real de saltos en tu arquitectura.

---

## Notas sobre el Dockerfile del frontend (build estable en Coolify)

En el repo aparece el ajuste de instalar `devDependencies` durante el build (para asegurar que Vite esté disponible incluso si `NODE_ENV=production` se inyecta durante build):

- `RUN npm ci --include=dev`

Si tu build falla por “vite not found” o dependencias faltantes en producción, este patrón es el que lo evita.

