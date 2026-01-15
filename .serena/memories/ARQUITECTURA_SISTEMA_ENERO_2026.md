# Arquitectura del Sistema Alltura - Estado Actualizado Enero 2026

## Descripción General
Sistema de gestión de andamios industriales persistentes con tracking completo, control de estados dual, auditoría inmutable, soft delete y roles RBAC.

## Stack Tecnológico

### Backend
- **Framework:** Node.js con Express.js 5.1.0
- **Lenguaje:** JavaScript (CommonJS)
- **Base de Datos:** PostgreSQL 15 (docker-compose usa `postgres:15-alpine`)
- **Cache/Blacklist:** Redis 7 (docker-compose usa `redis:7-alpine`)
- **Almacenamiento:** Google Cloud Storage (imágenes)
- **Validación:** Joi
- **Logging:** Winston

### Frontend
- **Framework:** React 19.1.1
- **Router:** React Router 7.1.3
- **Lenguaje:** TypeScript (TSX)
- **Build Tool:** Vite 7.1.8
- **Estilos:** Tailwind CSS v3+
- **Gestión de Estado:** Context API (AuthContext)
- **Data Fetching:** useLoaderData, useSubmit (React Router)
- **PWA:** `manifest.json` presente, pero no hay service worker registrado en `frontend/src/index.tsx`

## Modelo de Datos (5 Tablas Principales)

### 1. users
Usuarios del sistema con roles embebidos
- **Roles:** admin | supervisor | client
- **Campos:** id, first_name, last_name, email, password_hash, role, rut, phone_number, profile_picture_url
- **No tiene soft delete**

### 2. clients (CON SOFT DELETE)
Empresas mandantes (quienes contratan los servicios)
- **Campos:** id, name (unique), email, phone, address, specialty, **active BOOLEAN DEFAULT TRUE**
- **Constraint:** Si tiene proyectos → desactivar (no eliminar)
- **Cascada:** Cliente desactivado → Proyectos desactivados

### 3. projects (CON SOFT DELETE)
Proyectos de las empresas
- **Campos:** id, client_id (FK), name, status, assigned_client_id, assigned_supervisor_id, **active BOOLEAN DEFAULT TRUE**
- **FK:** `client_id REFERENCES clients(id) ON DELETE CASCADE`
- **Estados:** active | completed
- **Constraint:** Si tiene andamios → desactivar (no eliminar)
- **Query JOIN:** Siempre incluye `c.active as client_active`

### 4. scaffolds (ENTIDAD NUCLEAR)
Andamios persistentes con validaciones estrictas
- **Identificación:** scaffold_number, area, tag
- **Dimensiones:** width, length, height, cubic_meters (calculado)
- **Estados Dual:**
  - **card_status:** green | red
  - **assembly_status:** assembled | disassembled | in_progress
- **Progreso:** progress_percentage (0-100)
- **Imágenes:** 
  - assembly_image_url (obligatoria al crear)
  - disassembly_image_url (obligatoria al desarmar)
- **FK:** `project_id REFERENCES projects(id) ON DELETE CASCADE`
- **Validación:** No se pueden crear/editar/desarmar si proyecto/cliente inactivo

### 5. scaffold_history (HISTORIAL INMUTABLE)
Auditoría completa con denormalización para sobrevivir eliminaciones
- **FK:** `scaffold_id REFERENCES scaffolds(id) ON DELETE SET NULL` (nullable)
- **Campos base:** user_id, change_type, previous_data (JSONB), new_data (JSONB), description
- **Campos denormalizados:** scaffold_number, project_name, area, tag
- **Índice:** `idx_scaffold_history_user (user_id, created_at DESC)`
- **Tipos de cambio:** create, update, card_status, assembly_status, progress, dimensions, disassemble, delete

## Arquitectura de Capas

### Backend (3-Layer Architecture)

**Refactorizado en Enero 8-12, 2026** - Ver memoria: `REFACTORIZACION_3LAYER_ENERO_2026`

