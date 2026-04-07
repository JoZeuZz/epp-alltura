## Contexto
- Iteración de estabilización: Fase 1 (calidad bloqueante) + Fase 2 quick-win documental/Swagger.
- Decisiones aplicadas: frontend local en 3000; refactor limpio RUT; Swagger parcial (no auditoría total).

## Cambios técnicos ejecutados
- Backend lint: fix `catch (_error)` -> `catch` en `backend/src/lib/signatureEvents.js`.
- Refactor RUT:
  - Nuevo helper compartido `backend/src/lib/rut.js` con `validateRutChileno` y `normalizeRut`.
  - `backend/src/lib/validation/index.js` reutiliza helper (elimina duplicación interna).
  - `backend/src/scripts/create-admin.js` migra import a `../lib/rut`.
  - `backend/src/services/trabajadores.service.js` migra import a `../lib/rut`.
  - `backend/src/services/users.service.js` reutiliza `normalizeRut` del helper (fallback TMP mantiene contrato).
- Test backend corregido:
  - `backend/src/tests/services/devoluciones.service.test.js` ajusta mock (`recibido_por_usuario_id`) y nombre del caso (`pendiente_firma`).
- Docs/contratos quick-win:
  - `README.md`, `backend/README.md`, `frontend/README.md` alineados a frontend local 3000.
  - `frontend/README.md`: Vite 7.
  - `README.md`: se documenta explícitamente `/firma/:token` + `/api/firmas/tokens/:token`.
  - `backend/src/config/swagger.js`: se agregan `GET /api/firmas/events/deliveries` y `GET /api/firmas/pendientes/me`.
- Calidad frontend adicional detectada por CI:
  - `frontend/src/hooks/useDeliverySignatureEvents.ts`: `catch (_error)` -> `catch`.
  - `frontend/src/pages/bodega/WarehouseDashboard.tsx`: `catch (_error)` -> `catch`.

## Validaciones ejecutadas
- `npm run lint --prefix backend` ✅
- `npm run check:backend-validation` ✅
- `npm test --prefix backend -- src/tests/services/devoluciones.service.test.js` ✅
- `npm test --prefix backend` ✅
- `npm run lint:ci` ✅
- `npm test --prefix frontend` ✅
- `npm test` (monorepo) ✅

## Riesgos/Pendientes
- Sigue pendiente auditoría completa Swagger vs rutas reales (96 operaciones en rutas).
- Se mantiene coexistencia fetch loaders + axios service en frontend (deuda conocida).
