# Estado Actual MVP EPP/Herramientas

## Dominio y seguridad
- Modelo de dominio alineado al MER EPP/Herramientas en PostgreSQL.
- Autenticación JWT con refresh token, blacklist y validación de estado de usuario.
- Compatibilidad de roles entre semántica externa (`worker`/`client`) y DB (`trabajador`).
- Contrato de respuesta estandarizado `{ success, message, data, errors }`.
- Sanitización y redacción de datos sensibles en logs activos en middleware global.

## Backend operativo
- Catálogos funcionales: `ubicaciones`, `articulos`, `trabajadores`, `proveedores`.
- Entregas:
  - creación de borrador,
  - consulta,
  - firma obligatoria previa a confirmación,
  - trazabilidad de movimientos y custodia.
- Firmas:
  - firma en dispositivo compartido,
  - generación de token QR/link con hash, expiración y uso único,
  - consumo de token con registro de IP y user-agent,
  - compatibilidad de firma por JSON (`firma_imagen_url`) y `multipart` (`firma_archivo`),
  - limpieza de artefactos subidos cuando falla el registro de firma.
- Devoluciones:
  - creación de borrador,
  - confirmación transaccional,
  - cierre de `custodia_activo`,
  - actualización de estado de `activo`,
  - movimientos según disposición (`devuelto`, `perdido`, `baja`, `mantencion`).
- Compras / ingreso de inventario:
  - registro de `documento_compra`, `compra` y `compra_detalle`,
  - reglas por `tracking_mode` (`serial`, `lote`, `cantidad`),
  - alta de `activo` o `lote`,
  - impacto en `stock` y movimientos de entrada.
- Inventario:
  - consulta de stock,
  - movimientos de stock,
  - movimientos de activos,
  - consulta de auditoría.
- Notificaciones:
  - módulo persistente (`notifications`) y push (`push_subscriptions`) alineado a `usuario.id` UUID,
  - controladores/rutas estandarizados en envelope de API.
- Compatibilidad legacy:
  - rutas `/api/users` y `/api/notifications` conservadas,
  - operación interna convergida a modelo MER.
- Retiro legacy fase 2:
  - `backend/src/middleware/validators.js` retirado del backend,
  - `backend/src/lib/validators.js` y `backend/src/middleware/validate.js` retirados del backend,
  - `backend/src/lib/validation/index.js` reducido a superficie MER activa (`PATTERNS`, `email`, `password`, `personName`, `rut`, `phoneNumber`, `userRole`, `pushSubscription`),
  - guardrail de código `check:backend-validation` agregado al flujo CI para impedir reintroducción.
- Retiro legacy adicional:
  - alias dashboard legacy `/api/dashboard/cubic-meters` y `/api/dashboard/project/:projectId` retirados; quedan solo endpoints canónicos EPP,
  - `frontend/src/services/apiService.legacy.ts` retirado,
  - `frontend/src/pages/admin/UsersPage.tsx` retirado (huérfano no enrutado),
  - `backend/src/models/user.js` retirado (sin referencias activas).

## Frontend MVP por rol
- Navegación principal enfocada en flujo EPP por rol (`admin`, `supervisor`, `bodega`, `worker`).
- `bodega`:
  - crear entrega,
  - generar token y registrar firma,
  - confirmar entrega,
  - crear/confirmar devolución,
  - registrar compra e ingreso.
- `trabajador`:
  - visualizar custodias activas,
  - firmar pendientes en dispositivo compartido,
  - firmar por token/QR.
- Firma manuscrita integrada con componente reusable `SignaturePad` (mouse/touch/pen) y envío binario `multipart`.
- Refresh de auth adaptado al envelope del backend.
- Navegación de notificaciones consolidada a `/notifications`.

## Pruebas y validación
- Unit tests de servicios críticos (`auth`, `entregas`, `devoluciones`, `firmas`) disponibles.
- Suite de integración API existente (con mocks de servicio) para envelope y errores base.
- Suite `integration-db` agregada para flujo real con DB:
  - happy path compra -> entrega -> firma -> confirmación -> devolución,
  - error confirmación sin firma,
  - token de un solo uso,
  - validación de disposiciones y estados/custodia/movimientos.
- Base de smoke UI automatizable por Playwright para roles clave y escenarios desktop/móvil.
- Checklist manual de smoke funcional documentado en `docs/epp-smoke-checklist.md`.

## Riesgos técnicos vigentes
- Persisten algunos artefactos legacy de negocio andamios/proyectos en historiales y documentación, aunque fuera de rutas operativas EPP.
- Ejecución de smoke manual interactivo y evidencias por rol depende del entorno con navegador/dispositivos disponibles.
- La suite `integration-db` requiere configuración explícita de DB de pruebas y guard de seguridad para reset.
