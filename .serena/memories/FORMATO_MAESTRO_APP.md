# Formato Maestro para Nuevas Apps Alltura (Guía para agentes IA)

**Estado:** Actual

## Objetivo del documento
Este documento es la **fuente de verdad** para crear nuevas aplicaciones Alltura con el mismo diseño, stack y prácticas de Alltura Reports. Un agente de IA debe seguir estas reglas **sin improvisar**. La meta es que todas las apps se vean, operen y se desplieguen como un solo sistema coherente.

---

# 1) Reglas de oro (no negociables)

1) **Mismo stack** (frontend, backend, infra). No sustituir librerías principales.
2) **Same-origin `/api`**. Nunca hardcodear dominios o `localhost`.
3) **Identidad visual idéntica**. Usa tokens y patrones exactos.
4) **Seguridad por defecto**: RBAC + validación por recurso + logs redactados.
5) **Mobile-first real**: layouts compactos + progressive disclosure.
6) **Guías/tours**: onboarding + contexto por página.

Si una decisión contradice alguno de estos puntos, se descarta.

---

# 2) Stack obligatorio (referencia exacta)

### Frontend
- React + TypeScript
- Vite
- React Router v7 (loaders/actions)
- Tailwind CSS
- React Hook Form + Zod
- Axios con refresh token
- react-hot-toast

### Backend
- Node.js + Express
- PostgreSQL
- Redis
- Google Cloud Storage + image-proxy
- Winston + Joi

### Infra
- Coolify + Cloudflare Tunnel
- Nginx frontend con `/api` proxy

---

# 3) Identidad visual y diseño (obligatorio)

### Tokens de color (Tailwind)
- `primary-blue` #2A64A4
- `dark-blue` #1E2A4A
- `neutral-gray` #6B7280
- `light-gray-bg` #F9FAFB

### Tipografía
- Inter (importada en `frontend/src/index.css`)
- Clases tipográficas existentes: `heading-*`, `body-*`, `label-*`, `stat-*`

### Layout base
- `AppLayout`: sidebar + header + contenido central.
- Sidebar colapsable (desktop) + off‑canvas (móvil).
- Header con logo, notificaciones y perfil.

### UI patterns
- Cards: `rounded-lg`, `shadow-md`, padding 3–6.
- Inputs: border suave + `focus:ring-primary-blue`.
- Botones: CTA con `primary-blue` y sombras suaves.

---

# 4) Arquitectura y patrones (backend)

### 3‑Layer architecture
- Controllers → Services → Models
- Controllers: solo HTTP (req/res), sin lógica de negocio.
- Services: reglas de negocio y validaciones.
- Models: DB CRUD.

### Seguridad
- RBAC por rol + **validación por recurso**.
- Logs redactados (password/token/authorization/etc.).
- Refresh tokens en Redis.

---

# 5) Arquitectura y patrones (frontend)

### Routing
- React Router v7 (loaders/actions por página).
- Lazy loading con `React.lazy`.

### API
- `apiService` central con Axios.
- Interceptor: refresh token en 401.

### Formularios
- React Hook Form + Zod.
- Validaciones inline.

### UI
- Reutilizar componentes existentes y su estilo.

---

# 6) Componentes obligatorios (reusar siempre)

### Layout
- `AppLayout`
- `NotificationBell`

### UI base
- `Modal` / `ConfirmationModal`
- `ResponsiveGrid`
- `UploadProgress`
- `ImageWithFallback`

### Métricas
- `MetricCard`
- `StatsCard`
- `ProjectDashboard`

### Guías
- `TourOverlay`
- `TourContext`
- `tourSteps`

---

# 7) UX obligatorio

1) **Progressive disclosure**: no mostrar filtros o botones si no hay data.
2) **Empty states** claros y accionables.
3) **Mobile-first** con botones ≥ 44px.
4) **Notificaciones** coherentes en desktop y móvil.
5) **Modales** con focus trap.

---

