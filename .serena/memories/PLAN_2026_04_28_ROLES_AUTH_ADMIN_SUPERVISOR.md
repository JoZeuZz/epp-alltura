# Plan roles autenticables admin/supervisor (2026-04-28)

Contexto revisado en /home/proyectos/herramientas (remote epp-alltura, rama main). El repo mantiene roles legacy en backend (`roleUtils`, `auth`, `roles`, rutas con `bodega/trabajador/worker/client`), frontend (`router`, `AppLayout`, `UsersPage`, tipos, tourSteps, WorkerDashboard/WarehouseDashboard), SQL init/seeds, tests y docs.

Decisión de usuario durante planificación: eliminar rutas legacy autenticadas de trabajador/worker/client como `/api/firmas/pendientes/me` y `/api/devoluciones/mis-custodias/activos` (404 por no existir), no responder 410 ni mantenerlas bloqueadas.

Restricciones clave: mantener entidad/tabla/rutas/pantallas administrativas de trabajador; mantener bodega como ubicación física (`ubicacion.tipo='bodega'`); conservar firma pública por token `/firma/:token` y endpoints públicos de firma; no dejar `/worker/*` frontend; supervisor hereda permisos operativos de supervisor+bodega; admin máximo poder; DB reconstruible modificando `db/init/*.sql` y seeds.