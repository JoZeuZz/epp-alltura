# Auditoría de calidad de código — actualizada 2026-04-29

## BACKEND

### 🔴 Código completamente muerto
- `backend/src/lib/responseMessages.js` — NUNCA importado por ningún archivo. Define SuccessMessages/ErrorMessages pero todos los controladores usan strings hardcodeados. Eliminar.

### 🔴 Duplicación de validaciones de artículos
- `backend/src/models/articulo.js` (líneas 6-47): define `SUBCLASIFICACIONES_POR_GRUPO`, `normalizeGrupoPrincipal`, `normalizeSubclasificacion`, `ESPECIALIDADES_VALIDAS`, `normalizeEspecialidades`.
- `backend/src/routes/articulos.routes.js` (líneas 20-84): redefine las mismas constantes y funciones para Joi. Si cambia una lista de valores válidos, hay que actualizarla en dos lugares.

### 🟡 Métodos sin usar en models/usuario.js
- `create()` (línea ~21) — nunca llamado; auth.service.js usa SQL directo.
- `findAll()` (línea ~88) — nunca llamado.
- `update()` (línea ~141) — nunca llamado.

### 🟡 Middleware sin usar en middleware/roles.js
Exportados pero sin ningún importador en rutas:
- `requireRole()`, `isSupervisor`, `isAdminOrSupervisor`, `checkOwnership()`, `verifySupervisorOwnership()`
- `checkProjectAccess`, `checkAssetAccess` — stubs noop legacy (líneas 73-75)

### 🟡 Swagger muy desactualizado
Endpoints SIN documentar en `backend/src/config/swagger.js`:
- `POST /api/auth/register`, `POST /api/auth/logout`, `POST /api/auth/change-password`
- `GET /api/inventario/activos`, `/activos-paged`, `/activos-disponibles`, `/activos/:id/perfil`, `/activos/:id/estado`, `/activos/:id/reubicar`
- Todo `/api/image-proxy`

---

## FRONTEND

### 🔴 Componentes sin usar
- `frontend/src/components/PasswordStrength.tsx` — ningún archivo lo importa, no está en shell.
- `frontend/src/components/icons/ImageUploadIcon.tsx` — ningún archivo lo importa.

### 🟡 Hook sin usar
- `frontend/src/hooks/useConfirmation.tsx` — exportado en hooks/index.ts pero sin ningún consumidor.

### 🟡 Componente de dashboard sin usar
- `frontend/src/components/dashboard/ProjectDashboard.tsx` — definido pero ninguna página lo renderiza.

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

### 🟡 documentos.service.js incompleto
- Solo implementa `createAnexo()`.
- No hay métodos de lectura (list, getById) ni rutas públicas de consulta.
- `documento_compra` se crea implícitamente al crear compra (compras.service.js) pero no es consultable.

### 🟢 Diseño correcto (no bugs)
- Filtrado de ubicaciones por tipo (bodega/proyecto) es client-side — funciona, podría optimizarse con `?tipo=` en backend.
- `auditoria` es write-only por diseño — no hay endpoint público de lectura, es intencional.
- `push_subscriptions` + notification.service.js — cobertura completa.