# 8) Guías/Tours (muy importante)

- **Onboarding por rol**.
- **Guías contextuales por página**.
- Cada elemento requiere `data-tour`.
- Evitar pasos frágiles (botones que cambian posición).

---

# 9) Proceso recomendado para nueva app (paso a paso)

### Paso 1: Preparación
- Clonar repo base.
- Renombrar proyecto sin alterar estructura.

### Paso 2: Branding mínimo
- Cambiar textos visibles (nombre app) **sin tocar tokens**.
- Mantener logo y colores Alltura.

### Paso 3: Definir roles
- Mantener jerarquía actual, extender solo si es necesario.
- Actualizar navegación en `AppLayout`.

### Paso 4: Modelos y API
- Crear entidades en backend siguiendo 3‑layer.
- Incluir endpoints CRUD + historial.

### Paso 5: Páginas y UI
- Layout central con cards + formularios.
- Reusar `ResponsiveGrid`, `Modal`, `UploadProgress`.

### Paso 6: Seguridad
- Validación por recurso obligatoria.
- Logs redactados por defecto.

### Paso 7: Guías
- Definir onboarding por rol.
- Definir guías por página.

### Paso 8: Deploy
- Same-origin `/api`.
- Nginx bloquea `.map`.

---

# 10) Plantilla para diseñar un nuevo módulo

**Para cada módulo**, documentar:
- Entidad principal (ej: Herramienta, EPP)
- Campos obligatorios
- Estados posibles
- Roles que pueden crear/editar/ver
- Endpoints CRUD
- UI principal (cards, tablas, filtros)
- Guías/tours

---

# 11) Plantilla técnica de endpoint (obligatoria)

**Formato estándar (usar en docs internas y al implementar):**

```
Método: POST | GET | PUT | PATCH | DELETE
Ruta: /api/... 
Rol requerido: admin | supervisor | client | custom
Recurso: project | scaffold | tool | epp | assignment | return
Acceso: rol + validación por recurso

Request:
  Headers: Authorization: Bearer <token>
  Body:
    - campo: tipo (requerido/opcional)

Validaciones:
  - Joi schema
  - reglas de negocio (services)

Response:
  200/201:
    { success, data }
  4xx:
    { message, errors, fieldErrors }

Notas:
  - si hay imagen, usar image-proxy
  - registrar en historial
```

---

# 12) Checklist por endpoint (antes de considerarlo listo)

- [ ] Validación Joi
- [ ] Reglas en service (no en controller)
- [ ] Respuesta estándar
- [ ] RBAC + validación por recurso
- [ ] Log seguro (sin datos sensibles)
- [ ] Si hay archivo: validación tamaño + image-proxy

---

# 13) Caso inicial: Control de herramientas y EPP

### Objetivo
Registrar entrega, recepción, devolución y trazabilidad de herramientas/EPP asignados a trabajadores.

### Módulos mínimos
- Inventario
- Asignaciones
- Devoluciones
- Historial
- Alertas

### Roles sugeridos
- Admin
- Bodega
- Supervisor
- Trabajador

### Flujo
1) Crear activo.
2) Asignar a trabajador con evidencia.
3) Registrar devolución o pérdida.
4) Mantener historial completo.

### UI
- Cards para inventario.
- Formulario de asignación con foto.
- Historial reutiliza patrón `HistoryPage`.

---

# 14) Mapa de pantallas recomendado (app de herramientas/EPP)

### Admin
- Dashboard (métricas globales)
- Inventario (listado + creación)
- Trabajadores (listado + asignaciones)
- Historial global (audit)
- Alertas (vencimientos/faltantes)
- Configuración (tipos de activos, estados)

### Bodega
- Dashboard (pendientes de entrega/devolución)
- Entregas (crear asignación)
- Devoluciones (registrar recepción)
- Inventario (stock actualizado)

### Supervisor
- Dashboard de cuadrilla
- Asignaciones activas
- Solicitudes de herramientas/EPP

