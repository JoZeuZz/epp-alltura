# Implementacion roles autenticables admin/supervisor (2026-04-28)

Repositorio: `/home/proyectos/herramientas`, rama `main`, epp-alltura.

Cambio aplicado:
- Roles autenticables reducidos a `admin` y `supervisor` en utilidades backend (`roleUtils`), middleware auth/RBAC, validaciones Joi, users/auth services, scripts y check DB.
- `supervisor` hereda permisos operativos antes asignados al rol login `bodega`; rutas protegidas operativas quedaron con `['admin','supervisor']`.
- Eliminadas rutas autenticadas de trabajador: `/api/firmas/pendientes/me` y `/api/devoluciones/mis-custodias/activos` (404 por ausencia de ruta). Firma publica por token `/firma/:token` y `/api/firmas/tokens/:token*` se mantiene.
- `POST/PUT /api/users` y `POST /api/auth/register` solo aceptan `admin`/`supervisor`; no crean ni activan trabajador asociado.
- `trabajador` permanece como entidad de dominio, pero se elimino el vinculo de login: `trabajador.usuario_id`, indice legacy, joins hacia `usuario`, campos API/UI `usuario_id` y `email_login`, y `findByUsuarioId`.
- SQL init/seed: tabla `rol` solo `admin`/`supervisor`; `001-init.sql` elimina residuos legacy si se re-ejecuta contra una DB vieja; seed dev con 5 usuarios autenticables admin/supervisor y 8 trabajadores sin cuenta de login; `ubicacion.tipo = 'bodega'` preservado.
- `docker-compose.dev.yml` monta `./db/init` en `/docker-entrypoint-initdb.d` para que `down -v && up -d` use los SQL del checkout actual sin depender del cache de imagen.
- Frontend: tipos `UserRole`/`User.role` solo `admin | supervisor`; router sin `/worker/*` ni `/bodega/*`; operacion heredada queda bajo `/supervisor/operaciones`; `WorkerDashboard` eliminado y `WarehouseDashboard` movido/adaptado a `SupervisorOperationsPage`.
- Guardrail `scripts/check-legacy.js` bloquea rutas `/worker/`, `/bodega/` y patrones de rol auth legacy (`bodega`, `worker`, `trabajador`, `client`) sin bloquear bodegas fisicas ni trabajadores de dominio.
- Docs vivas actualizadas: README, backend README, smoke checklist y matriz legacy.

Validaciones finales ejecutadas:
- `npm run lint:ci`: OK. Incluye lint backend/frontend, `check:backend-validation` y `check:legacy`.
- `npm run test:backend`: OK. 12 suites activas, 58 tests; 3 suites/17 tests skip existentes.
- `npm run test:frontend`: OK. 16 archivos, 71 tests.
- `npm run build --prefix frontend`: OK. Aviso no bloqueante: Browserslist/caniuse-lite desactualizado.
- `docker compose -f docker-compose.dev.yml down -v`: OK, contenedores/volumenes dev eliminados.
- `docker compose -f docker-compose.dev.yml up -d`: OK, PostgreSQL/Redis dev recreados healthy.
- `npm run test:integration-db`: OK. 3 suites, 17 tests contra DB reconstruida.
- Verificacion SQL posterior: `trabajador.usuario_id` no existe, `rol` contiene solo `admin`/`supervisor`, y las ubicaciones fisicas tipo `bodega` se conservan.

Notas:
- Quedan textos `trabajador` como dominio y `bodega` como ubicacion fisica/logistica por requerimiento.
- Tests conservan actores legacy `worker/trabajador/client/bodega` solo en casos negativos de rechazo/compatibilidad.