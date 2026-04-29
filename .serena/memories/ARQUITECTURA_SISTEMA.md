# Arquitectura del sistema (consolidado)

## Estado vigente (actualizado 2026-04-28)
- Monorepo con backend Express 5 + frontend React 19/Vite + PostgreSQL + Redis.
- Dominio operativo principal: EPP/Herramientas (inventario por categoría, entregas, devoluciones, firmas, trazabilidad, inspecciones, documentos).
- Roles autenticables: solo `admin` y `supervisor` (sin `bodega`/`worker`).
- Capa shell frontend: `frontend/src/shell/` contiene componentes, contextos, layouts y servicios base en transición de consolidación (actualmente `shell/index.ts` vacío).

## Capas backend
- Rutas -> Controladores -> Servicios -> DB/lib.
- Validación en rutas (Joi), reglas de negocio en servicios.
- Seguridad transversal en `index.js` con orden explícito de middlewares.

## Frontend
- React Router con loaders por rol y lazy loading de páginas.
- TanStack Query para estado servidor en páginas/módulos.
- API axios central con refresh interceptor (coexiste `fetchAPI` para loaders en router).

## Datos
- SQL consolidado en `db/init/001-init.sql` (idempotente, fusión de migraciones 001-013) + `002-dev-seed.sql`.
- Nuevas tablas: `articulo_especialidad`, `inspeccion_activo`, `documento*`, `notifications`, `push_subscriptions`.
- `articulo.categoria`: clasificación por tipo EPP (`epp`, `medicion_ensayos`, `manual`, `electrica_cable`, `inalambrica_bateria`).
- `ubicacion.tipo`: `bodega` | `planta` | `proyecto` | `taller_mantencion`.
- Reglas de movimiento y estados reforzadas por SQL y validaciones de servicio.

## Referencias canónicas
- Estado técnico validado: `REPO_ACTUAL_2026_03_16`.
- Estado funcional MVP: `EPP_HERRAMIENTAS_MVP_ESTADO_ACTUAL`.
- Riesgos activos: `RIESGOS_Y_DEUDA_TECNICA_2026_03_16`.
