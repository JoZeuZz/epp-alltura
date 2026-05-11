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
- `documentos.service.js` y `documentos.routes.js` fueron ELIMINADOS (código muerto — no había endpoints activos).
- Las tablas `documento`, `documento_compra`, `documento_referencia` persisten en DB.
- `documento_compra` se crea implícitamente desde `compras.service.js` vía SQL directo al crear una compra.
