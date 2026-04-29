# Sistema de Notificaciones y CustodyCheck (2026-04-28)

## Web Push
- Backend: `notification.service.js` + `notification.routes.js`
- DB: tabla `notifications` (persistencia) + `push_subscriptions` (suscripciones Web Push)
- Acceso: solo `admin` (según isAdmin en rutas de notificaciones)
- El frontend tiene `NotificationBell`, `NotificationsPage`, `useNotifications` hook

## CustodyCheckService
- `backend/src/services/custodyCheck.service.js`
- Cron: se ejecuta diariamente a las 08:00 (definido en `index.js` con `cron.schedule('0 8 * * *')`)
- Otro cron: limpieza semanal los domingos a las 03:00 (`cron.schedule('0 3 * * 0')`)
- Métodos: `runDailyCheck()`, `getCustodiasAlerta()`, `getAdminSupervisorIds()`
- Lógica: detecta activos con custodia activa sin devolución y notifica a admin/supervisor

## Documentos
- `documentos.service.js` + `documentos.routes.js`
- Tabla: `documento`, `documento_compra`, `documento_referencia`
- Soporta: anexos con subida de archivos (`documentUpload`, `validateDocumentMagic`)
- Relaciona documentos con compras y referencias cruzadas entre entidades
