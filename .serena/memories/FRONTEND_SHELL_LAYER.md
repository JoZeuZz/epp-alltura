# Capa Shell del Frontend (2026-04-28)

## Qué es
`frontend/src/shell/` es una nueva capa de librería compartida que replica los primitivos UI del frontend principal.
Propósito aparente: aislar componentes base reutilizables del código de página/negocio.

## Estructura
```
shell/
  components/    — ConfirmationModal, ErrorMessage, ErrorModal, ErrorPage, ImageWithFallback,
                   LoadingOverlay, Modal, NotificationBell, NotificationItem, Spinner,
                   TourOverlay, UploadProgress
  context/       — AuthContext, NotificationContext, TourContext (+ shared .ts)
  layout/        — AppLayout, Container, ResponsiveGrid, ResponsiveTable
  services/      — apiService, authRefresh, frontendLogger, httpClient,
                   notificationService, performanceService
  utils/         — imageProcessing, image, name, tourSteps
  index.ts       — barrel con todos los primitivos exportados (ver sección Estado actual)
```

## Estado actual (actualizado 2026-05-15) — @jozeuZz/alltura-ui@1.1.1

La capa shell es el paquete publicado `@jozeuZz/alltura-ui`. Version actual: **1.1.1**.
- `src/layouts/AppLayout.tsx` y `src/components/NotificationBell.tsx` en herramientas son re-exportadores delgados. Patrón correcto y funcionando.
- **Instalación en `package.json`:** `"@jozeuZz/alltura-ui": "1.1.1"` desde GitHub Packages — NUNCA `file:../../alltura-ui` en código committeado.
  - `file:` rompe Docker build en Coolify (el path `../../alltura-ui` no existe en el build context).
  - Para hot-reload local sobre alltura-ui: `npm link` temporal, sin commitear.
  - Tests siguen funcionando vía alias en `vite.config.ts → test.alias`.
- Registry en `.npmrc`: `@jozeuZz:registry=https://npm.pkg.github.com` + `NODE_AUTH_TOKEN`.

### Exports públicos del paquete (src/index.ts)
**Componentes:**
- Modal, ConfirmationModal (+ ConfirmationModalProps)
- ErrorMessage, ErrorPage, Spinner
- UploadProgress (+ UploadStage, UploadProgressProps)
- NotificationBell (+ NotificationBellProps), NotificationItem (+ NotificationItemProps)
- TourOverlay
- **Button** (+ ButtonProps, ButtonVariant, ButtonSize) — nuevo v1.1.0
- **StatusBadge** (+ StatusBadgeProps, StatusVariant) — nuevo v1.1.0
- **PageHeader** (+ PageHeaderProps) — nuevo v1.1.0
- **EmptyState** (+ EmptyStateProps) — nuevo v1.1.0

**Layout:** AppLayout (+ NavItem), Container/Section, ResponsiveGrid/CustomGrid, ResponsiveTable
**Context:** AuthProvider, NotificationProvider, TourProvider + shared types
**Hooks:** useAuth, useTour, useBreakpoints, useMediaQuery
**Services:** authRefresh, httpClient, notificationService, performanceService, frontendLogger
**Utils:** imageProcessing, name, tourSteps

## Riesgo activo
- Los re-exportadores en `src/components/`, `src/services/`, `src/context/`, `src/layouts/` son la interfaz pública. Borrarlos sin migrar imports rompe todo.
- `src/utils/` NO tiene espejo en shell (barcode, currency, quantity, rutUtils, toolPresentation permanecen solo en src/).
