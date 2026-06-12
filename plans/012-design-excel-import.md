# Plan 012: Diseño — Import de inventario por Excel (contraparte del export existente)

> **Executor instructions**: Este es un plan de DISEÑO: el entregable es una
> especificación, NO la feature implementada. Follow this plan step by step.
> If anything in the "STOP conditions" section occurs, stop and report.
> When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat a87f7a6..HEAD -- backend/src/controllers/articulos.controller.js backend/src/services/articulos.service.js backend/src/routes/articulos.routes.js`

## Status

- **Priority**: P3
- **Effort**: M (el diseño; la implementación se estima en el entregable)
- **Risk**: LOW (no toca producción)
- **Depends on**: plans/004 (HARD: el parser debe ser `exceljs`; mientras `xlsx` vulnerable siga instalada, NO debe diseñarse import sobre ella — sus advisories HIGH son justamente de parsing: prototype pollution GHSA-4r6h-8v6p-xvw6 y ReDoS GHSA-5pgg-2g8v-p4x9)
- **Category**: direction
- **Planned at**: commit `a87f7a6`, 2026-06-11

## Why this matters

El inventario se puede EXPORTAR a Excel (endpoint con tests de integración completos) pero no IMPORTAR: cargas masivas de artículos (alta inicial, reconciliación con sistemas externos) hoy son entrada manual artículo por artículo. Es la asimetría de superficie clásica — la mitad del round-trip existe y define ya el schema de columnas. Este plan produce el diseño completo (schema, validación, semántica upsert, manejo de errores, dry-run) para que la implementación sea un plan ejecutable posterior.

## Current state

- Export existente — define el "schema" natural del import:

```js
// backend/src/controllers/articulos.controller.js:205-216 — columnas del export
'Código', 'Nombre', 'Marca/Modelo', 'Estado', 'Ubicación',
'Valor (CLP)', 'Fecha Compra', 'Proveedor', 'Especialidades'
```

- OJO: varias columnas del export son DERIVADAS/legibles (`Marca/Modelo` concatenado, `Ubicación` = bodega o proyecto, labels de estado) — el import necesita columnas canónicas, no estas. Campos reales del artículo: ver `backend/src/models/articulo.js` (insert/upsert) y el schema en `db/init/001-init.sql` (tabla `articulo`: tipo, nombre, marca, modelo, nro_serie, estado, valor, fecha_compra, proveedor, bodega, certificaciones jsonb, foto_color_dominante, etc. — léelo).
- Restricción de negocio existente: foto obligatoria al crear artículo (commit `876d2b9`, validación frontend Y backend) — el import masivo choca con esto; el diseño DEBE resolverlo (¿import crea en estado borrador sin foto? ¿exime? ¿columna URL de foto?). Decisión clave del entregable.
- Validación del repo: Joi en TODA entrada de API antes de lógica de negocio (convención dura del repo). Upload de archivos: multer + validación de magic bytes (ver `validateImageMagic` en rutas de firmas como exemplar de patrón).
- Roles: `administrador` y `supervisor` — definir quién puede importar.
- Parser objetivo: `exceljs` (`wb.xlsx.load(buffer)`) — NUNCA `xlsx`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Schema real | `grep -n "CREATE TABLE articulo" -A 40 db/init/001-init.sql` | columnas de la tabla |
| Modelo | leer `backend/src/models/articulo.js` | shape de insert/upsert |

## Scope

**In scope**:
- `plans/012-design-excel-import.md` (completar sección "Entregable")

**Out of scope**:
- TODO código de producción. La implementación será un plan posterior (013+).

## Git workflow

- Branch: `advisor/012-design-excel-import` (solo si modificas este plan)
- NO `Co-Authored-By`. No push ni PR salvo instrucción del operador.

## Steps

### Step 1: Schema canónico de import

Leer `db/init/001-init.sql` (tabla `articulo`) y `backend/src/models/articulo.js`. Definir las columnas del template de import: nombre de columna Excel → campo DB → tipo → obligatoria/opcional → reglas (ej. `Estado` ∈ enum real; `Bodega` por nombre con lookup, ¿y si no existe?; `Especialidades` separadas por coma). Decidir y documentar la resolución del conflicto foto-obligatoria.

### Step 2: Semántica de upsert e idempotencia

Decidir la clave natural (¿`nro_serie`? ¿`codigo`? — mira las constraints UNIQUE del schema). Definir: fila con clave existente → ¿update, skip o error? Re-import del mismo archivo → debe ser idempotente. Filas duplicadas dentro del mismo archivo → error de pre-validación.

### Step 3: Contrato del endpoint

Especificar: `POST /api/articulos/import` multipart (límite de tamaño, magic bytes de xlsx `50 4B 03 04`), query/flag `dryRun=true` (valida todo, no escribe nada, devuelve el mismo reporte), respuesta `{ procesadas, creadas, actualizadas, errores: [{ fila, columna, mensaje }] }`, política de error (recomendación a evaluar: todo-o-nada en una transacción para trazabilidad de auditoría, vs. parcial con reporte — argumenta una), RBAC (¿solo `administrador`?), rate limit, y `writeAuditEvent` por import (no por fila — o sí; decide y argumenta).

### Step 4: Plan de implementación estimado

Lista de archivos a crear/tocar (ruta + validación Joi + service + tests de integración siguiendo `articulos.export.test.js` + UI frontend de upload con reporte de errores), estimación por capa en días, y los 3 riesgos principales (ej. lookups de bodega/proveedor ambiguos, encoding de fechas en Excel, tamaño máximo razonable de archivo).

**Verify**: sección "Entregable" completa: tabla de columnas, decisiones de upsert/foto/transacción argumentadas, contrato del endpoint, estimación.

## Test plan

N/A — diseño. El entregable incluye la lista de tests que la implementación deberá tener.

## Done criteria

- [ ] Tabla columna→campo→regla completa contra el schema REAL de `001-init.sql`
- [ ] Decisión documentada para: clave de upsert, foto obligatoria, transaccionalidad, RBAC
- [ ] Contrato de request/response con dry-run especificado
- [ ] Estimación de implementación por capa
- [ ] `git status` muestra solo este plan modificado
- [ ] Fila de status actualizada en `plans/README.md`

## STOP conditions

- plans/004 no ejecutado (xlsx vulnerable sigue siendo el motor Excel del backend) → STOP: dependencia dura.
- La tabla `articulo` tiene constraints que hacen inviable el upsert por la clave candidata (ej. no hay UNIQUE utilizable) → documenta la incógnita y márcala como bloqueante de diseño, no improvises clave.

## Maintenance notes

- El template de import debe versionarse (columna oculta o nombre de hoja con versión) — si el schema de artículo evoluciona, los Excel viejos guardados por usuarios fallarán con mensaje claro en vez de corromper datos.
- La implementación (plan futuro) debe agregar el endpoint a la matriz RBAC y al checklist de rutas protegidas del repo.

---

## Entregable

> Completado 2026-06-12. Drift check: articulos.controller.js y articulos.service.js modificados desde a87f7a6 (plans 004/005/010), pero ningún cambio afecta el diseño de import — el export sigue en el mismo controller, el schema de la tabla no cambió.

---

### Step 1 — Schema canónico del template de import

#### Tabla de columnas

| Columna Excel | Campo DB | Tipo DB | Obligatoria | Reglas / notas |
|---|---|---|---|---|
| `Código` | `codigo` | VARCHAR(20) UNIQUE | **No** | Si presente → upsert; si vacío → INSERT con código autogenerado (`nextval`). Dentro del mismo archivo: duplicado → error de pre-validación. Formato esperado si se provee: `/^[A-Z]+-\d+$/` (EPP-00001 etc.) |
| `Tipo` | `tipo` | VARCHAR(20) | **Sí** | Enum exacto: `epp`, `herramienta`, `equipo`. Case-insensitive en parse, normalizar a minúsculas. |
| `Nombre` | `nombre` | VARCHAR(150) | **Sí** | Máx 150 chars. |
| `Marca` | `marca` | VARCHAR(120) | No | Libre. El export combina Marca/Modelo en una columna — el template de import los separa (rompiendo la simetría con el export a propósito). |
| `Modelo` | `modelo` | VARCHAR(120) | No | Libre. |
| `Descripción` | `descripcion` | TEXT | No | Sin límite. Truncar a 2000 chars con advertencia en vez de error. |
| `N° Serie` | `nro_serie` | VARCHAR(120) nullable | No | `nro_serie` NO tiene UNIQUE constraint (dropeado en `001-init.sql:196`). Colisión con otro artículo existente → advertencia en el reporte (no error bloqueante), el import continúa. Si dos filas del mismo archivo tienen el mismo `nro_serie` non-null → error de pre-validación. |
| `Valor (CLP)` | `valor` | INTEGER ≥ 0 | No (default 0) | Entero. Rechazar decimales. |
| `Bodega` | `bodega_actual_id` | UUID FK | No | Lookup por `bodegas.nombre` ILIKE TRIM. Si hay 0 matches → error fila. Si hay ≥ 2 matches (ambigüedad de nombre) → error fila con mensaje explícito. Si vacío → `bodega_actual_id = NULL` (artículo sin ubicación). Solo bodegas con `estado = 'activo'` son candidatas. |
| `Fecha Compra` | `fecha_compra` | DATE | No | Acepta: date serial Excel (Number), string ISO YYYY-MM-DD, string DD/MM/YYYY. Normalizar a ISO antes de insertar. |
| `Fecha Vencimiento` | `fecha_vencimiento` | TIMESTAMPTZ | No | Mismas reglas de parsing que Fecha Compra. |
| `Proveedor` | `proveedor_id` | UUID FK nullable | No | Lookup por `proveedor.nombre` ILIKE TRIM. Si no encontrado → `proveedor_id = NULL` + advertencia en reporte (NO crear proveedor automáticamente — el catálogo de proveedores es mantenido separadamente). |
| `Especialidades` | `articulo_especialidad` | relación N | No | Valores separados por coma (o punto y coma). Valores válidos: `oocc`, `ooee`, `equipos`, `trabajos_verticales_lineas_de_vida`. Valor inválido → error fila. Vacío → sin especialidades. |

**Columna de versión (mantenimiento):**
Añadir una hoja oculta llamada `_meta` con una celda `template_version=1`. El parser verifica esto al inicio: si falta la hoja `_meta` → advertencia (archivo antiguo, continuar con best-effort); si la versión es mayor a la soportada → error bloqueante con mensaje "Este archivo fue generado con una versión más nueva del template. Descarga el template actual."

#### Decisión: foto obligatoria

**El import exime la restricción de foto** (`articulos.service.js:43` → `FOTO_REQUIRED`).

Argumento: la foto se captura en terreno o se busca por catálogo — forzarla en bulk load hace impráctico el import de alta inicial. La restricción de foto es una UX-guard para creación unitaria (donde el operador tiene el artículo físico delante), no un invariante de integridad de datos. El artículo queda con `foto_url = NULL` en estado `en_stock`; la foto se completa después via edición individual.

Implementación: el service de import llama `ArticuloModel.insert` directamente (sin pasar por `ArticulosService.create` que contiene el guard de foto). Alternativamente, `ArticulosService.create` acepta un parámetro `{ skipFotoRequired: true }` — usar este último para mantener un único path de insert y hacer el guard más explícito.

**No se incluye columna `Foto URL`** en el template para evitar SSRF (el backend no debe hacer `fetch(url_externa)` en una operación de import masivo).

---

### Step 2 — Semántica de upsert e idempotencia

**Clave de upsert: `codigo` (VARCHAR(20) NOT NULL UNIQUE)**

Justificación:
- `nro_serie`: nullable y sin UNIQUE constraint desde `001-init.sql:196-199` — no usable como clave de conflict.
- `codigo`: NOT NULL UNIQUE, generado por el sistema (EPP-00001 etc.), incluido en el export. Es la clave que el operador puede copiar de un export a un import para reconciliar.
- Para filas sin `Código` (alta inicial desde datos externos sin código previo): siempre INSERT, se genera nuevo código.

**Comportamiento por fila:**

| Situación | Acción |
|---|---|
| `Código` vacío, artículo nuevo | INSERT, genera código |
| `Código` presente, no existe en DB | INSERT con ese código (si cumple formato) |
| `Código` presente, existe en DB | UPDATE de campos editables: nombre, marca, modelo, descripcion, nro_serie, valor, fecha_compra, fecha_vencimiento, proveedor_id, especialidades. **NO actualiza**: estado, bodega_actual_id (no mover un artículo asignado con un import), foto_url (no borrar fotos existentes) |
| `Código` duplicado dentro del archivo | Error de pre-validación (antes de abrir transacción) |
| `N° Serie` colisiona con artículo existente | Advertencia en reporte, no error — import no garantiza unicidad de nro_serie |

**Re-import del mismo archivo:** idempotente. Segunda ejecución con el mismo Excel produce el mismo estado final (las filas con código conocido actualizan los mismos campos, las sin código generan códigos nuevos — si se re-importa un Excel "sin código" se crearán duplicados; es responsabilidad del operador usar el Excel exportado para re-imports).

**Restricción sobre estado/ubicación en UPDATE:** no se modifican `estado`, `bodega_actual_id`, `proyecto_actual_id`, ni `usuario_actual_id` al actualizar. Estos campos tienen semántica de workflow (requieren auditoría de movimientos, custodias, etc.) — cambiarlos por import rompería la trazabilidad. Si el operador necesita mover artículos masivamente, ese es un flujo diferente.

---

### Step 3 — Contrato del endpoint

#### Request

```
POST /api/articulos/import
Content-Type: multipart/form-data