### Trabajador
- Mis activos (asignados)
- Confirmar recepción
- Confirmar devolución
- Reportar pérdida/daño

---

# 15) Checklist de validación final (antes de considerar “listo”)

- [ ] Colores y tipografía iguales al formato maestro.
- [ ] Sidebar/Header intactos.
- [ ] Same-origin `/api`.
- [ ] RBAC + validación por recurso.
- [ ] Logs redactados.
- [ ] Guías/tours completos.
- [ ] Mobile-first validado.
- [ ] Deploy correcto en Coolify/Cloudflare.

---

# 16) Referencias internas (memorias)

- `ARQUITECTURA_SISTEMA`
- `SEGURIDAD_AUTORIZACION`
- `RESPONSIVE_DESIGN`
- `PROGRESSIVE_DISCLOSURE_PATTERNS`
- `TESTING_STRATEGY`
- `DEPLOY_COOLIFY`
- `DEPLOYMENT_COOLIFY_CLOUDFLARE`
- `VALIDACION_INLINE_SISTEMA`
- `REACT_ROUTER_V7_ACTIONS`
- `REACT_ROUTER_V7_MIGRATION`
- `REACT_HOOK_FORM_PATTERNS`

---

# 17) Estructura exacta de repo (plantilla base para nuevas apps)

Objetivo: crear un repo base "limpio" (sin residuos de dominio) que conserve **stack + diseño + UX patterns** de Alltura Reports.

Regla: el repo nuevo **solo** debe incluir lo necesario para:
- Auth + refresh (sesiones largas)
- RBAC
- Layout/Sidebar/Header + notificaciones
- Modales/UI base
- Tours (onboarding + contextual por pagina)
- Uploads privados (image-proxy) y bloqueo de sourcemaps
- Deploy Coolify + Cloudflare Tunnel

Arbol recomendado (paths exactos):