```
/backend/src
├── index.js                    # Entry point, Express app
├── db/
│   ├── index.js                # Pool de PostgreSQL
│   ├── initialize.js           # Init DB desde init.sql
│   └── setup.js                # Setup completo + crear admin
├── models/                     # LAYER 0: Data Access
│   ├── client.js               # deactivate(), reactivate(), getProjectCount(), getByName()
│   ├── project.js              # deactivate(), reactivate(), getScaffoldCount()
│   ├── scaffold.js             # CRUD andamios
│   ├── scaffoldHistory.js      # create(), getByUser(), createFromChanges()
│   └── user.js                 # CRUD usuarios
├── services/                   # LAYER 3: Business Logic
│   ├── auth.service.js         # AuthService (8 métodos)
│   ├── clients.service.js      # ClientService (10 métodos)
│   ├── dashboard.service.js    # DashboardService (8 métodos)
│   ├── notification.service.js # NotificationService (3 métodos)
│   ├── projects.service.js     # ProjectService (16 métodos)
│   ├── scaffolds.service.js    # ScaffoldService (20 métodos)
│   ├── supervisorDashboard.service.js  # SupervisorDashboardService (5 métodos)
│   └── users.service.js        # UserService (9 métodos)
├── controllers/                # LAYER 2: HTTP Orchestration
│   ├── auth.controller.js      # AuthController (5 métodos)
│   ├── clients.controller.js   # ClientController (6 métodos)
│   ├── dashboard.controller.js # DashboardController (2 métodos)
│   ├── notification.controller.js  # NotificationController (2 métodos)
│   ├── projects.controller.js  # ProjectController (13 métodos)
│   ├── scaffolds.controller.js # ScaffoldController (13 métodos)
│   ├── supervisorDashboard.controller.js  # SupervisorDashboardController (1 método)
│   └── users.controller.js     # UserController (8 métodos)
├── routes/                     # LAYER 1: Endpoint Definition
│   ├── auth.routes.js          # 5 endpoints (login, register, refresh, logout, changePassword)
│   ├── clients.routes.js       # 6 endpoints CRUD + reactivate
│   ├── dashboard.routes.js     # 2 endpoints (admin)
│   ├── notification.routes.js  # 2 endpoints (subscribe, send test)
│   ├── projects.routes.js      # 13 endpoints (CRUD + reportes)
│   ├── scaffolds.routes.js     # 13 endpoints (CRUD completo + estados)
│   ├── supervisorDashboard.routes.js  # 1 endpoint
│   ├── users.routes.js         # 8 endpoints (3 self-service + 5 admin)
│   └── legacy/                 # Archivos backup pre-refactorización
├── middleware/
│   ├── auth.js                 # JWT verification
│   ├── roles.js                # RBAC: isAdmin, isSupervisor, isAdminOrSupervisor
│   ├── errorHandler.js         # Global error handler
│   ├── passwordPolicy.js       # Password validation
│   └── sanitization.js         # DOMPurify
├── lib/
│   ├── logger.js               # Winston
│   ├── pdfGenerator.js         # Reportes PDF
│   ├── excelGenerator.js       # Reportes Excel
│   └── googleCloud.js          # GCS upload
└── scripts/
    ├── create-admin.js         # CLI crear admin
    └── migrate_scaffold_history.js  # Migración historial inmutable
```

**Características de la Arquitectura 3-Layer:**

1. **LAYER 1: Routes** - Definición de endpoints
   - Esquemas de validación Joi
   - Middlewares (auth, RBAC, rate limiting)
   - Configuración de multer (uploads)
   - ❌ SIN lógica de negocio

2. **LAYER 2: Controllers** - Orquestación HTTP
   - Extracción de datos (req.params, req.body, req.file)
   - Llamadas a servicios
   - Construcción de respuestas JSON
   - Error handling (try/catch + next)
   - ❌ SIN lógica de negocio, SIN queries SQL

3. **LAYER 3: Services** - Lógica de negocio pura
   - Validaciones de dominio
   - Cálculos y reglas de negocio
   - Llamadas a modelos (DB)
   - Integración con libs externas
   - ❌ SIN objetos req/res, SIN lógica HTTP

**Total: 8 módulos, 50 endpoints REST, 157 métodos (89 services + 68 controllers)**