form fields:
  file   — archivo .xlsx (magic bytes: 50 4B 03 04)
  dryRun — boolean string ('true'/'false'), default 'false'

Límite de tamaño: 2 MB (env IMPORT_MAX_BYTES, default 2097152)
```

**Validación de archivo:**
1. Extensión `.xlsx` (Joi en ruta).
2. Magic bytes `50 4B 03 04` (mismo patrón de `validateImageMagic` en firmas — adaptar para xlsx).
3. Tamaño ≤ 2 MB.
4. Máximo 500 filas de datos (excluyendo header). Si > 500 → error 422 `IMPORT_TOO_MANY_ROWS`.

#### Response 200 OK

```json
{
  "procesadas": 42,
  "creadas": 38,
  "actualizadas": 4,
  "advertencias": [
    { "fila": 7, "columna": "Proveedor", "mensaje": "Proveedor 'Ferretería Norte' no encontrado — campo ignorado" },
    { "fila": 12, "columna": "N° Serie", "mensaje": "N° de serie 'ABC-001' ya existe en otro artículo (código EPP-00034)" }
  ],
  "errores": []
}
```

Response 422 Unprocessable Entity (errores de validación, sin escritura):

```json
{
  "procesadas": 0,
  "creadas": 0,
  "actualizadas": 0,
  "advertencias": [],
  "errores": [
    { "fila": 3, "columna": "Tipo", "mensaje": "Valor inválido 'epp2'. Valores permitidos: epp, herramienta, equipo" },
    { "fila": 8, "columna": "Bodega", "mensaje": "Bodega 'Bodega Central Norte' ambigua: 2 coincidencias. Usa el nombre exacto." }
  ]
}
```

#### dry-run

`dryRun=true` ejecuta TODO el pipeline (parse → validate → lookups → upsert batch en transacción) pero hace ROLLBACK al final en vez de COMMIT. La response es idéntica a la de un import real: mismo `procesadas/creadas/actualizadas/errores`. Permite validar el archivo sin efecto. El `writeAuditEvent` NO se emite en dry-run.

#### Política de transacción: **TODO-O-NADA**

Un único `BEGIN`/`COMMIT` que abarca todas las filas. Si alguna fila produce error (tipo inválido, bodega ambigua, constraint DB) → ROLLBACK completo + response con lista de todos los errores encontrados.

**Argumento vs. parcial (SAVEPOINT per-row como en `upsertBatch`):**
- El `upsertBatch` existente es para restore/backup interno (dev panel) donde la idempotencia por id es fuerte. El import de usuario es diferente: si 3 de 100 filas fallan, el operador QUIERE ver todos los errores y arreglar el Excel completo antes de reintentar — no un inventario con 97 artículos creados y 3 sin crear silenciosamente.
- Todo-o-nada es más seguro: el inventario nunca queda en estado parcial.
- Para archivos grandes (≤ 500 filas), la diferencia de latencia es despreciable.

**Excepción:** si el error es de tipo "advertencia" (proveedor no encontrado, nro_serie colisión) → no rollback, solo se agrega al array `advertencias`. Solo los errores del array `errores` disparan rollback.

#### `writeAuditEvent`

Un único evento por import (no por fila):
```js
writeAuditEvent({
  entidadTipo: 'articulo_import',
  entidadId: null,
  accion: 'import',
  usuarioId: req.user.id,
  diff: { procesadas, creadas, actualizadas, archivo: req.file.originalname }
})
```
Por-fila sería demasiado verboso (hasta 500 eventos en un solo import) y oscurecería el log de auditoría.

#### RBAC

Solo `administrador`. Supervisor tiene capacidades de bodega (recepción/entrega) pero no de alta masiva de inventario. Revisable si el negocio lo requiere.

Middleware: `router.post('/import', authMiddleware, isAdmin, ...)`.

#### Rate limit

1 request/10 s por usuario (usando el rate limiter existente del repo). El import puede generar hasta 500 inserts + lookups — más permisivo dispararía abusos.

---

### Step 4 — Plan de implementación

#### Archivos a crear / modificar

```
CREAR  backend/src/services/articulosImport.service.js
         - parseImportSheet(wb): extrae filas de ExcelJS, normaliza tipos
         - resolveExternalRefs(client, rows): lookup bodegas + proveedores en batch
         - validateRows(rows, refs): valida pre-transacción (tipos, enums, magic, duplicados)
         - upsertImportBatch(client, validatedRows, userId): INSERT/UPDATE en transacción

