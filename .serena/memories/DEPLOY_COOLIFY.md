# Deploy a Coolify


**Estado:** ✅ Completado
**Dominio Producción:** https://appandamios.alltura.cl
**Infraestructura:** Coolify + Cloudflare Tunnel

---

## RESUMEN EJECUTIVO

Deployment completo de la aplicación AppAndamios a Coolify con:

- Frontend Nginx sirviendo SPA React
- Backend Node.js con Express
- PostgreSQL 15 + Redis 7
- Cloudflare Tunnel para exposición pública
- Traefik como reverse proxy

---

## ARQUITECTURA DE INFRAESTRUCTURA

```
┌─────────────────────────────────────────────────────────────┐
│                     INTERNET                                 │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                     CLOUDFLARE                               │
│  DNS: appandamios.alltura.cl → cfargotunnel.com             │
│  SSL: Cloudflare managed                                     │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│            LXC: CLOUDFLARED (192.168.1.X)                    │
│  cloudflared tunnel → http://192.168.1.7:80                 │
│  Config: /etc/cloudflared/config.yml                         │
│  Service: systemctl status cloudflared                       │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│              LXC: DOCKER-DEV (192.168.1.7)                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    TRAEFIK (coolify-proxy)               ││
│  │  Puerto: 80, 443, 8080                                   ││
│  │  Labels routing: Host(`appandamios.alltura.cl`)          ││
│  └─────────────────────────┬───────────────────────────────┘│
│                            │                                 │
│  ┌─────────────────────────▼───────────────────────────────┐│
│  │               FRONTEND (nginx:alpine)                    ││
│  │  Puerto interno: 80                                      ││
│  │  Config: nginx.conf.template → proxy /api → backend      ││
│  └─────────────────────────┬───────────────────────────────┘│
│                            │                                 │
│  ┌─────────────────────────▼───────────────────────────────┐│
│  │               BACKEND (node:20-alpine)                   ││
│  │  Puerto: 5000 (expuesto)                                 ││
│  │  Health: /health/ready                                   ││
│  └─────────────────────────┬───────────────────────────────┘│
│                            │                                 │
│  ┌─────────────────────────▼────────┬──────────────────────┐│
│  │    POSTGRESQL                    │     REDIS            ││
│  │    postgres:15-alpine            │     redis:7-alpine   ││
│  │    Port: 5432 (internal)         │     Port: 6379       ││
│  └──────────────────────────────────┴──────────────────────┘│
└─────────────────────────────────────────────────────────────┘

LXC: COOLIFY (192.168.1.11)
  - Panel: http://192.168.1.11:8000
  - Coolify DB, Redis, Realtime, Sentinel
```

---

## SERVIDORES

| Nombre      | IP           | Rol                                           |
| ----------- | ------------ | --------------------------------------------- |
| coolify     | 192.168.1.11 | Panel Coolify                                 |
| docker-dev  | 192.168.1.7  | Servidor Docker donde corren los contenedores |
| cloudflared | 192.168.1.X  | Túnel Cloudflare                              |

---

## PROBLEMAS RESUELTOS

### 1. Node.js Version (Dockerfiles)

**Problema:** Vite 7.x requiere Node 20+, jsdom requiere Node 20+
**Solución:** Actualizar `FROM node:18-alpine` → `FROM node:20-alpine` en ambos Dockerfiles
**Archivos:** `frontend/Dockerfile`, `backend/Dockerfile`

### 2. Nginx Proxy Pass (/api prefix)

**Problema:** `proxy_pass ${BACKEND_URL}/;` quitaba el prefijo `/api`
**Solución:** Remover trailing slash: `proxy_pass ${BACKEND_URL};`
**Archivo:** `frontend/nginx.conf.template`

### 3. Express Trust Proxy

**Problema:** Rate limiter fallaba con X-Forwarded-For headers
**Solución:** Agregar `app.set('trust proxy', 3);` (3 hops: Cloudflare→Traefik→nginx)
**Archivo:** `backend/src/index.js`

### 4. Rate Limiter Muy Restrictivo

**Problema:** 5 intentos/15min causaba bloqueos en uso normal
**Solución:** Aumentar a 30 intentos/15min
**Archivo:** `backend/src/routes/auth.routes.js`

### 5. Traefik Routing Rules

**Problema:** `Host(\`\`) && PathPrefix(\`appandamios.alltura.cl\`)`(host vacío)
**Solución:** Reconfigurar dominio en Coolify UI → redeploy
**Correcto:**`Host(\`appandamios.alltura.cl\`) && PathPrefix(\`/\`)`

### 6. Cloudflare Tunnel Config

**Problema:** Túnel apuntaba a servidor incorrecto
**Solución:** Cambiar `http://192.168.1.11:80` → `http://192.168.1.7:80`
**Archivo:** `/etc/cloudflared/config.yml`

### 7. Cloudflared Service Type

**Problema:** Service corría como DoH proxy en vez de tunnel
**Solución:** Reconfigurar systemd service con ExecStart correcto
**Archivo:** `/etc/systemd/system/cloudflared.service`

---

## ARCHIVOS MODIFICADOS (DEPLOYMENT)

### Frontend

- `frontend/Dockerfile` - Node 20, npm ci simplificado
- `frontend/nginx.conf.template` - proxy_pass fix

