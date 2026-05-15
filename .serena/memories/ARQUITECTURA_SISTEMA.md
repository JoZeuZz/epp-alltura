# Arquitectura del sistema (consolidado)

## Estado vigente (actualizado 2026-04-28)
- Monorepo con backend Express 5 + frontend React 19/Vite + PostgreSQL + Redis.
- Dominio operativo principal: EPP/Herramientas (inventario por categoría, entregas, devoluciones, firmas, trazabilidad, inspecciones, documentos).
- Roles autenticables: solo `admin` y `supervisor` (sin `bodega`/`worker`).
- Capa shell frontend: `frontend/src/shell/` contiene componentes, contextos, layouts y servicios base. `shell/index.ts` es el barrel público con todos los primitivos exportados. Las páginas consumen a través de re-exportadores delgados en `src/components/`, `src/services/`, `src/context/`.

## Capas backend
- Rutas -> Controladores -> Servicios -> DB/lib.
- Validación en rutas (Joi), reglas de negocio en servicios.
- Seguridad transversal en `index.js` con orden explícito de middlewares.

## Frontend
- React Router con loaders por rol y lazy loading de páginas.
- TanStack Query para estado servidor en páginas/módulos.
- API axios central con refresh interceptor (coexiste `fetchAPI` para loaders en router).

## Datos (actualizado 2026-05-15 — refactor modelo artículo)
- SQL consolidado en `db/init/001-init.sql` (idempotente) + `002-dev-seed.sql`.
- Tablas activas clave: `articulo`, `articulo_especialidad`, `entrega`, `entrega_detalle`, `devolucion`, `devolucion_detalle`, `custodia_activo`, `movimiento_activo`, `bodega`, `proyecto`, `trabajador`, `inspeccion_activo`, `notifications`, `push_subscriptions`, `documento*`.
- Tablas ELIMINADAS (2026-05-14): `activo`, `lote`, `stock`, `movimiento_stock`, `compra`, `compra_detalle`, `egreso`, `egreso_detalle`.
- `articulo.tipo`: `epp` | `herramienta` | `equipo` — cada fila es objeto físico individual; reemplaza `activo` + `articulo` catálogo del modelo anterior.
- `ubicacion.tipo` activos: `bodega` | `proyecto` (`planta` y `taller_mantencion` eliminados del dominio activo).
- `articulo` tiene `bodega_actual_id` XOR `proyecto_actual_id` (nunca ambos simultáneos).
- Reglas de estado y movimiento reforzadas en SQL y servicios; ver REGLAS_NEGOCIO_FLUJOS_2026_05_14.

## Referencias canónicas
- Estado técnico validado: `REPO_ACTUAL_2026_03_16`.
- Estado funcional MVP: `EPP_HERRAMIENTAS_MVP_ESTADO_ACTUAL`.
- Riesgos activos: `RIESGOS_Y_DEUDA_TECNICA_2026_03_16`.
