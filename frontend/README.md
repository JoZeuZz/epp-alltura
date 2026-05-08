# Frontend Alltura

Aplicacion React para operacion de inventario, articulos, custodias, firmas y trazabilidad.

## Stack

- React 19
- TypeScript
- Vite
- React Router
- TanStack Query
- Tailwind CSS

## Rutas activas

Publicas:

- /login
- /firma/:token

Admin:

- /admin/dashboard
- /admin/trabajadores
- /admin/users
- /admin/ubicacion/bodegas
- /admin/ubicacion/proyectos
- /admin/inventario/epp
- /admin/inventario/equipos
- /admin/inventario/herramientas
- /admin/inventario/articulos

Supervisor:

- /supervisor/dashboard

## Flujo operativo actual en UI

No hay pagina dedicada activa para entregas/devoluciones en el router principal.

El flujo vigente se ejecuta desde el perfil de activo:

1. Seleccionar activo en inventario por scope.
2. Abrir perfil de activo.
3. Entrega:
   - crear borrador (EntregaCreateModal)
   - firmar (EntregaFirmaModal)
   - confirmar entrega
4. Devolucion:
   - crear borrador (DevolucionActivoModal)
   - firmar (DevolucionFirmaModal)
   - confirmar devolucion

SSE:

- useDeliverySignatureEvents escucha delivery-signed y return-signed para actualizar flujo de firma remota.

## Contratos cliente (same-origin)

La app consume rutas relativas /api mediante apiService/httpClient.

Ejemplos:

- /api/articulos
- /api/inventario/activos-paged
- /api/entregas
- /api/devoluciones
- /api/firmas/events/deliveries

## Tipos de articulo en frontend

Contrato vigente:

- grupo_principal: epp, equipo, herramienta
- subclasificacion: epp, medicion_ensayos, manual, electrica_cable, inalambrica_bateria
- especialidades: oocc, ooee, equipos, trabajos_verticales_lineas_de_vida

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm test
```

## Notas de mantenimiento

- Mantener same-origin /api (sin hosts hardcodeados).
- El cliente incluye metodos legacy en apiService no usados por rutas activas; revisar antes de usar en nuevas vistas.
- Validar sincronia entre router, apiService y contratos backend para evitar drift.