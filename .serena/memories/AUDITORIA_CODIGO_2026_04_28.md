# Auditoría de calidad de código — actualizada 2026-04-29

## BACKEND

### ✅ Resueltos (eliminados/corregidos)
- ~~`backend/src/lib/responseMessages.js`~~ — ELIMINADO (era código muerto).
- ~~Duplicación `SUBCLASIFICACIONES_POR_GRUPO`~~ — RESUELTO: `backend/src/lib/articuloValidation.js` es la fuente canónica; articulo.js y articulos.routes.js importan de ahí.
- ~~`models/usuario.js` métodos muertos (create, findAll, update)~~ — ELIMINADOS; solo quedan `updateLastLogin` y `updatePasswordHash`.
- ~~`middleware/roles.js` exports muertos~~ — RESUELTO: ahora exporta solo `isAdmin` y `checkRole`.

### 🟡 Swagger muy desactualizado
Endpoints SIN documentar en `backend/src/config/swagger.js`:
- `POST /api/auth/register`, `POST /api/auth/logout`, `POST /api/auth/change-password`
- `GET /api/inventario/activos`, `/activos-paged`, `/activos-disponibles`, `/activos/:id/perfil`, `/activos/:id/estado`, `/activos/:id/reubicar`
- Todo `/api/image-proxy`

---

## FRONTEND

### ✅ Resueltos (eliminados)
- ~~`PasswordStrength.tsx`~~ — ELIMINADO.
- ~~`ImageUploadIcon.tsx`~~ — ELIMINADO.
- ~~`useConfirmation.tsx`~~ — ELIMINADO.
- ~~`ProjectDashboard.tsx`~~ — ELIMINADO.

### 🟡 Service workers desactivados silenciosamente
- En `frontend/src/App.tsx`: `notificationService.initialize()` está comentado con "TEMPORALMENTE DESACTIVADO".
- Los SWs en `public/sw.js` y `public/sw-notifications.js` existen pero no se registran.
- En desarrollo: `notificationService.unregisterAll()` se ejecuta activamente.

### 🟡 Mismatches de tipos frontend vs DB/backend
- `Trabajador.trabajador_id` en api.d.ts — el backend retorna `id`, no `trabajador_id`.
- `Articulo.requiere_talla` en api.d.ts — campo que NO existe en la DB.
- `Ubicacion.descripcion` en api.d.ts — campo que NO existe en la DB.
- `Entrega` tiene campos `created_at` Y `creado_en` en el tipo — el backend solo devuelve `creado_en`.

---

## DB / CONSISTENCIA

### 🔴 Tabla `inspeccion_activo` huérfana
- Existe en DB con estructura completa (tipo: inspeccion|calibracion, responsable, resultado, etc.).
- NO hay modelo, servicio ni rutas backend para ella.
- Único uso: `users.service.js` cuenta inspecciones para estadísticas de perfil.
- Decisión pendiente: implementar CRUD o eliminar tabla.

### 🔴 Tabla `lote` ghost
- Existe en DB con campos: codigo_lote, fecha_fabricacion, fecha_vencimiento, proveedor_id.
- `compras.service.js` siempre inserta `lote_id = NULL`.
- `inventario.service.js` filtra con `WHERE s.lote_id IS NULL`.
- NO hay modelo, servicio ni rutas para gestionar lotes.
- Decisión pendiente: implementar sistema de lotes o eliminar tabla.

### 🟡 Columna `articulo.categoria` nunca leída
- Existe en DB (nullable, legacy).
- Backend no la escribe (corregido 2026-04-28) ni la lee en ningún SELECT.
- Frontend no la espera en tipos.
- Candidata a DROP COLUMN en próxima migración.

### 🟡 Columnas sin uso aparente en DB
- `persona.foto_url` — columna en DB, nunca populada ni consultada por ningún endpoint.
- `trabajador.fecha_salida` — columna en DB, no usada en lógica operativa ni en ningún endpoint.

### ✅ documentos.service.js — ELIMINADO
- El servicio fue eliminado completamente (código muerto). `documento_compra` sigue creándose implícitamente en `compras.service.js` mediante SQL directo.

### ✅ Resueltos en sesión 2026-05-11 (auditoría dead code)
**Backend:**
- `auth.service.js`: eliminados `emailExists`, `getFailedLoginAttempts`, `isAccountLocked`.
- `backend/src/models/stock.js`: ELIMINADO (nunca importado).
- `backend/src/models/activo.js`: ELIMINADO (nunca importado; inventario.service.js usa SQL directo).
- `trabajadores.service.js` modelo: eliminado `create()` (servicio usa SQL INSERT directo).
- `notification.js` modelo: eliminado `getById` (0 consumidores).
- `googleCloud.js`: eliminada `resolveImageUrl` (nunca llamada).
- `auditLogger.js`: eliminados 6 exports muertos (`logError`, `logAccess`, `logInfo`, `auditMiddleware`, `cleanOldLogs`, `getRecentLogs`).
- `logger.js`: eliminados 10 wrappers muertos (`logDbOperation`, `logAuth`, `logBusinessError`, etc.).
- `validation/index.js`: eliminado `PATTERNS` del export.
- `security.js`: eliminados 6 del export (solo internos a `createSecurityMiddleware`).
- `sanitization.js`: reducido a export único `sanitizeStrict`.
- `passwordPolicy.js`: eliminados `generateSecurePassword` y `passwordSchema`.
- `upload.js`: eliminados `MAX_IMAGE_BYTES` y `MAX_DOCUMENT_BYTES` del export.

**Frontend shell:**
- `shell/index.ts`: eliminados `ConfirmationModalProps`, `UploadProgressProps`, `NotificationBellProps`, `NotificationItemProps`, tipos de layout (ContainerProps, GridVariant, etc.).
- `hooks/index.ts`: eliminados `useBreakpointDown`, `useBreakpointUp`, `BREAKPOINTS`.
- `frontend/src/types/components.d.ts`: ELIMINADO (AssignFormData sin consumidores).
- `frontend/src/types/index.ts`: ELIMINADO (vacío).

**Frontend utils:**
- `barcode.ts`: BarcodeMatchAsset unexported (solo constrainte interna).
- `quantity.ts`: eliminado `formatQuantityInteger` + `integerQuantityFormatter`.
- `rutUtils.ts`: eliminado `formatRutDisplay`.
- `toolPresentation.ts`: ToolRawStatus, ToolVisualStatus, ToolActionFlags unexported.

**Shell services:**
- `apiService.ts`: unexported ArticuloEstado, EntregaTipo, EntregaEstadoDevolucion.
- `authRefresh.ts`: unexported TOKEN_STORAGE_KEYS.
- `httpClient.ts`: unexported AuthFailureMode, HttpRequestConfig.
- `context/*.shared.ts`: unexported AuthContextType, NotificationContextValue, TourContextValue.
- `tourSteps.ts`: unexported contextualStepsByRole.

### 🟢 Diseño correcto (no bugs)
- Filtrado de ubicaciones por tipo (bodega/proyecto) es client-side — funciona, podría optimizarse con `?tipo=` en backend.
- `auditoria` es write-only por diseño — no hay endpoint público de lectura, es intencional.
- `push_subscriptions` + notification.service.js — cobertura completa.
