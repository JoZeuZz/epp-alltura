# Copilot Instructions - Estandar Alltura (App Shell)

## Fuente canonica y alcance
- Este archivo es la fuente de verdad para cambios futuros en este repositorio.
- Base obligatoria: `.serena/memories/FORMATO_MAESTRO_APP.md`.
- Complemento opcional: `.serena/memories/FRONTEND_COMPONENTES.md` (si existe en el repo).
- Si una practica local contradice este documento, prevalece este documento.
- No cambies logica de negocio ni comportamiento funcional salvo requerimiento explicito del prompt.

## 1) Reglas no negociables
- Mantener stack y patrones existentes; no reemplazar librerias nucleares sin requerimiento explicito.
- Frontend y backend deben trabajar con same-origin `/api`.
- Mantener identidad visual Alltura con tokens y patrones definidos.
- Seguridad por defecto: RBAC + validacion por recurso + logs redactados + requestId.
- Priorizar mobile-first y componentes reutilizables del App Shell.

## 2) API y same-origin `/api` (obligatorio)
- Prohibido hardcodear hosts, dominios o puertos en cliente o servidor para llamadas internas.
- Todas las llamadas del frontend deben usar rutas relativas same-origin (`/api/...`) o el servicio central existente.
- No introducir `http://localhost:*`, `http://127.0.0.1:*`, `https://api.*` ni similares en codigo de aplicacion.
- Para networking interno, reutiliza proxy/rewrite ya configurado en infraestructura.

### Do
- `apiService.get('/api/entregas')`
- `fetch('/api/inventario/stock-summary')`

### Dont
- `axios.get('http://localhost:5000/api/entregas')`
- `fetch('https://api.midominio.com/inventario')`

## 3) UI: tokens, tipografia y patrones

### 3.1 Tokens de color (Tailwind)
Usar solo tokens del sistema para colores base de UI:
- `primary-blue`: `#2A64A4`
- `dark-blue`: `#1E2A4A`
- `neutral-gray`: `#6B7280`
- `light-gray-bg`: `#F9FAFB`

Reglas:
- Evitar colores inline y hex sueltos en componentes nuevos.
- Si falta un token, justificar extension de design tokens en vez de hardcodear.

### 3.2 Tipografia
- Mantener tipografia base Inter (definida en `frontend/src/index.css`).
- Reutilizar clases tipograficas existentes (`heading-*`, `body-*`, `label-*`, `stat-*`).

### 3.3 Patrones de UI
- Cards: `rounded-lg`, `shadow-md`, padding compacto consistente.
- Inputs: borde suave y foco visible con `focus:ring-primary-blue`.
- Botones:
  - Primario: variante basada en `primary-blue`.
  - Secundario y danger: variantes existentes del sistema.
- No crear variantes visuales paralelas si ya existe patron equivalente.

## 4) Componentes obligatorios del App Shell
Al crear o modificar pantallas, priorizar reutilizacion de estos componentes:
- `AppLayout`
- `NotificationBell`
- `Modal`
- `ConfirmationModal`
- `ResponsiveGrid`
- `ResponsiveTable`
- `UploadProgress`
- `TourOverlay`

Contextos obligatorios del shell:
- `AuthContext`
- `NotificationContext`
- `TourContext`

Reglas:
- No reemplazar estos componentes por implementaciones ad hoc sin justificacion tecnica explicita.
- Toda pantalla autenticada debe vivir dentro de `AppLayout`.
- Para tablas/listados con comportamiento responsive, usar `ResponsiveTable` y/o `ResponsiveGrid`.
- Para flujos guiados, usar `TourOverlay` y atributos `data-tour` estables.

## 5) Backend obligatorio: arquitectura, validacion y seguridad

### 5.1 Arquitectura 3 capas
- Flujo obligatorio: `controllers -> services -> models`.
- Controllers: solo capa HTTP (req/res), sin logica de negocio.
- Services: reglas de negocio, orquestacion y validaciones de dominio.
- Models: acceso a datos/CRUD y consultas.

### 5.2 Validacion Joi
- Toda entrada de API debe validarse con Joi antes de ejecutar logica de negocio.
- Reutilizar esquemas/primitivos existentes cuando aplique.
- No mover validaciones de seguridad a frontend como unica barrera.

### 5.3 RBAC + validacion por recurso
- Toda ruta protegida debe aplicar autorizacion por rol (RBAC).
- Ademas del rol, validar pertenencia/alcance del recurso cuando corresponda.
- No aceptar operaciones por "rol valido" si falta validacion del recurso especifico.

### 5.4 Logs redactados + requestId
- Cada request debe tener `requestId` trazable en middleware, respuesta y logs.
- Prohibido registrar secretos o datos sensibles sin redaccion.
- Redactar al menos: `password`, `token`, `authorization`, cookies y credenciales.
- Mantener logging estructurado para auditoria y correlacion.

## 6) Dependencias: politica estricta
- No introducir dependencias nuevas sin justificacion tecnica explicita.
- Antes de agregar una dependencia, documentar:
  1. Problema concreto que no resuelve el stack actual.
  2. Alternativas evaluadas con librerias ya presentes.
  3. Impacto en seguridad, tamano de bundle e impacto operativo.
  4. Plan de mantenimiento y riesgo de lock-in.
- Si no hay justificacion, no agregar dependencia.

## 7) Pruebas minimas antes de marcar "terminado"
No declarar una tarea como terminada sin evidencia de pruebas minimas segun alcance.

### 7.1 Cambios backend
- Prueba de caso feliz (2xx).
- Prueba de validacion Joi (4xx por input invalido).
- Prueba de RBAC (403 para rol no autorizado).
- Prueba de validacion por recurso (acceso denegado cuando no corresponde).

### 7.2 Cambios frontend
- Prueba de render/comportamiento del flujo principal afectado.
- Verificacion de uso de componentes shell requeridos (si aplica).
- Verificacion de rutas API same-origin (`/api`) sin hardcodeo de host.

### 7.3 Cambios de seguridad/autorizacion
- Pruebas positivas y negativas de permisos.
- Confirmar presencia de `requestId` y ausencia de secretos en logs generados.

## 8) Definicion de terminado (DoD operativo para Copilot)
Antes de cerrar una implementacion, verifica y reporta:
- Se respeto same-origin `/api`.
- Se mantuvieron tokens, tipografia y patrones UI del estandar Alltura.
- Se reutilizaron componentes/contextos obligatorios del App Shell cuando aplica.
- Se respeto arquitectura backend de 3 capas con Joi, RBAC y validacion por recurso.
- Se mantuvieron logs redactados y `requestId`.
- No se agregaron dependencias sin justificacion aprobada.
- Se ejecutaron pruebas minimas del alcance y se reportaron resultados.

## 9) Regla anti-drift
- Ante duda de implementacion, alinear primero con este archivo y con `FORMATO_MAESTRO_APP.md`.
- Evitar crear patrones paralelos si ya existe una implementacion valida en el repo.
- Priorizar consistencia del sistema sobre preferencias locales.