### Frontend (Arquitectura por Roles)
```
/frontend/src
├── App.tsx                     # Router React Router v7
├── pages/
│   ├── admin/
│   │   ├── AdminDashboard.tsx
│   │   ├── ProjectsPage.tsx   # Soft delete UI, modal dinámico
│   │   ├── ClientsPage.tsx    # Soft delete UI
│   │   ├── ScaffoldsPage.tsx  # Banner proyecto inactivo
│   │   ├── UsersPage.tsx
│   │   └── HistoryPage.tsx    # Badge "andamio eliminado"
│   ├── supervisor/
│   │   ├── SupervisorDashboard.tsx
│   │   ├── ProjectScaffoldsPage.tsx  # Banner proyecto inactivo
│   │   └── CreateScaffoldPage.tsx    # Validación proyecto activo
│   ├── client/
│   │   └── ClientProjectScaffoldsPage.tsx  # Solo lectura
│   └── shared/
│       ├── LoginPage.tsx
│       └── ProfilePage.tsx
├── components/
│   ├── Modal.tsx              # Modal genérico
│   ├── ConfirmationModal.tsx  # Con SVG icons modernos
│   └── ScaffoldDetailsModal.tsx
├── layouts/
│   └── AppLayout.tsx          # Navbar RBAC
├── services/
│   └── api.ts                 # Axios clients
├── context/
│   └── AuthContext.tsx        # JWT, refresh, user state
└── router/
    └── index.tsx              # Loaders, actions
```

## Sistema de Seguridad

### Autenticación JWT
- **Access Token:** 15 minutos (header Authorization)
- **Refresh Token:** 7 días (almacenado en Redis con TTL)
- **Blacklist:** Redis con expiración automática
- **Password Policy:** NIST SP 800-63B (min 12 chars, mixto)
- **Rate Limiting:** 5 intentos / 15 min (IP + user-agent)

### Headers de Seguridad
```javascript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-eval'"], // Vite HMR dev
    },
  },
  hsts: { maxAge: 31536000 },
  frameguard: { action: 'deny' },
})
```

### Autorización por Recursos (Enero 15, 2026) ⭐ NUEVO
- **Arquitectura:** Defensa en profundidad (3 capas)
  1. **Autenticación:** `authMiddleware` verifica JWT
  2. **Rol:** `isAdmin`, `isSupervisor`, `isClient` validan user.role
  3. **Recurso:** `checkProjectAccess`, `checkScaffoldAccess`, `checkClientNoteAccess` validan acceso específico
- **20 endpoints protegidos** en 4 archivos de rutas
- **3 middlewares de autorización** creados (242 líneas en `roles.js`)
- **Logging completo:** Winston registra intentos no autorizados con userId, role, resourceId, IP
- **Frontend guards:** 6 loaders con validación de rol + redirección automática
- **Vulnerabilidades mitigadas:** CVE-ALLTURA-AUTH-001 (CRÍTICA), 002, 003
- **Memoria detallada:** `SEGURIDAD_AUTORIZACION_ENERO_2026`

## Roles y Permisos (RBAC)

