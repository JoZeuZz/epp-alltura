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
  index.ts       — VACÍO (sin exports)
```

## Estado actual (actualizado 2026-04-28)
- `shell/index.ts` exporta correctamente todos los primitivos incluyendo `frontendLogger`.
- Las páginas importan desde `src/components/`, `src/services/`, `src/context/` — que son re-exportadores delgados que apuntan a `src/shell/`. Patrón CORRECTO y funcionando.
- `frontendLogger` ahora se importa desde `../shell` (barrel) en NotificationsPage y useNotifications.

## Riesgo activo
- Los archivos re-exportadores en `src/components/`, `src/services/`, `src/context/`, `src/layouts/` son la interfaz pública para las páginas. Si alguien los borra sin migrar los imports, todo se rompe.
- El directorio `src/utils/` NO tiene espejo completo en shell (hooks, PasswordStrength, barcode, currency, quantity, rutUtils, toolPresentation permanecen solo en src/).
