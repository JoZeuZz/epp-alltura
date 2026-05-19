# Checklist Smoke MVP Operativo (Equipos y Herramientas)

## Alcance
- Validar flujo operativo de equipos y herramientas en desktop y móvil para roles autenticables `admin` y `supervisor`.
- Validar navegación, acciones críticas y trazabilidad mínima visible en UI/API.

## Precondiciones
- Usuario `admin` y usuario `supervisor` habilitados con credenciales válidas.
- Catálogos mínimos existentes: ubicaciones, artículos, trabajadores, proveedor.
- Base con al menos un artículo `serial` para flujos de entrega/devolución y stock operativo disponible.
- Backend y frontend corriendo en same-origin (`/api`).

## Checklist rápido P0.1 (baseline reproducible)
- Setup local:
	- `npm run install:all`
	- `docker compose -f docker-compose.dev.yml up -d`
	- `npm run dev`
- Puertos esperados:
	- Frontend: `http://localhost:3000`
	- Backend: `http://localhost:5000`
	- PostgreSQL: `localhost:55432`
	- Redis: `localhost:56379`
- Variables mínimas backend/.env (local):
	- `NODE_ENV=development`
	- `PORT=5000`
	- `DB_HOST=localhost`
	- `DB_PORT=55432`
	- `DB_USER=postgres`
	- `DB_PASSWORD=postgres`
	- `DB_NAME=herramientas_epp`
	- `REDIS_URL=redis://localhost:56379`
	- `JWT_SECRET=<min_32_chars>`
	- `JWT_REFRESH_SECRET=<min_32_chars>`
	- `CLIENT_URL=http://localhost:3000`
	- `SERVICE_URL_FRONTEND=http://localhost:3000`
	- `SERVICE_FQDN_FRONTEND=localhost:3000`

### Flujo mínimo obligatorio
1. Login exitoso y redirección por rol.
2. Crear entrega serializada -> firmar en dispositivo -> confirmar.
3. Si aplica, generar QR/link público y completar firma en `/firma/:token`.
4. Crear devolución serializada -> firmar recepción -> confirmar.
5. Revisar trazabilidad básica en movimientos y estado de devolución por ítem.

### Seed de desarrollo (primer arranque)
- Si levantas base nueva con `docker compose -f docker-compose.dev.yml up -d`, se aplica `db/init/002-dev-seed.sql`.
- Este seed deja datos funcionales para QA manual en entorno dev:
	- 5 taladros serializados (`TAL-001` .. `TAL-005`).
	- 3 arneses serializados (`ARN-001` .. `ARN-003`).
	- Ítem de tracking por lote (`Guante de cabritilla`) para cobertura de stock/egresos operativos.
	- Entregas serializadas confirmadas de ejemplo (sin traslado como flujo principal).
	- Devoluciones serializadas confirmadas de ejemplo y egreso operativo de muestra.
	- Ubicación transitoria sólo para compatibilidad legacy y trazabilidad histórica.

### Credenciales demo
- Password para todos: `Dev12345!`
- `admin.dev@alltura.local` (rol `admin`)
- `supervisor.dev@alltura.local` (rol `supervisor`)
- `operaciones.dev@alltura.local` (rol `supervisor`)
- `coordinador.dev@alltura.local` (rol `supervisor`)
- `auditor.dev@alltura.local` (rol `supervisor`)

Los trabajadores de ejemplo son personas de dominio para asignación y custodia; no tienen credenciales de login.

## Smoke Admin
### Desktop
1. Iniciar sesión con rol `admin`.
2. Abrir `admin/dashboard`.
3. Validar carga de tarjetas KPI (activos, entregas, devoluciones, firmas).
4. Abrir sección de trazabilidad y auditar movimientos recientes.
5. Abrir sección de auditoría y confirmar listado con datos de usuario/acción.

### Móvil
1. Repetir navegación desde menú móvil.
2. Confirmar legibilidad de KPIs y tablas con scroll horizontal/vertical usable.