### Admin
- **Rutas:** /admin/*
- **Permisos:** CRUD completo (usuarios, clientes, proyectos, andamios)
- **Especiales:** 
  - Único que puede eliminar/reactivar proyectos y clientes
  - Puede editar andamios de cualquier supervisor
  - Acceso a historial global
  - **Acceso total a todos los recursos** (bypass de checkProjectAccess, checkScaffoldAccess)

### Supervisor
- **Rutas:** /supervisor/*
- **Permisos:** Crear/editar/desarmar **TODOS los andamios** de proyectos asignados
- **Restricciones:**
  - Solo proyectos donde `assigned_supervisor_id === user.id`
  - Puede editar andamios de otros supervisores **si están en su proyecto**
  - No puede crear andamios en proyectos inactivos
  - **No puede acceder a proyectos no asignados** (validado por `checkProjectAccess`)

### Client
- **Rutas:** Limitadas
- **Permisos:** Solo visualización de andamios en proyectos de su empresa
- **Restricciones:**
  - Solo proyectos donde `project.client_id === user.client_id`
  - **No puede mutar datos** (solo lectura)
  - **Validado por queries a BD** en `checkProjectAccess` y `checkScaffoldAccess`

## Flujos Críticos con Soft Delete

### Creación de Andamio
```
1. Supervisor → POST /api/scaffolds (FormData + imagen)
2. Backend valida proyecto activo:
   if (!project.active || !project.client_active) → 400 error
3. Imagen → Google Cloud Storage
4. Scaffold → DB (assembly_status='assembled')
5. ScaffoldHistory.create() con datos denormalizados
6. Frontend actualiza vista
```

### Eliminación de Proyecto
```
1. Admin → DELETE /api/projects/:id
2. Backend verifica: const count = await Project.getScaffoldCount(id)
3. SI count > 0:
   - Project.deactivate(id) → active = FALSE
   - Response: { deactivated: true }
4. SI count == 0:
   - Project.delete(id) → DELETE FROM projects
   - Response: { message: 'Proyecto eliminado' }
```

### Eliminación de Andamio
```
1. Admin → DELETE /api/scaffolds/:id
2. Backend obtiene andamio completo + proyecto
3. ScaffoldHistory.create({ change_type: 'delete', ... }) ← ANTES de borrar
4. Eliminar imágenes del servidor
5. DELETE FROM scaffolds WHERE id = $1
6. PostgreSQL ejecuta SET NULL en scaffold_history.scaffold_id
7. Historial sobrevive con datos denormalizados
```

### Reactivación de Cliente
```
1. Admin → POST /api/clients/:id/reactivate
2. Client.reactivate(id):
   - UPDATE clients SET active = TRUE WHERE id = $1
   - UPDATE projects SET active = TRUE WHERE client_id = $1 (cascada)
3. Andamios vuelven a ser mutables
```

## API Principales

### Autenticación
- POST /api/auth/login
- POST /api/auth/refresh (renew access token)
- POST /api/auth/logout (blacklist token)

### Health
- GET /api/health
- GET /api/health/live
- GET /api/health/ready

### Scaffolds (Validaciones Proyecto Activo)
- GET /api/scaffolds
- GET /api/scaffolds/project/:projectId
- POST /api/scaffolds (valida proyecto activo)
- PUT /api/scaffolds/:id (valida proyecto activo)
- PATCH /api/scaffolds/:id/card-status
- PATCH /api/scaffolds/:id/assembly-status
- PUT /api/scaffolds/:id/disassemble (valida proyecto activo)
- DELETE /api/scaffolds/:id (registra en historial antes de borrar)
- GET /api/scaffolds/user-history/:userId

### Projects (Soft Delete)
- GET /api/projects (admin ve activos e inactivos; supervisor/client según asignación)
- POST /api/projects
- PUT /api/projects/:id
- DELETE /api/projects/:id (lógica condicional)
- PATCH /api/projects/:id/reactivate (admin)
- GET /api/projects/:id/scaffolds/count

### Clients (Soft Delete)
- GET /api/clients (admin ve activos e inactivos)
- POST /api/clients
- PUT /api/clients/:id
- DELETE /api/clients/:id (lógica condicional)
- POST /api/clients/:id/reactivate (admin)
- GET /api/clients/:id/projects/count

### Reportes
- GET /api/projects/:id/report/pdf
- GET /api/projects/:id/report/excel

## Reglas de Negocio Críticas

### Estados de Andamios
1. **Assembled scaffold:** progress_percentage = 100, card_status = green
2. **Disassembled scaffold:** progress_percentage = 0, card_status = red, requiere disassembly_image
3. **In_progress scaffold:** 0 < progress_percentage < 100, card_status = red
4. **Porcentaje NO retrocede** (salvo cambiar a disassembled)

### Soft Delete
5. **Proyecto con andamios:** desactivar (no eliminar)
6. **Cliente con proyectos:** desactivar (no eliminar)
7. **Cliente desactivado:** proyectos en cascada desactivados
8. **Proyecto desactivado:** andamios inmutables (no crear/editar/desarmar)

### Historial
9. **Todo cambio se registra** en scaffold_history con datos denormalizados
10. **Eliminación de andamio:** crear registro tipo 'delete' ANTES de borrar
11. **scaffold_id puede ser NULL:** andamio eliminado, datos denormalizados preservados

### Permisos
12. **Solo admin puede eliminar/reactivar** proyectos y clientes
13. **Supervisor solo edita andamios propios** (admin puede editar cualquiera)
14. **Cliente solo visualiza** (no muta datos)

## Monorepo Scripts

### Raíz
- `npm run dev` - Backend + frontend (concurrently)
- `npm run install:all` - Instalar todas las dependencias
- `npm run db:up` - Docker compose PostgreSQL
- `npm run db:logs` - Logs del contenedor de Postgres
- `npm run test` - Tests backend + frontend
- `npm run test:backend` - Solo tests backend
- `npm run test:frontend` - Solo tests frontend

### Backend
- `npm run dev` - Nodemon con hot reload
- `node src/db/setup.js` - Migración completa DB
- `node src/scripts/create-admin.js` - Crear admin CLI
- `node src/scripts/generate-secrets.js` - Generar secretos/env
- `node src/db/migrate_add_security_fields.js` - Migración de campos de seguridad
- `node src/scripts/fix-image-urls.js` - Normalizar URLs de imágenes

### Frontend
- `npm run dev` - Vite dev server (puerto 3000)
- `npm run build` - Build de producción
- `npm run preview` - Preview de build

## Cambios Recientes (Enero 2026)

### Sistema Soft Delete (Enero 4-5)
- Columna `active` agregada a `clients` y `projects`
- Métodos `deactivate()`, `reactivate()`, `getAllIncludingInactive()` en modelos
- Lógica condicional en endpoints DELETE
- UI: Modal dinámico, botón "Reactivar", badge "Desactivado"
- **Memoria detallada:** `SOFT_DELETE_SISTEMA_PROYECTOS_CLIENTES`

### Validaciones Proyecto Inactivo (Enero 5-6)
- POST /scaffolds: valida `project.active && project.client_active`
- PUT /scaffolds/:id: valida proyecto activo
- PUT /scaffolds/:id/disassemble: valida proyecto activo
- Frontend: Banner amarillo, botones deshabilitados

### Historial Inmutable (Enero 6)
- Columnas denormalizadas: scaffold_number, project_name, area, tag
- FK constraint: ON DELETE CASCADE → SET NULL
- scaffold_id nullable
- DELETE /scaffolds registra en historial ANTES de borrar
- Índice `idx_scaffold_history_user` para performance
- Query con COALESCE para mostrar datos actuales o denormalizados
- **Memoria detallada:** `HISTORIAL_INMUTABLE_ANDAMIOS`

### Refactorización 3-Layer (Enero 8-12)
- **Migración completa:** Fat Controllers → 3-Layer Architecture
- **8/8 módulos migrados:** scaffolds, projects, clients, auth, users, dashboard, supervisorDashboard, notifications
- **Separación de responsabilidades:** Routes (endpoints) → Controllers (HTTP) → Services (lógica)
- **50 endpoints REST** completamente refactorizados
- **157 métodos creados:** 89 métodos de service + 68 métodos de controller
- **15 errores corregidos:** 11 linting + 2 modelo (Client.getByName, getProjectCount) + 2 imports (auth.routes.js)
- **0 errores finales:** Código 100% funcional, sin dependencias circulares
- **Convenciones establecidas:** nombreModulo.service.js, nombreModulo.controller.js, nombreModulo.routes.js
- **Archivos legacy:** Movidos a /routes/legacy/ (10 backups)
- **Memoria detallada:** `REFACTORIZACION_3LAYER_ENERO_2026`

## Estado Actual del Código

### Backend
- **Líneas de código:** ~12,824 líneas (refactorización 3-Layer +4,824 líneas)
- **Modelos:** 5 (user, client, project, scaffold, scaffoldHistory)
- **Services:** 8 archivos (2,114 líneas, 89 métodos)
- **Controllers:** 8 archivos (1,280 líneas, 68 métodos)
- **Routes:** 8 archivos (1,430 líneas, 50 endpoints)
- **Middleware:** 8 (auth, RBAC, sanitization, passwordPolicy, errorHandler, etc.)
- **Tests:** 6 archivos en `/backend/src/tests` + extras en `/backend/src/routes/auth.test.js`, `/backend/src/index.test.js`, `/backend/src/lib/excelGenerator.test.js`

### Frontend
- **Líneas de código:** ~12,000
- **Páginas:** 15+ (admin, supervisor, client, shared)
- **Componentes:** 20+
- **TypeScript:** 100%
- **Build size:** ~475 KB (gzipped 151 KB)

## Próximos Pasos Sugeridos

### Limpieza Opcional (Prioridad Baja)
1. Remover middleware `trackScaffoldChanges` redundante de scaffolds.routes.js
2. Eliminar carpeta `/routes/legacy` después de validación en producción (1-2 meses)
3. Agregar tests unitarios para servicios (coverage actual <50%)

### Mejoras Funcionales (Prioridad Media)
1. Implementar notificaciones push completas (Web Push API)
2. Agregar geolocalización de andamios (Google Maps API)
3. Dashboard de auditoría para admins (cambios por usuario)
4. Política de retención de historial (archivar registros >2 años)
5. Exportar historial a CSV
6. Soft delete de andamios (en lugar de DELETE físico)

### Mejoras Técnicas (Prioridad Baja)
1. Migrar backend a TypeScript
2. Agregar validaciones con class-validator
3. Implementar DTOs (Data Transfer Objects)
4. Agregar OpenAPI/Swagger documentation
5. Implementar caché en servicios de dashboard (Redis)
6. App móvil nativa (React Native)
7. Implementar GraphQL como alternativa a REST
8. WebSockets para notificaciones en tiempo real

### Sistema Soft Delete (Enero 4-5)
- Columna `active` agregada a `clients` y `projects`
- Métodos `deactivate()`, `reactivate()`, `getAllIncludingInactive()` en modelos
- Lógica condicional en endpoints DELETE
- UI: Modal dinámico, botón "Reactivar", badge "Desactivado"

### Validaciones Proyecto Inactivo (Enero 5-6)
- POST /scaffolds: valida `project.active && project.client_active`
- PUT /scaffolds/:id: valida proyecto activo
- PUT /scaffolds/:id/disassemble: valida proyecto activo
- Frontend: Banner amarillo, botones deshabilitados

### Historial Inmutable (Enero 6)
- Columnas denormalizadas: scaffold_number, project_name, area, tag
- FK constraint: ON DELETE CASCADE → SET NULL
- scaffold_id nullable
- DELETE /scaffolds registra en historial ANTES de borrar
- Índice `idx_scaffold_history_user` para performance
- Query con COALESCE para mostrar datos actuales o denormalizados

## Estado Actual del Código

### Backend
- **Líneas de código:** ~12,824 (refactorización 3-Layer)
- **Modelos:** 5 (user, client, project, scaffold, scaffoldHistory)
- **Services:** 8 archivos (89 métodos)
- **Controllers:** 8 archivos (68 métodos)
- **Routes:** 8 archivos (50 endpoints REST)
- **Middleware:** 8 (auth, RBAC, sanitization, etc.)
- **Tests:** suite Jest v30 con thresholds 60% y 6 archivos principales + tests extra fuera de `/backend/src/tests`
  - auth.service.test.js (16 tests, 85% coverage)
  - scaffolds.service.test.js (22 tests, 80% coverage)
  - projects.service.test.js (18 tests, 75% coverage)
  - clients.service.test.js (16 tests, 80% coverage)
  - pdfGenerator.test.js (18 tests, 70% coverage)
  - excelGenerator.test.js (20 tests, 75% coverage)

### Frontend
- **Líneas de código:** ~12,000
- **Páginas:** 15+ (admin, supervisor, client, shared)
- **Componentes:** 20+
- **TypeScript:** 100%
- **Build size:** ~475 KB (gzipped 151 KB)

## Testing (Nuevo - Enero 13, 2026)

### Framework
- **Jest v30+** con coverage thresholds (60% global)
- **Patrón AAA:** Arrange-Act-Assert
- **110+ tests** en 6 archivos

### Coverage por Módulo
| Módulo | Tests | Coverage |
|--------|-------|----------|
| AuthService | 16 | 85% |
| ScaffoldService | 22 | 80% |
| ClientService | 16 | 80% |
| ProjectService | 18 | 75% |
| excelGenerator | 20 | 75% |
| pdfGenerator | 18 | 70% |

### Scripts NPM
```bash
npm test              # Ejecutar todos los tests
npm run test:watch    # Modo watch (desarrollo)
npm run test:coverage # Tests + reporte coverage
npm run test:verbose  # Output detallado
npm run test:services # Solo services
npm run test:lib      # Solo libs
```

**Documentación:** `/backend/docs/TESTING_GUIDE.md` (600+ líneas)

---

## Próximos Pasos Sugeridos
1. Aumentar coverage a >70% global (actualmente 60%+)
2. Tests de integración (DB real con Docker)
3. Tests E2E con Supertest (endpoints REST)
4. Implementar notificaciones push (Web Push API)
5. Agregar geolocalización de andamios (Google Maps)
6. Dashboard de auditoría para admins
7. Política de retención de historial (archivar >2 años)
8. App móvil nativa (React Native)
9. Exportar historial a CSV
10. Soft delete de andamios (en lugar de DELETE físico)
