
# epp-alltura — Copilot Code

## Copilot Skills & Disciplina
- Antes de cualquier respuesta, identifica y usa los agentes/herramientas disponibles correctamente.
- Usa modo comprimido (caveman) por defecto si el usuario lo solicita.

## Proyecto
Gestión de herramientas/EPP: activos, asignaciones, devoluciones, estado, trazabilidad. Monorepo.

## Disciplina de contexto y tokens
- Busca primero de forma dirigida (`rg`/`find`/glob), nunca escanees el repo completo.
- Lee solo los archivos necesarios; omite dist/build/logs/node_modules.
- Cambios en fases: planea antes de tareas grandes, espera aprobación.
- Salida de comandos: filtra con `2>&1 | tail -120` o `| grep -iE "error|warn"`.
- Al final de cada fase: reporta archivos cambiados, decisiones y pendientes.

## Política MCP
- Prioriza archivos locales → CLI → MCP solo si reduce contexto o mejora precisión.
- Usa Serena para navegación de símbolos, estructura y decisiones duraderas. Evita para ediciones simples o detalles ruidosos.
- Usa Context7 solo para docs externas (React/Vite/Express/Tailwind/Joi, versión específica).

## Decisiones de roles y producto
- Login: `administrador` (máximo acceso), `supervisor` (+ bodega).
- `trabajador` es entidad de dominio, no usuario login; sin flujo dedicado.
- No existe login de `bodega`; fusionado en supervisor; preservar historial.

## Arquitectura
- 3 capas: `controllers` (HTTP) → `services` (negocio) → `models` (datos).
- Mantén monorepo, convenciones, middleware, rutas, UI y patrones existentes.
- Lógica de roles/permisos centralizada, sin duplicación cruzada.
- No introducir nuevos patrones sin justificación; evita refactors amplios si basta un cambio localizado.

## Backend
- Express/Node; reutiliza auth/authz middleware existente.
- Toda entrada API: validación Joi antes de lógica de negocio.
- RBAC en cada ruta protegida + validación de alcance de recurso.
- Cada request: `requestId` trazable en middleware y logs; redacta `password`/`token`/`authorization`/cookies.
- Cambios DB: explícitos y reversibles; explica impacto; nunca secretos productivos en código/commits.

## Frontend
- React + TypeScript + Vite; reutiliza layouts/guards/services/hooks/componentes.
- Todas llamadas API: same-origin `/api/...` — nunca hosts/puertos hardcodeados.
- Cambios de navegación: sidebar + rutas + guards + visibilidad de roles juntos.
- No mostrar opciones UI de roles/funciones removidas; no dupliques clientes API.

## Checklist de refactor de roles (auth/roles/permisos)
Revisar: modelo usuario, enum/constants de roles, middleware auth/authz, guards de rutas, visibilidad en sidebar, manejo de sesión, seeds, migraciones, tests/fixtures, checks frontend, rutas backend protegidas.

Esperado: `administrador` máximo acceso · `supervisor` + bodega · `trabajador` solo entidad · no login bodega · historial preservado.

## Estándares Alltura
- App Shell: `AppLayout` (toda pantalla auth), `Modal`, `ConfirmationModal`, `ResponsiveTable`, `ResponsiveGrid`, `NotificationBell`, `TourOverlay`.
- Contextos: `AuthContext`, `NotificationContext`, `TourContext`.
- Tokens: `primary-blue #2A64A4`, `dark-blue #1E2A4A`; nunca hex inline; tipografía Inter; reutiliza clases `heading-*`/`body-*`/`label-*`.
- Prioriza flujos de asignación, devolución, estado, ubicación; pantallas claras, acciones directas.

## Disciplina Git
- Edita solo el set mínimo de archivos necesario; no formatees ni renombres sin revisar referencias.
- No hagas commits salvo que se indique; nunca agregues trailer Co-Authored-By.
- Tras cambios: reporta archivos cambiados · verificación realizada · riesgos.

## Orden de verificación
1. typecheck (si existe)
2. tests dirigidos
3. lint
4. build (solo si afecta rutas/código buildable)
5. inspección manual de rutas/guards/contratos API si faltan tests

Si no puedes correr verificación, explica por qué.