### Resultado esperado
- Dashboard carga sin errores JS.
- Listados muestran datos o empty-state claro.
- No hay redirecciones erróneas a módulos legacy.

## Smoke Supervisor Operativo
### Desktop
1. Iniciar sesión con rol `supervisor`.
2. Abrir `supervisor/dashboard`.
3. Crear entrega borrador con al menos un activo `serial`.
4. Generar token de firma QR/link.
5. Firmar en dispositivo compartido con firma manuscrita.
6. Confirmar entrega.
7. Crear devolución borrador serializada con disposición `devuelto` y/o (`mantencion`, `baja`, `perdido`).
8. Confirmar devolución.
9. Registrar compra con ingreso de inventario operativo.

### Móvil
1. Repetir creación de entrega simple + firma manuscrita.
2. Confirmar que el canvas de firma funciona con touch.

### Resultado esperado
- Entrega no confirma sin firma.
- Tras confirmar entrega se registran custodia y movimientos.
- Tras confirmar devolución se cierra custodia y se actualiza estado/disposición.
- Ingreso de compra impacta stock/movimientos según tracking mode.

## Compatibilidad legacy (explícita)
- Flujos o términos legacy (`consumo`, `retorno_mode`, `traslado`, `en_transito`, `recibirTraslado`) no son flujo principal operativo.
- Se mantienen sólo para compatibilidad acotada, validaciones negativas y trazabilidad histórica.

## Firma pública por token
### Desktop y móvil
1. Generar token de firma para una entrega/devolución desde flujo admin o supervisor.
2. Abrir `/firma/:token` sin sesión autenticada.
3. Completar firma manuscrita con mouse o touch.

### Resultado esperado
- Firma manuscrita obligatoria y persistente.
- Token válido se consume una vez.
- Segundo uso del mismo token retorna error de uso único.

## Verificaciones transversales
1. Respuestas API siguen envelope `{ success, message, data, errors }`.
2. No se exponen secretos en frontend ni en requests.
3. Logs no contienen password/tokens en claro.
4. Navegación de notificaciones apunta a `/notifications`.

## Smoke tests automatizados (Playwright)

Los tests en `frontend/tests/smoke/operacion.roles.smoke.spec.ts` cubren de forma automática los flujos principales usando mocks de API (no requieren backend real).

Ejecutar:
```bash
cd frontend && npx playwright test --config=playwright.config.ts --project=desktop-chromium
```

Cobertura actual (9 tests passing):
- `admin dashboard smoke` — KPIs y movimientos de stock recientes
- `admin herramientas page smoke` — heading y datos de tabla herramientas
- `supervisor dashboard smoke` — estadísticas de activos por rol supervisor
- `supervisor trazabilidad smoke` — sección movimientos recientes de activos
- `ui visible mantiene naming operativo` — naming operativo correcto
- `supervisor login flow smoke` — login y redirección a dashboard supervisor
- `admin herramientas page has activo ACT-001 smoke` — activos en tabla
- `admin trazabilidad page smoke` — acceso a trazabilidad admin
- `supervisor trazabilidad has movimientos smoke` — tabla trazabilidad supervisor

Los tests `operacion.roles.real.e2e.spec.ts` requieren backend real corriendo y se saltean en CI sin backend.

## Evidencia recomendada
- Capturas por rol (desktop y móvil).
- Export de logs de API relevantes.
- IDs de entrega/devolución/token usados para trazabilidad.

## Troubleshooting Docker/local
- Estado contenedores:
	- `docker compose -f docker-compose.dev.yml ps`
- Logs PostgreSQL:
	- `docker compose -f docker-compose.dev.yml logs -f postgres_db`
- Logs Redis:
	- `docker compose -f docker-compose.dev.yml logs -f redis`
- Reinicio limpio de infraestructura:
	- `docker compose -f docker-compose.dev.yml down -v`
	- `docker compose -f docker-compose.dev.yml up -d`
- Healthcheck backend:
	- `curl -fsS http://localhost:5000/health/ready`
- Ver puertos en uso:
	- `ss -ltnp | rg '3000|5000|55432|56379'`
