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
- `location /api/ { proxy_pass ${BACKEND_URL}/api/; ... }`【471:3†jozeuzz-report-alltura-8a5edab282632443.txt†L76-L96】

> Nota: en el repo también aparece una variante más simple que hace `proxy_pass ${BACKEND_URL};`. La intención en ambos casos es la misma: que el frontend sirva `/api/*` hacia el backend sin exponer el backend directamente.

### 3) BACKEND_URL se inyecta al arranque (sin rebuild)

El contenedor del frontend reemplaza `BACKEND_URL` en la plantilla de Nginx en runtime:

- Default: `http://backend:5000`
- Render: `envsubst '${BACKEND_URL}' < template > /etc/nginx/conf.d/default.conf`【471:5†jozeuzz-report-alltura-8a5edab282632443.txt†L100-L112】

Eso permite cambiar el destino del backend solo con variables de entorno de Coolify.

### 4) Backend preparado para estar detrás de múltiples proxys

El backend usa `trust proxy` con saltos explícitos (Cloudflare → proxy de Coolify → nginx → backend):

- `app.set('trust proxy', 3);`【471:2†jozeuzz-report-alltura-8a5edab282632443.txt†L95-L97】

Esto es importante para IP real, rate‑limits, cookies seguras, etc.

### 5) Healthcheck del backend

El backend expone `/health` (montado como ruta)【471:13†jozeuzz-report-alltura-8a5edab282632443.txt†L74-L75】 y el Dockerfile del backend define un `HEALTHCHECK` contra ese endpoint【471:11†jozeuzz-report-alltura-8a5edab282632443.txt†L32-L35】.

### 6) Archivos estáticos en `/uploads`

El backend sirve `uploads/` como estáticos bajo `/uploads` y agrega headers para permitir consumo cross‑origin si fuera necesario【471:13†jozeuzz-report-alltura-8a5edab282632443.txt†L32-L38】.

IMPORTANTE: para que el navegador pueda abrir `https://<app.dominio>/uploads/...` con el mismo dominio del frontend, necesitas una de estas opciones:

A) (Recomendado) Agregar un `location /uploads/` en el Nginx del frontend que proxyee al backend (ver “Opcional: proxy /uploads”).

B) Montar el mismo volumen `uploads/` también en el contenedor del frontend y servirlo como estático desde Nginx (menos común).

Si tu app hoy no usa uploads, puedes omitirlo, pero si ves `404` al pedir `/uploads/...`, esta es la causa más típica.

---

## Variables de entorno (referencia práctica)

Este repo trae un `backend/.env.example` con variables esperadas, incluyendo:

- `REDIS_URL` y `REDIS_PASSWORD`【471:2†jozeuzz-report-alltura-8a5edab282632443.txt†L1-L8】
- VAPID keys (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)【471:2†jozeuzz-report-alltura-8a5edab282632443.txt†L17-L22】
- `NODE_ENV`, `PORT`【471:2†jozeuzz-report-alltura-8a5edab282632443.txt†L24-L28】
- `CLIENT_URL` (CORS)【471:2†jozeuzz-report-alltura-8a5edab282632443.txt†L29-L31】

Recomendación operativa en Coolify: guardar todo lo sensible como **Secrets/Environment variables** (no en el repo).

### Generación rápida de secretos (repo)

El repo incluye `scripts/generate-secrets.sh` (usa `openssl rand`) para JWT y password de Postgres【471:1†jozeuzz-report-alltura-8a5edab282632443.txt†L79-L103】.

Para VAPID (web push) el mismo script indica generar con `npx web-push generate-vapid-keys`【471:1†jozeuzz-report-alltura-8a5edab282632443.txt†L100-L102】.

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
     - `BACKEND_URL` (por defecto `http://backend:5000`)【471:5†jozeuzz-report-alltura-8a5edab282632443.txt†L104-L106】
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
   - Backend responde `/health`
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

## Opcional: proxy `/uploads` en Nginx (recomendado si usas uploads)

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

El backend ya está listo para servir esos estáticos bajo `/uploads`【471:13†jozeuzz-report-alltura-8a5edab282632443.txt†L32-L38】.

---

## Troubleshooting (síntoma → causa → solución)

- `ERR_BLOCKED_BY_CLIENT` al llamar `http://localhost:5000/...`
  - Causa: hardcode a localhost o requests cross‑origin.
  - Solución: usar rutas relativas `/api/...` y dejar que Nginx proxyee.

- `404` en `/api/...`
  - Causa: Nginx no está proxyando `/api/` al backend o `BACKEND_URL` mal configurado.
  - Solución: revisar `nginx.conf.template`【471:3†jozeuzz-report-alltura-8a5edab282632443.txt†L80-L90】 y el entrypoint/envsubst【471:5†jozeuzz-report-alltura-8a5edab282632443.txt†L104-L110】.

- `404` en `/uploads/...`
  - Causa: falta proxy `/uploads` en Nginx (o falta compartir volumen).
  - Solución: agregar el bloque “Opcional: proxy /uploads” o montar volumen.

- `502/504` desde el dominio público
  - Causa: backend no healthy / no alcanzable desde frontend/proxy.
  - Solución: revisar healthcheck `/health`【471:11†jozeuzz-report-alltura-8a5edab282632443.txt†L32-L35】 y logs del backend.

- Rate limiting / IP real incorrecta
  - Causa: `trust proxy` mal seteado.
  - Solución: mantener `app.set('trust proxy', 3)`【471:2†jozeuzz-report-alltura-8a5edab282632443.txt†L95-L97】 o ajustar al número real de saltos en tu arquitectura.

---

## Notas sobre el Dockerfile del frontend (build estable en Coolify)

En el repo aparece el ajuste de instalar `devDependencies` durante el build (para asegurar que Vite esté disponible incluso si `NODE_ENV=production` se inyecta durante build):

- `RUN npm ci --include=dev`【471:3†jozeuzz-report-alltura-8a5edab282632443.txt†L8-L13】

Si tu build falla por “vite not found” o dependencias faltantes en producción, este patrón es el que lo evita.
