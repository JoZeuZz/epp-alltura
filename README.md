# Alltura · Control Operativo de Equipos y Herramientas

> Sistema de gestión de inventario, custodia, entregas y devoluciones de activos serializados (EPP, equipos, herramientas) para operaciones en terreno.

![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

---

## Contenidos

- [Características](#características)
- [Stack técnico](#stack-técnico)
- [Arquitectura](#arquitectura)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Quick start local](#quick-start-local)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Despliegue](#despliegue)
- [Seguridad](#seguridad)

---

## Características

| Módulo | Descripción |
|---|---|
| **Inventario** | CRUD de artículos (EPP, equipos, herramientas) con clasificación, subclasificación y tracking por serial |
| **Entregas** | Flujo borrador → firma digital → confirmación con apertura de custodia y trazabilidad |
| **Devoluciones** | Flujo borrador → firma digital → confirmación con disposición (devuelto, perdido, baja, mantención) |
| **Firma digital** | Firma en dispositivo o por QR público, con SSE para sincronización en tiempo real |
| **Dashboard** | Métricas operativas, distribución de inventario por ubicación |
| **Exportaciones** | PDF (perfil de activo, listados, documentos de entrega) y Excel (inventario) |
| **Notificaciones push** | Web Push con VAPID para eventos operativos |
| **Almacenamiento** | Imágenes y documentos (facturas, manuales, certificaciones) en Google Cloud Storage |
| **Gestión de usuarios** | Roles admin / supervisor; trabajadores como entidad de dominio sin acceso al sistema |
| **Auditoría** | Log estructurado por request, audit trail de eventos de negocio en base de datos |

---

## Stack técnico

### Frontend

| Tecnología | Versión | Uso |
|---|---|---|
| React | 19 | UI |
| TypeScript | 5 | Tipado estático |
| Vite | 6 | Bundler y dev server |
| TanStack Query | 5 | Server state y caché |
| React Hook Form + Zod | — | Formularios y validación client-side |
| Tailwind CSS | 3 | Estilos utilitarios |
| `@jozeuZz/alltura-ui` | — | Design system interno |
| Axios | — | Cliente HTTP |
| Lucide React | — | Iconografía |
| Vitest + Testing Library | — | Tests unitarios |
| Playwright | — | Smoke tests E2E |

### Backend

| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | 20 | Runtime |
| Express | 5 | Framework HTTP |
| PostgreSQL | 17 | Base de datos relacional |
| Redis | 7 | Caché y rate limiting |
| Joi | — | Validación de entradas |
| JWT (access + refresh) | — | Autenticación |
| PDFKit | — | Generación de PDF |
| ExcelJS | — | Exportación Excel |
| Google Cloud Storage | — | Almacenamiento de archivos |
| Winston | — | Logging estructurado |
| web-push | — | Notificaciones push VAPID |
| Jest + Supertest | — | Tests unitarios e integración |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│          React 19 · Vite · TanStack Query               │
└─────────────────────┬───────────────────────────────────┘
                      │  /api  (same-origin proxy)
┌─────────────────────▼───────────────────────────────────┐
│                 Express 5 (Node 20)                     │
│  routes → controllers → services → models / db          │
│                                                         │
│  middleware: auth · roles · rateLimit · helmet · cors   │
│             sanitization · requestId · errorHandler     │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
  ┌────────▼────────┐       ┌─────────▼──────────┐
  │   PostgreSQL    │       │       Redis          │
  │  (datos core)   │       │  (caché · sessions)  │
  └─────────────────┘       └──────────────────────┘
                                      │
                          ┌───────────▼──────────┐
                          │  Google Cloud Storage │
                          │  (imágenes · PDFs     │
                          │   facturas · manuales)│
                          └──────────────────────┘
```

**Flujos de negocio principales:**

```
Entrega:    borrador ──► firma (QR/dispositivo) ──► confirmación
                                                        │
                                              abre custodia_activo
                                              registra movimiento

Devolución: borrador ──► firma (QR/dispositivo) ──► confirmación
                                                        │
                                              cierra custodia_activo
                                              actualiza estado/ubicación
```

**Roles:**

| Rol | Acceso |
|---|---|
| `admin` | Gestión completa: inventario, usuarios, ubicaciones, entregas, devoluciones |
| `supervisor` | Dashboard operativo y perfil |
| `trabajador` | Entidad de dominio (no tiene acceso al sistema, es receptor de activos) |

---

## Estructura del proyecto

```
.
├── backend/
│   ├── src/
│   │   ├── config/          # Configuración app y Swagger
│   │   ├── controllers/     # Manejo HTTP por dominio
│   │   ├── services/        # Lógica de negocio
│   │   ├── models/          # Queries SQL por entidad
│   │   ├── routes/          # Definición de rutas API
│   │   ├── middleware/       # Auth, roles, rate limit, seguridad
│   │   ├── lib/             # Utilidades: PDF, GCS, logging, SSE
│   │   ├── db/              # Pool, inicialización DB
│   │   └── tests/           # Tests unitarios, integración, contratos
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes reutilizables y modales
│   │   ├── pages/           # Vistas por rol (admin, supervisor, public)
│   │   ├── hooks/           # Custom hooks (auth, PDF, SSE, exports)
│   │   ├── layouts/         # AppLayout principal
│   │   └── config/          # Constantes y configuración
│   └── Dockerfile
├── db/
│   └── init/
│       ├── 001-init.sql     # Schema idempotente (source of truth)
│       └── 002-dev-seed.sql # Datos de desarrollo
├── docs/                    # Guías de despliegue, smoke checklist, GCP
├── scripts/                 # Scripts de calidad y verificación
├── docker-compose.yml       # Stack completo (producción)
└── docker-compose.dev.yml   # Solo PostgreSQL + Redis (desarrollo local)
```

---

## Quick start local

### 1. Instalar dependencias

```bash
npm run install:all
```

### 2. Levantar infraestructura local

```bash
docker compose -f docker-compose.dev.yml up -d
```

Servicios expuestos en el host:

| Servicio | Puerto |
|---|---|
| PostgreSQL | `55432` |
| Redis | `56379` |

### 3. Configurar variables de entorno

```bash
cp backend/.env.example backend/.env
# Editar backend/.env con los valores del paso anterior
```

### 4. Levantar backend y frontend

```bash
npm run dev
```

| Servicio | URL |
|---|---|
| Backend API | `http://localhost:5000` |
| Frontend | `http://localhost:3000` |

---

## Variables de entorno

El archivo `backend/.env.example` contiene todas las variables documentadas. Las mínimas para desarrollo local:

```env
NODE_ENV=development
PORT=5000

# Base de datos
DB_HOST=localhost
DB_PORT=55432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=herramientas_epp

# Redis
REDIS_URL=redis://localhost:56379

# JWT
JWT_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me_too

# CORS / Proxy
CLIENT_URL=http://localhost:3000
SERVICE_URL_FRONTEND=http://localhost:3000
SERVICE_FQDN_FRONTEND=localhost:3000
TRUST_PROXY_HOPS=3

# Firma (SSE)
AUTH_EVENTS_STREAM_TOKEN_TTL_SECONDS=1800
```

**Variables opcionales para producción:**

| Variable | Descripción |
|---|---|
| `IMAGE_STORAGE_PROVIDER` | `local` (default) o `gcs` |
| `GCS_BUCKET_NAME` | Nombre del bucket de GCS |
| `GCS_PROJECT_ID` | ID del proyecto en GCP |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path al service account JSON |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web push (push notifications) |

---

## Scripts disponibles

```bash
# Desarrollo
npm run dev                     # Backend + frontend en paralelo
npm run start:backend           # Solo backend (producción)

# Calidad de código
npm run lint                    # ESLint en backend y frontend
npm run lint:ci                 # lint + validaciones de contratos
npm run check:backend-validation  # Verifica uso de validación Joi
npm run check:legacy            # Detecta campos legacy en el codebase

# Tests
npm test                        # Backend + frontend
npm run test:backend            # Tests unitarios backend (Jest)
npm run test:frontend           # Tests unitarios frontend (Vitest)
npm run test:integration-db     # Tests de integración con DB real
npm run test:smoke:real         # Smoke tests E2E (Playwright)

# Verificaciones
npm run verify:public:inventario  # Health check de la instancia pública
npm run check:docs-contract-drift # Detecta drift entre docs y contratos
```

---

## Despliegue

El proyecto se despliega en **[Coolify](https://coolify.io/)** (self-hosted) con **Cloudflare Tunnel** como ingress.

```bash
# Stack completo (producción)
docker compose up -d
```

La imagen de frontend actúa como servidor Nginx que proxea `/api/*` al backend. Toda la comunicación es same-origin.

Guías detalladas:

- [`docs/deploy-coolify.md`](docs/deploy-coolify.md) — Configuración en Coolify
- [`docs/DEPLOY_COOLIFY_CLOUDFLARE_TUNNEL.md`](docs/DEPLOY_COOLIFY_CLOUDFLARE_TUNNEL.md) — Tunnel con Cloudflare
- [`docs/gcp-setup.md`](docs/gcp-setup.md) — Google Cloud Storage
- [`docs/ops/backup-restore.md`](docs/ops/backup-restore.md) — Backup y restore de PostgreSQL

---

## Seguridad

| Capa | Mecanismo |
|---|---|
| Autenticación | JWT access token (corta duración) + refresh token (rotación) |
| Autorización | RBAC por rol (`admin`, `supervisor`) con middleware por ruta |
| Entradas | Validación Joi en todas las rutas API |
| Headers HTTP | `helmet` (CSP, HSTS, X-Frame, etc.) |
| CORS | Whitelist de origins configurada por variable de entorno |
| Inyección | `express-mongo-sanitize`, `xss-clean`, `hpp`, `isomorphic-dompurify` |
| Rate limiting | `express-rate-limit` por IP y por endpoint sensible |
| Contraseñas | Bcrypt con política de complejidad mínima |
| Logging | RequestId por request, logs estructurados con Winston, audit trail en DB |
| Firma pública | Token de un solo uso con TTL para flujo QR sin sesión autenticada |

---

## Documentación adicional

- [`backend/README.md`](backend/README.md)
- [`frontend/README.md`](frontend/README.md)
- [`docs/epp-smoke-checklist.md`](docs/epp-smoke-checklist.md)
- [`docs/legacy-deprecation-matrix.md`](docs/legacy-deprecation-matrix.md)