### Backend

- `backend/Dockerfile` - Node 20
- `backend/src/index.js` - trust proxy, health ready (/health/ready)
- `backend/src/routes/auth.routes.js` - rate limit 30/15min

### Docker Compose

- `docker-compose.yml` - `expose` en vez de `ports` para servicios internos

---

## CONFIGURACIÓN CLOUDFLARE TUNNEL

### /etc/cloudflared/config.yml

```yaml
tunnel: alltura-coolify
credentials-file: /root/.cloudflared/e5613d2f-f113-4076-84c8-61454d3c52a0.json

ingress:
  - hostname: appandamios.alltura.cl
    service: http://192.168.1.7:80
  - service: http_status:404
```

### /etc/systemd/system/cloudflared.service

```ini
[Unit]
Description=Cloudflare Tunnel
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared tunnel --config /etc/cloudflared/config.yml run
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### DNS Cloudflare

- Tipo: CNAME
- Name: appandamios
- Target: e5613d2f-f113-4076-84c8-61454d3c52a0.cfargotunnel.com
- Proxy: Enabled (orange cloud)

---

## VARIABLES DE ENTORNO PRODUCCIÓN (Coolify)

### Nuevas variables agregadas

Backend / Infra:
- `DB_POOL_MAX`
- `DB_POOL_IDLE_MS`
- `DB_POOL_CONN_TIMEOUT_MS`
- `DB_POOL_MAX_USES` (opcional)
- `LOG_LEVEL`

Rate limiting:
- `IMAGE_PROXY_RATE_LIMIT_MAX`
- `IMAGE_PROXY_RATE_LIMIT_WINDOW_MS`
- `REPORT_RATE_LIMIT_MAX`
- `REPORT_RATE_LIMIT_WINDOW_MS`

Imágenes:
- `IMAGE_MAX_BYTES`
- `IMAGE_STRIP_METADATA`
- `IMAGE_JPEG_QUALITY`
- `IMAGE_CACHE_CONTROL`
- `VITE_IMAGE_MAX_MB` (frontend build)

```env
DB_USER=alltura_user
DB_PORT=5432
DB_HOST=postgres_db
DB_PASSWORD=9@5HoW^2bS8q^zm0uUDm10H5Z_0AYew*
DB_NAME=alltura_reports_db
NODE_ENV=production
PORT=5000
BACKEND_URL=http://backend:5000
CLIENT_URL=https://appandamios.alltura.cl
JWT_SECRET=f77f2c10c71f...
JWT_REFRESH_SECRET=4b7de77f1d4c...
REDIS_URL=redis://redis:6379
SESSION_SECRET=4c619bba38251f...
VAPID_PUBLIC_KEY=BIoN1QT2gWkiiuTY...
VAPID_PRIVATE_KEY=PDznXI1WXmcsySe...
SERVICE_URL_FRONTEND=https://appandamios.alltura.cl
SERVICE_FQDN_FRONTEND=appandamios.alltura.cl
```

---

## COMANDOS ÚTILES

### Docker-Dev (192.168.1.7)

```bash
# Ver contenedores
docker ps

# Logs frontend
docker logs -f $(docker ps -q --filter "name=frontend")

# Logs backend
docker logs -f $(docker ps -q --filter "name=backend")

# Test health
curl -s http://localhost:5000/health/ready

# Test login directo
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alltura.cl","password":"CAMBIA_ESTA_PASSWORD"}'

# Reiniciar Redis (limpiar rate limits)
docker restart $(docker ps -q --filter "name=redis-yk4kgcck")

# Ver labels Traefik del frontend
docker inspect $(docker ps -q --filter "name=frontend") --format '{{json .Config.Labels}}' | jq . | grep traefik

# Crear usuario admin
docker exec -it $(docker ps -q --filter "name=backend") sh
cd src/scripts
node create-admin.js
```

### Cloudflared LXC

```bash
# Ver estado túnel
systemctl status cloudflared

# Reiniciar túnel
systemctl restart cloudflared

# Test conectividad a Docker-Dev
curl -I -H "Host: appandamios.alltura.cl" http://192.168.1.7:80

# Ver config
cat /etc/cloudflared/config.yml
```

### Coolify LXC (192.168.1.11)

```bash
# Ver logs Traefik
docker logs --tail 50 coolify-proxy
```

---

## CREDENCIALES ADMIN

- **Email:** admin@alltura.cl
- **Password:** CAMBIA_ESTA_PASSWORD
- **Creado con:** `node src/scripts/create-admin.js`

---

## CHECKLIST POST-DEPLOY

1. [ ] Verificar `/health/ready` desde el contenedor backend
2. [ ] Probar login y carga de imágenes (proxy + GCS)
3. [ ] Configurar backups automáticos PostgreSQL
4. [ ] Monitoreo básico (uptime + logs)

---

## FLUJO DE DEPLOY FUTURO

1. Push a `main` en GitHub
2. En Coolify: hacer Redeploy
3. Esperar build (~30 segundos)
4. Verificar en https://appandamios.alltura.cl

---

**ESTADO FINAL:** Deployment funcional. Frontend carga, backend responde y DB persiste datos. Mantener `package-lock.json` sincronizado para evitar fallas en `npm ci`.