```text
alltura-app-template/
  .gitignore
  .gitingest-ignore
  .env.example
  .env.db.example
  README.md
  package.json
  package-lock.json
  docker-compose.yml
  docker-compose.dev.yml
  ecosystem.config.js
  tsconfig.json
  tsconfig.node.json
  scripts/
    generate-secrets.sh
  docs/
    deploy-coolify.md
    coolify-quickstart.md
    coolify-vars.md
    DEPLOY_COOLIFY_CLOUDFLARE_TUNNEL.md
  db/
    postgres/
      Dockerfile
    init/
      001-init.sql

  .vscode/
    mcp.json
  .serena/
    .gitignore
    project.yml
    memories/
      FORMATO_MAESTRO_APP.md
      ARQUITECTURA_SISTEMA.md
      SEGURIDAD_AUTORIZACION.md
      RESPONSIVE_DESIGN.md
      PROGRESSIVE_DISCLOSURE_PATTERNS.md
      PERFORMANCE_OPTIMIZATION_PATTERNS.md
      REFACTORIZACION_3LAYER.md
      SANITIZACION_VALIDATOR.md
      VALIDACION_INLINE_SISTEMA.md
      TESTING_STRATEGY.md
      REACT_ROUTER_V7_MIGRATION.md
      REACT_ROUTER_V7_ACTIONS.md
      REACT_HOOK_FORM_PATTERNS.md
      code_style_and_conventions.md
      DEPLOY_COOLIFY.md
      DEPLOYMENT_COOLIFY_CLOUDFLARE.md
      ACCESSIBILITY_IMPLEMENTATION_PHASE1.md

  backend/
    Dockerfile
    .dockerignore
    package.json
    package-lock.json
    README.md
    .env.example
    eslint.config.js
    jest.config.js
    service-account.example.json
    uploads/
      .gitkeep
    src/
      index.js
      index.test.js
      config/
        index.js
        swagger.js
      db/
        index.js
        initialize.js
        poolConfig.js
        setup.js
        check_db.js
      lib/
        asyncHandler.js
        auditLogger.js
        googleCloud.js
        healthCheck.js
        logger.js
        nameUtils.js
        pushNotifications.js
        redis.js
        responseMessages.js
        validators.js
        validation/
          index.js
      middleware/
        auth.js
        errorHandler.js
        passwordPolicy.js
        rateLimit.js
        requestId.js
        roles.js
        sanitization.js
        security.js
        upload.js
        validate.js
        validators.js
      models/
        notification.js
        user.js
      controllers/
        auth.controller.js
        dashboard.controller.js
        notification.controller.js
        users.controller.js
      services/
        auth.service.js
        dashboard.service.js
        notification.service.js
        users.service.js
      routes/
        auth.routes.js
        dashboard.routes.js
        health.js
        imageProxy.routes.js
        notification.routes.js
        users.routes.js
      tests/
        services/
          auth.service.test.js
  frontend/
    Dockerfile
    .dockerignore
    docker-entrypoint.sh
    package.json
    package-lock.json
    README.md
    .env.example
    .gitignore
    .prettierrc
    postcss.config.cjs
    tailwind.config.js
    tsconfig.json
    tsconfig.node.json
    vite.config.ts
    index.html
    nginx.conf.template
    public/
      favicon.ico
      favicon.png
      logo192.png
      logo512.png
      manifest.json
      robots.txt
      sw.js
    src/
      App.tsx
      index.tsx
      index.css
      setupTests.ts
      vite-env.d.ts
      assets/
        logo-alltura.png
        logo-alltura-white.png
      config/
        imageLimits.ts
      context/
        AuthContext.tsx
        NotificationContext.tsx
        TourContext.tsx
      hooks/
        index.ts
        useBreakpoint.ts
        useFormErrors.ts
        useGet.ts
        useMediaQuery.ts
        useMutate.ts
        useNotifications.ts
      layouts/
        AppLayout.tsx
      router/
        index.tsx
      services/
        apiService.ts
        authRefresh.ts
        notificationService.ts
        performanceService.ts
      types/
        api.d.ts
        components.d.ts
        index.ts
      utils/
        image.ts
        imageProcessing.ts
        name.ts
        tourSteps.ts
      components/
        ConfirmationModal.tsx
        ErrorMessage.tsx
        ErrorModal.tsx
        ErrorPage.tsx
        ImageWithFallback.tsx
        LoadingOverlay.tsx
        Modal.tsx
        NotificationBell.tsx
        NotificationItem.tsx
        PasswordStrength.tsx
        Spinner.tsx
        TourOverlay.tsx
        UploadProgress.tsx
        cards/
          EntityCard.tsx
          index.ts
        dashboard/
          MetricCard.tsx
          StatsCard.tsx
          index.ts
        forms/
          FormInputs.tsx
          index.ts
        icons/
          ImageUploadIcon.tsx
          InfoIcon.tsx
          UserIcon.tsx
          WarningIcon.tsx
        layout/
          Container.tsx
          ResponsiveGrid.tsx
          ResponsiveTable.tsx
          index.ts
      pages/
        LoginPage.tsx
        NotFoundPage.tsx
        NotificationsPage.tsx
        ProfilePage.tsx
        UnauthorizedPage.tsx
        admin/
          AdminDashboard.tsx
          UsersPage.tsx
        bodega/
          WarehouseDashboard.tsx
        supervisor/
          SupervisorDashboard.tsx
        worker/
          WorkerDashboard.tsx
      tests/
        responsive.test.ts
```

Notas:
- **No incluir**: `node_modules/`, `dist/`, `postgres-data/`, `.env`, logs, archivos reales de `service-account.json`, ni dumps/export de DB.
- `frontend/vite.config.ts` debe mantener **sourcemaps desactivados en build**.
- `frontend/nginx.conf.template` debe mantener **bloqueo de `*.map`** y proxy `/api`.
- `backend/src/routes/imageProxy.routes.js` + `backend/src/lib/googleCloud.js` se usan para servir imagenes **solo via proxy**.
