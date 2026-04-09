# Implementacion 2026-04-09 - Contratos Shell y NotificationItem

## Objetivo
Canonizar contratos de componentes shell y separar semantica legacy de NotificationItem en una capa de compatibilidad externa, sin romper comportamiento.

## Cambios aplicados

### 1) Contratos de props exportados
- frontend/src/shell/components/ConfirmationModal.tsx
  - export interface ConfirmationModalProps
- frontend/src/shell/components/NotificationBell.tsx
  - export interface NotificationBellProps
- frontend/src/shell/components/UploadProgress.tsx
  - export interface UploadProgressProps
- frontend/src/shell/components/NotificationItem.tsx
  - export interface NotificationItemProps

### 2) Superficie publica alineada
- frontend/src/shell/index.ts
  - export type de ConfirmationModalProps, NotificationBellProps, UploadProgressProps, NotificationItemProps
- Wrappers legacy actualizados:
  - frontend/src/components/ConfirmationModal.tsx
  - frontend/src/components/NotificationBell.tsx
  - frontend/src/components/UploadProgress.tsx
  - frontend/src/components/NotificationItem.tsx

### 3) Mapper de compatibilidad fuera de shell
- Nuevo archivo: frontend/src/config/notificationItemCompat.ts
- Contiene:
  - mapeo iconos legacy
  - mapeo colores legacy
  - whitelist de rutas permitidas
  - resolver de link con fallback a /notifications
  - helper getNotificationItemPresentation

### 4) Refactor de NotificationItem
- frontend/src/shell/components/NotificationItem.tsx
  - elimina hardcodes internos de iconos/colores/rutas
  - consume getNotificationItemPresentation desde config externa
  - conserva API publica y flujo existente (mark read + navigate + delete)

### 5) Documentacion
- Nuevo: docs/standardization/shell-component-contracts.md
- Actualizado: docs/standardization/gap-report.md (nota de avance)

## Validaciones ejecutadas
- Lint frontend: OK
  - npm run lint --prefix frontend
- Tests notificaciones: OK (13/13)
  - npm run test --prefix frontend -- src/tests/notification-item.test.tsx src/tests/use-notifications.polling.test.tsx src/tests/notification-item-compat.test.ts
- Build frontend: OK
  - npm run build --prefix frontend
- Verificacion sourcemaps en dist: sin resultados
  - find frontend/dist -type f -name '*.map'

## Riesgo y compatibilidad
- Sin cambios de endpoints /api ni contratos backend.
- Sin cambios de rutas de aplicación.
- Sin nuevas dependencias.
- Fallback de seguridad de navegación conservado en NotificationItem.
