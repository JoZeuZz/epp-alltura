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

## Estado actual (actualizado 2026-05-11)
- `shell/index.ts` exporta: Modal, ConfirmationModal, ErrorMessage, ErrorPage, Spinner, UploadProgress (+ UploadStage), NotificationBell, NotificationItem, TourOverlay, AppLayout, layout types, context providers/values, todos los services (apiService, authRefresh, httpClient, notificationService, performanceService, frontendLogger), imageProcessing utils, name utils.
- Las páginas importan desde `src/components/`, `src/services/`, `src/context/` — re-exportadores delgados hacia `src/shell/`. Patrón correcto y funcionando.
- **NO exportados desde shell** (limpieza de dead code 2026-05-11): ConfirmationModalProps, NotificationBellProps, UploadProgressProps, NotificationItemProps; tipos de layout (ContainerProps, SectionProps, GridVariant, etc.); ToolRawStatus, ToolVisualStatus, ToolActionFlags, BarcodeMatchAsset.

## Riesgo activo
- Los re-exportadores en `src/components/`, `src/services/`, `src/context/`, `src/layouts/` son la interfaz pública. Borrarlos sin migrar imports rompe todo.
- `src/utils/` NO tiene espejo en shell (barcode, currency, quantity, rutUtils, toolPresentation permanecen solo en src/).
