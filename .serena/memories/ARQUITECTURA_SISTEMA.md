# Arquitectura del sistema (consolidado)

## Estado vigente
- Monorepo con backend Express 5 + frontend React 19/Vite + PostgreSQL + Redis.
- Dominio operativo principal: EPP/Herramientas (inventario, entregas, devoluciones, firmas, trazabilidad).

## Capas backend
- Rutas -> Controladores -> Servicios -> DB/lib.
- Validación en rutas (Joi), reglas de negocio en servicios.
- Seguridad transversal en `index.js` con orden explícito de middlewares.

## Frontend
- React Router con loaders por rol y lazy loading de páginas.
- TanStack Query para estado servidor en páginas/módulos.
- API axios central con refresh interceptor (coexiste `fetchAPI` para loaders en router).

## Datos
- SQL versionado en `db/init/001..004` con constraints e índices de integridad.
- Reglas de movimiento y estados reforzadas por migraciones SQL y validaciones de servicio.

## Referencias canónicas
- Estado técnico validado: `REPO_ACTUAL_2026_03_16`.
- Estado funcional MVP: `EPP_HERRAMIENTAS_MVP_ESTADO_ACTUAL`.
- Riesgos activos: `RIESGOS_Y_DEUDA_TECNICA_2026_03_16`.