CREAR  backend/src/controllers/articulosImport.controller.js
         - importArticulos(req, res, next): multer → magic bytes → parse → dryRun → response

MODIFICAR  backend/src/routes/articulos.routes.js
         - Agregar POST /import con authMiddleware + isAdmin + multer + rate limit

CREAR  backend/src/tests/integration/articulos.import.routes.test.js
         - Seguir patrón de articulos.export.test.js
         - Casos: happy path insert, happy path upsert, dryRun, error fila, magic bytes inválidos, > 500 filas

MODIFICAR  backend/src/lib/validation/index.js
         - Añadir validación de query param dryRun

CREAR  frontend/src/components/forms/ImportArticulosModal.tsx
         - Drag-and-drop o file picker (.xlsx)
         - Botón "Dry-run" + botón "Importar"
         - Tabla de errores/advertencias por fila/columna
         - Link "Descargar template"

CREAR  frontend/src/api/articulosImport.ts (en el módulo de articulos)
         - POST /api/articulos/import con FormData

CREAR  public/templates/import-articulos-v1.xlsx (o generar on-the-fly en backend)
         - Hoja 'Inventario' con headers canónicos
         - Hoja '_meta' con template_version=1
         - Filas de ejemplo comentadas
```

#### Estimación por capa

| Capa | Descripción | Días |
|---|---|---|
| Backend — parser + validación | `parseImportSheet`, `validateRows`, date handling, magic bytes, limit 500 filas | 1.5 d |
| Backend — resolveExternalRefs | Lookup batch de bodegas + proveedores (con manejo de ambigüedad) | 0.5 d |
| Backend — upsertImportBatch | INSERT/UPDATE en transacción, todo-o-nada, dry-run | 1 d |
| Backend — route + controller + rate limit + RBAC | Multer config, Joi, middleware wiring | 0.5 d |
| Backend — audit + writeAuditEvent | Un evento por import | 0.25 d |
| Backend — tests integración | Seguir patrón export.test.js, 6-8 casos | 1.25 d |
| Frontend — ImportArticulosModal | Upload UI, error table, dry-run UX | 1.5 d |
| Frontend — template download | Generado en backend o archivo estático | 0.25 d |
| **Total** | | **~6.75 días** |

#### 3 riesgos principales

1. **Lookups ambiguos de bodega/proveedor**: `bodegas.nombre` y `proveedor.nombre` no tienen UNIQUE constraint. Si dos bodegas tienen nombres similares (ej. "Bodega Santiago" vs "Bodega Santiago Norte") el lookup ILIKE puede devolver múltiples. **Mitigación**: lookup exacto case-insensitive primero; si 0 matches, intentar ILIKE; si ≥ 2 matches ILIKE → error bloqueante con mensaje específico que lista los nombres exactos encontrados.

2. **Encoding de fechas en Excel**: ExcelJS puede retornar un `Date` object, un string con formato local, o un número serial dependiendo del formato de celda. Un archivo generado en Excel con configuración regional chilena puede venir como `"15-03-2024"` (DD-MM-YYYY). **Mitigación**: en el parser, normalizar con una función `parseExcelDate(cell)` que maneje: `instanceof Date` → `.toISOString().split('T')[0]`; number → convertir serial Excel a Date; string → intentar formatos ISO, DD/MM/YYYY, DD-MM-YYYY en ese orden; inválido → error de fila.

3. **Tamaño y timeout**: con 500 filas + lookups batch de bodegas/proveedores + 500 INSERT/UPDATE, el tiempo de respuesta puede superar los 30s en un servidor cargado. **Mitigación**: los lookups de bodegas y proveedores se hacen en DOS queries batch (`WHERE nombre = ANY($1)`) antes de abrir la transacción — no N+1. Límite de 500 filas reduce el peor caso. Si el timeout sigue siendo un problema, la implementación puede añadir un job asíncrono en V2 (fuera de este diseño).
