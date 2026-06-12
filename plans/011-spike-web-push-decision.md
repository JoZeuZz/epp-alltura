# Plan 011: Spike — Web Push: cablear a eventos de negocio o eliminar la infraestructura dormida

> **Executor instructions**: Este es un plan de SPIKE/DECISIÓN: el entregable
> es un documento, NO código de producción. Follow this plan step by step.
> If anything in the "STOP conditions" section occurs, stop and report.
> When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat a87f7a6..HEAD -- backend/src/lib/pushNotifications.js backend/src/services/notification.service.js backend/src/models/pushSubscription.js`
> Si alguien ya cableó o eliminó push desde `a87f7a6`, este spike puede estar
> obsoleto — verifica y reporta.

## Status

- **Priority**: P3
- **Effort**: M (el spike; la implementación posterior se estima en el entregable)
- **Risk**: LOW (no toca producción)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `a87f7a6`, 2026-06-11

## Why this matters

El backend tiene infraestructura Web Push completa pero DORMIDA: `web-push` instalado, VAPID configurado en env, `lib/pushNotifications.js` (77 líneas), modelo `pushSubscription.js`, `saveSubscription()` y `sendTestNotification()` en el servicio de notificaciones. Ningún flujo de producción la invoca — todos los eventos usan solo notificaciones in-app (`createBatchInAppNotifications`). El frontend NO tiene service worker ni código de suscripción (`grep pushManager|serviceWorker|VAPID frontend/src frontend/public` → 0 matches). Para un producto de operaciones en terreno (entregas firmadas por QR, devoluciones, custodia vencida), push es el canal natural de alerta en tiempo real — pero infraestructura a medio construir es deuda: o se termina o se elimina. Este spike produce la decisión documentada con costos reales.

## Current state

- `backend/src/lib/pushNotifications.js` — wrapper de `web-push` con VAPID (77 líneas).
- `backend/src/services/notification.service.js` (200 líneas) — métodos: `saveSubscription` (:8), `sendTestNotification` (:21, único uso de push, solo test), `canSendNotifications` (:36), `createBatchInAppNotifications` (:44), y CRUD de notificaciones in-app (:62-180).
- `backend/src/models/pushSubscription.js` — persistencia de suscripciones.
- `backend/src/routes/notification.routes.js` — rutas (incluye guardar suscripción).
- Frontend: `NotificationBell`/`NotificationContext` (in-app, de `@jozeuzz/alltura-ui`), CERO service worker / `pushManager`.
- Productores de notificaciones in-app hoy: `custodyCheck.service.js`, `proyectos.service.js` (vía `createBatchInAppNotifications`).
- Env: `VAPID_*` documentadas en `backend/.env.example` (y `VITE_VAPID_PUBLIC_KEY` referenciada en `.env.example` root).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Buscar usos | `grep -rn "sendTestNotification\|saveSubscription" backend/src --include="*.js"` | inventario de call sites |
| Tests (solo lectura de estado) | `npm test --prefix backend` | all pass (baseline informativo) |

## Scope

**In scope** (únicos archivos a crear/modificar):
- `plans/011-spike-web-push-decision.md` (este archivo: completar la sección "Entregable" al final)
- Opcional: `docs/` NO — está gitignorado; el entregable vive en este mismo plan.

**Out of scope**:
- TODO código de producción. Cero cambios en backend/ o frontend/. Prototipos descartables solo fuera del repo o en branch que se borra.

## Git workflow

- Branch: `advisor/011-spike-web-push` (solo si modificas este plan; commit ej.: `docs(plans): web push decision spike findings`)
- NO `Co-Authored-By`. No push ni PR salvo instrucción del operador.

## Steps

### Step 1: Inventario exacto de lo que existe

Leer los 4 archivos backend citados. Documentar: qué hace cada método, qué shape tiene la suscripción persistida, si `sendTestNotification` funciona end-to-end (¿hay ruta que lo expone? ¿quién puede llamarla?), y qué falta exactamente en backend para producción (¿manejo de suscripciones expiradas/410? ¿batching?).

### Step 2: Dimensionar el lado frontend

Lo que falta del lado cliente para push real: service worker (registro + handler `push`), flujo de permiso de notificaciones, suscripción con `VITE_VAPID_PUBLIC_KEY`, UI de opt-in/opt-out. Estimar en días, considerando que la app es Vite + React 19 (sin PWA plugin hoy — verifica `frontend/vite.config.ts`).

### Step 3: Identificar los 3-5 eventos candidatos

Del código real (no especular): entrega firmada (SSE ya publica `delivery-signed` — `backend/src/lib/signatureEvents.js`), devolución confirmada, alerta de custodia vencida (`custodyCheck.service.js` ya genera in-app), asignación a proyecto (`proyectos.service.js`). Para cada uno: quién lo recibiría (rol) y por qué push mejora sobre in-app.

### Step 4: Escribir la recomendación

Completar la sección "Entregable" de este archivo con:
1. **Opción A — Cablear**: alcance exacto (archivos backend a tocar, componentes frontend a crear), estimación en días, riesgos (permisos de navegador en terreno, iOS Safari limitaciones), y qué evento implementar primero como vertical slice.
2. **Opción B — Eliminar**: archivos a borrar (lib, model, rutas, deps `web-push`, vars VAPID), migración DB si la tabla de suscripciones tiene datos (¡verificar! — si hay suscripciones reales en prod, eso cambia la decisión), estimación (~2 h).
3. **Recomendación argumentada** en ≤ 5 líneas, con la evidencia del Step 3.

**Verify**: la sección "Entregable" de este archivo está completa; las dos opciones tienen estimación y lista de archivos.

## Test plan

N/A — spike sin código de producción.

## Done criteria

- [ ] Sección "Entregable" completada con opciones A y B + recomendación
- [ ] Cada evento candidato cita el archivo/servicio que hoy genera el equivalente in-app
- [ ] `git status` muestra solo este archivo de plan modificado
- [ ] Fila de status actualizada en `plans/README.md`

## STOP conditions

- La tabla de suscripciones push tiene datos en producción y no puedes verificarlo de forma segura → anótalo como incógnita crítica en el entregable, no asumas.
- Descubres que push YA se usa en algún flujo (el grep de este plan quedó obsoleto) → STOP, el spike parte de premisa falsa.

## Maintenance notes

- La decisión la toma el maintainer con este documento; el spike NO implementa.
- Si la decisión es "cablear", el primer vertical slice recomendado se convierte en plan nuevo (013+) con este spike como insumo.

---

## Entregable

> Completado 2026-06-12. Drift check: 0 cambios en los 3 archivos push desde a87f7a6.

### Step 1 — Inventario exacto

**`backend/src/lib/pushNotifications.js`** (77 líneas):
- VAPID setup al módulo load (warn si claves ausentes/inválidas, no lanza).
- `saveSubscription(userId, subscription)` → delega a `PushSubscriptionModel.upsert`.
- `sendToUser(userId, payload)` → `webpush.sendNotification`; en 404/410 auto-elimina la suscripción; relanza el error para el caller.
- `removeSubscription(userId)` → DELETE silencioso.
- **Sin batching**: solo envía a un usuario a la vez.

**`backend/src/services/notification.service.js`** (200 líneas):
- `saveSubscription` / `sendTestNotification` / `canSendNotifications` → métodos push.
- `canSendNotifications` solo permite rol `'admin'` (no supervisor).
- El resto (líneas 44-200) es CRUD in-app: `createBatchInAppNotifications`, get, mark-read, delete, stats, clean.
- **`sendTestNotification` es el único invocador de push** — solo ruta de test.

**`backend/src/models/pushSubscription.js`**:
- Tabla `push_subscriptions` (UNIQUE `user_id` → un dispositivo por usuario), JSONB `subscription_data`.
- Métodos: `upsert`, `findByUserId`, `removeByUserId`.
- **Sin multi-device**: si el usuario rota dispositivo, la suscripción vieja se sobreescribe.

**`backend/src/routes/notification.routes.js`**:
- `POST /subscribe` → cualquier usuario autenticado puede guardar suscripción. Validación Joi completa (`pushSubscription` schema en `lib/validation`).
- `POST /test/:userId` → solo admin.
- Rutas push separadas conceptualmente de in-app (misma base `/notifications`).

**Qué falta en backend para producción:**
1. Wiring: ningún evento de negocio llama `pushService.sendToUser` / `sendTestNotification`.
2. Batching: `custodyCheck.service.js` notifica a N admins/supervisores → hay que iterar.
3. Multi-device: limitación de diseño (UNIQUE user_id).
4. `canSendNotifications` restringe a 'admin' — no incluye supervisor.

**Flujo end-to-end de `sendTestNotification`**: `POST /notifications/test/:userId` → admin-only → `NotificationService.sendTestNotification` → `pushService.sendToUser` → `webpush.sendNotification`. Funciona si VAPID keys configuradas Y el usuario tiene suscripción guardada.

---

### Step 2 — Lado frontend (lo que falta)

**CERO infraestructura push en frontend:**
- No hay service worker (`frontend/public/sw.js` no existe).
- No hay uso de `navigator.serviceWorker`, `PushManager`, `Notification.requestPermission`.
- No hay opt-in UI ni unsubscribe.
- `VITE_VAPID_PUBLIC_KEY` referenciada en `.env.example` pero nunca leída en código frontend.
- No hay `vite-plugin-pwa` ni Workbox (`frontend/package.json` vacío de PWA deps).

**Para push funcional en frontend se necesita:**

| Componente | Descripción | Días estimados |
|---|---|---|
| `public/sw.js` | Service worker: `push` event handler, `notificationclick`, fetch cache básico | 1.5 d |
| Registro SW | Lógica en `App.tsx` o contexto para `navigator.serviceWorker.register` | 0.5 d |
| Permiso + suscripción | `Notification.requestPermission()`, `registration.pushManager.subscribe({ userVisibleOnly, applicationServerKey })`, POST `/api/notifications/subscribe` | 1 d |
| Opt-in UI | Botón/banner en perfil o sidebar; manejo denied/granted/default | 0.5 d |
| iOS/Android testing | iOS Safari 16.4+ soporta push solo desde PWA instalada (add to home screen) | 0.5 d spike |
| **Total frontend** | | **~4 días** |

**Riesgos frontend:**
- iOS Safari: push solo funciona si la PWA está instalada en home screen → supervisores en terreno con iPhone necesitarían ese paso extra.
- Browsers sin SW support: nulo en entorno productivo (todos los navegadores modernos lo soportan).
- Sin PWA manifest completo, la "instalación" iOS es manual.

---

### Step 3 — Eventos candidatos (del código real)

| Evento | Archivo productor actual | In-app hoy | Push receptor natural | Por qué push mejora |
|---|---|---|---|---|
| **Custodia vencida / próxima** | `custodyCheck.service.js:90` → `createBatchInAppNotifications` a admin+supervisor | ✅ | Admins + supervisores | Bell in-app solo visible si app abierta; vencimientos urgentes se pierden fuera de horario |
| **Proyecto finalizado con artículos pendientes** | `proyectos.service.js:77` → `createBatchInAppNotifications` a admin+supervisor | ✅ | Admins + supervisores | Alerta de reconciliación — no requiere inmediatez, push es secundario |
| **Entrega firmada** | `signatureEvents.js:74` → SSE `delivery-signed` (solo al tab abierto) | ❌ | Usuario que creó la entrega / admin | SSE solo llega si el tab está abierto; push garantiza entrega aunque la app esté cerrada |
| **Devolución confirmada** | `devoluciones.service.js:confirm()` | ❌ | Admin + supervisor del proyecto | Misma razón; confirmación asíncrona no llegará in-app hoy |
| **Asignación a proyecto** | no existe notificación hoy | ❌ | (no aplica — trabajador no tiene login) | Push no aplicable aquí |

**Evento prioritario para vertical slice:** `custodia_vencida` — ya tiene lógica de destinatarios (`admin`+`supervisor`), ya tiene mensaje formateado, y tiene la urgencia más alta operativamente.

---

### Step 4 — Opciones

#### Opción A — Cablear Web Push

**Backend (estimado 2 días):**
- `custodyCheck.service.js`: tras `createBatchInAppNotifications`, iterar `userIds` con `pushService.sendToUser` (fail-safe, no lanzar).
- `devoluciones.service.js`: tras `confirm`, push al admin+supervisor.
- `notification.service.js`: agregar `sendBatchPush(userIds, payload)` con loop + catch-per-user.
- Corregir `canSendNotifications` para incluir supervisor.
- Tests: mock `pushService.sendToUser` en los servicios afectados.

**Frontend (estimado 4 días):**
- `public/sw.js`: handler `push` (muestra notificación) + `notificationclick` (abre la URL del link).
- Registro en `main.tsx` o `AuthContext` tras login.
- Hook `usePushSubscription`: requestPermission → subscribe → POST `/api/notifications/subscribe`.
- Banner opt-in en sidebar o perfil (respetar `denied`).
- Leer `VITE_VAPID_PUBLIC_KEY` desde `import.meta.env`.

**Total estimado:** 6 días (1 backend senior + 0.5 frontend). Primer vertical slice solo con `custodia_vencida` serían ~4 días.

**Riesgos:**
- iOS Safari: push solo en PWA instalada — si los supervisores usan iPhone sin instalar la app, no reciben nada.
- `web-push` envía directamente al push service del browser (FCM/APNS) sin queue — si el servidor está caído durante el envío, la notificación se pierde (no hay retry).
- Un suscriptor por usuario: si el supervisor tiene teléfono + laptop, solo el último dispositivo suscrito recibe.

**Archivos a tocar:**
```
backend/src/services/notification.service.js   (sendBatchPush, canSendNotifications)
backend/src/services/custodyCheck.service.js   (wiring)
backend/src/services/devoluciones.service.js   (wiring)
frontend/public/sw.js                          (CREAR)
frontend/src/hooks/usePushSubscription.ts      (CREAR)
frontend/src/components/layout/Sidebar.tsx o similar  (opt-in UI)
frontend/src/main.tsx                          (SW register)
```

---

#### Opción B — Eliminar infraestructura push

**Backend (~2 horas):**
- Eliminar: `backend/src/lib/pushNotifications.js`, `backend/src/models/pushSubscription.js`.
- En `notification.service.js`: eliminar métodos `saveSubscription`, `sendTestNotification`, `canSendNotifications` + import de `pushService`.
- En `notification.routes.js`: eliminar `POST /subscribe` y `POST /test/:userId`.
- En `notification.controller.js`: eliminar métodos `subscribe`, `sendTest`.
- En `lib/validation/index.js`: eliminar schema `pushSubscription`.
- En `backend/package.json`: `npm uninstall web-push`.
- En `backend/.env.example` y `backend/src/config/index.js`: eliminar vars VAPID.
- DB: `DROP TABLE push_subscriptions` (migration).

**⚠️ Incógnita crítica:** no es posible verificar desde este entorno si la tabla `push_subscriptions` tiene datos en producción. Si hay suscripciones reales, la eliminación requiere aviso a los usuarios. **Verificar antes de ejecutar:** `SELECT COUNT(*) FROM push_subscriptions;` en prod.

**Archivos a borrar/modificar:**
```
DELETE  backend/src/lib/pushNotifications.js
DELETE  backend/src/models/pushSubscription.js
MODIFY  backend/src/services/notification.service.js  (-3 métodos, -1 import)
MODIFY  backend/src/routes/notification.routes.js      (-2 rutas)
MODIFY  backend/src/controllers/notification.controller.js  (-2 handlers)
MODIFY  backend/src/lib/validation/index.js            (-1 schema)
MODIFY  backend/src/config/index.js                    (-VAPID section)
MODIFY  backend/package.json                           (uninstall web-push)
MODIFY  backend/.env.example                           (-VAPID vars)
CREATE  db/migrations/XXX-drop-push-subscriptions.sql
```

**Total:** ~2 horas. Sin riesgos de comportamiento — los métodos push no están en ningún flujo de producción.

---

### Recomendación

**Eliminar (Opción B)**, salvo que el equipo confirme un caso de uso específico con usuarios en iOS.

**Argumento:** La `NotificationBell` in-app ya cubre a admin y supervisor cuando la app está abierta, que es el escenario habitual de uso de escritorio. El caso donde push agrega valor real es supervisores en campo con móvil que cierran la app — si ese escenario es frecuente y los dispositivos son Android (donde no hay barrera de instalación), la inversión de ~6 días vale. Para iOS el ROI cae significativamente por el requisito de instalación como PWA.

**Próximo paso:** El maintainer debe responder: ¿los supervisores operan principalmente con móvil en campo con la app cerrada? Si sí → ejecutar Opción A (crear plan 013 con este spike como insumo, primer slice: `custodia_vencida`). Si no → ejecutar Opción B.

**Precondición para cualquier opción:** verificar `SELECT COUNT(*) FROM push_subscriptions` en producción antes de decidir.
