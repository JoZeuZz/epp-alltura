# Spec: Extracción automática de datos desde factura PDF

**Fecha:** 2026-06-15  
**Estado:** Aprobado

---

## Resumen

Al subir una factura PDF en los modales de creación/edición de artículo, la app extrae automáticamente el proveedor, la fecha de compra y el precio unitario (con IVA incluido). Los campos se pre-rellenan y el usuario puede editarlos. Si el análisis falla, la factura igual se adjunta y el usuario completa los datos a mano.

---

## Alcance

Modales afectados:
- `ArticuloCreateModal.tsx` — creación individual
- `EditarActivoModal.tsx` — edición de artículo existente
- `ArticuloBatchModal.tsx` — creación en lote (step 1: valor_default compartido)

---

## Arquitectura

### Flujo completo

```
Usuario selecciona PDF
  → badge muestra "Analizando…" (franja amarilla)
  → POST /api/facturas/parse (multipart: factura PDF + articulo_nombre)
  → backend: pdf-parse extrae texto plano
  → regex detecta: nombre proveedor, RUT, fecha emisión, items tabla, IVA
  → match proveedor: por RUT exacto → por nombre ILIKE → crea nuevo si no existe
  → match precio: por nombre artículo vs descripción item (substring normalizado)
  → respuesta JSON: { proveedor_id, proveedor_nombre, proveedor_creado, fecha_compra, valor, extractado_ok }
  → frontend rellena campos: proveedor_id, fecha_compra, valor
  → badge muestra franja verde "Análisis completado" + banner verde con resumen
  → si falla: franja roja en badge, campos vacíos, factura igual cargada
```

---

## Backend

### Dependencia nueva
```
npm install pdf-parse
```

### Endpoint

```
POST /api/facturas/parse
Auth: authMiddleware + checkRole(['admin', 'supervisor'])
Content-Type: multipart/form-data
Campos:
  - factura: File (PDF)
  - articulo_nombre: string
```

### Respuesta exitosa
```json
{
  "proveedor_id": "uuid",
  "proveedor_nombre": "AGUA-BLANCA INVERSIONES SPA",
  "proveedor_creado": false,
  "fecha_compra": "2026-06-12",
  "valor": 43780,
  "extractado_ok": true
}
```

### Archivos nuevos

| Archivo | Responsabilidad |
|---|---|
| `backend/src/services/facturaParser.service.js` | Extracción regex + match/creación proveedor |
| `backend/src/controllers/facturaParser.controller.js` | HTTP: recibe multipart, llama service, limpia temp file |
| `backend/src/routes/facturaParser.routes.js` | Define ruta, middleware auth/roles/upload |

### Lógica de extracción (regex)

| Campo | Estrategia |
|---|---|
| Nombre proveedor | Primera línea no vacía del texto PDF (antes de "Giro:") |
| RUT proveedor | Primera ocurrencia de `R\.U\.T\.:(\d{1,2}\.\d{3}\.\d{3}-[\dK])` |
| Fecha emisión | `Fecha Emision:\s*(\d{1,2} de \w+ del \d{4})` → `Date` → ISO `YYYY-MM-DD` |
| Items tabla | Líneas con patrón: texto · número · número · número (descripción · cantidad · precio · valor) |
| IVA | Detecta `I\.V\.A\. 19%` en texto → aplica precio_unitario × 1.19 siempre (Factura Electrónica chilena = precios netos) |

### Matching de precio

1. Si 1 item → usa `precio_unitario × 1.19`
2. Si múltiples items → normaliza `articulo_nombre` (minúsculas, sin tildes, trim), busca substring en cada descripción de item
3. Match único → usa ese `precio_unitario × 1.19`
4. Sin match o ambiguo → `valor: null` (usuario completa)

### Matching/creación de proveedor

1. Busca en DB por RUT exacto → retorna `proveedor_id`
2. Si no → busca por nombre `ILIKE '%nombre%'` → retorna `proveedor_id`
3. Si no → `INSERT INTO proveedor (nombre, rut, estado) VALUES (..., 'activo')` → retorna nuevo `proveedor_id`, `proveedor_creado: true`

El archivo PDF temporal se elimina siempre al finalizar (éxito o error).

---

## Frontend

### Tipo compartido

```ts
// frontend/src/services/api/facturas.ts
export interface FacturaAnalysis {
  proveedor_id: string
  proveedor_nombre: string
  proveedor_creado: boolean
  fecha_compra: string | null   // ISO YYYY-MM-DD, null si no detectado
  valor: number | null          // con IVA incluido, null si no pudo matchear item
  extractado_ok: boolean
}

export async function parseFactura(file: File, articuloNombre: string): Promise<FacturaAnalysis>
```

### Componente nuevo: `FacturaUpload.tsx`

```
Props:
  articuloNombre: string
  value: File | null
  onChange: (file: File | null) => void
  onAnalysis: (result: FacturaAnalysis | null) => void
  existingUrl?: string   // edición: muestra link "Ver factura actual"

Estados internos: 'idle' | 'selected' | 'analyzing' | 'done' | 'error'
```

**Badge visual (estilo C aprobado):**
- Idle: borde dashed azul + franja inferior azul "✦ Extrae proveedor, fecha y precio automáticamente"
- Analyzing: borde sólido azul + franja inferior amarilla con spinner "Analizando factura…"
- Done: borde sólido azul + franja inferior verde "✓ Análisis completado"
- Error: borde sólido azul + franja inferior roja "⚠ No se pudo leer la factura — completá los datos manualmente"

Al seleccionar un PDF → dispara `parseFactura()` inmediatamente.  
Al borrar archivo → emite `onAnalysis(null)`.

### Resultado en modales (estilo A aprobado)

Cuando `onAnalysis` retorna con `extractado_ok: true`:
- Banner verde sobre los campos: "✓ Datos extraídos: [proveedor] · [fecha] · $[valor]. Podés editar los campos si algo no es correcto."
- Si `proveedor_creado: true`: banner incluye "Proveedor nuevo creado en la base de datos."
- Si `valor: null`: banner indica "Precio no detectado — completá el valor manualmente."
- Campos auto-rellenados con borde verde mientras `analysisResult` no sea null (borde desaparece si el usuario borra la factura).

### Modificaciones a modales

**`ArticuloCreateModal.tsx`:**
- `<FacturaUpload>` al TOP de sección Compra (antes de fecha/valor/proveedor)
- `onAnalysis`: `setValue('fecha_compra', ...)`, `setValue('valor', ...)`, `setValue('proveedor_id', ...)`
- Estado `analysisResult: FacturaAnalysis | null` → controla banner y borde verde
- `articuloNombre={watch('nombre')}`

**`EditarActivoModal.tsx`:**
- Mismo patrón; campos controlados por `useState` existentes
- `existingUrl={activo.factura_url}`
- `articuloNombre={nombre}` (estado local)

**`ArticuloBatchModal.tsx` (step 1):**
- `<FacturaUpload>` junto al campo "Valor por defecto"
- `onAnalysis`: rellena `valorDefault`, `proveedorId`, y nuevo estado `fechaCompraDefault`
- `articuloNombre` usa el nombre de la plantilla seleccionada (si hay)

---

## Edge cases

| Caso | Comportamiento |
|---|---|
| PDF ilegible / cifrado | `extractado_ok: false`, franja roja, campos vacíos, factura adjunta igual |
| Sin match de proveedor en DB | Crea proveedor nuevo, `proveedor_creado: true` en banner |
| Múltiples items, ninguno matchea nombre | `valor: null`, banner verde sin precio |
| Fecha con formato no reconocido | `fecha_compra: null`, campo vacío |
| Error de red / timeout | Estado `error` en badge, campos vacíos |
| Usuario edita campo auto-rellenado | Campo editable normalmente; el borde verde desaparece al hacer foco |
| Usuario borra la factura | `onAnalysis(null)`, banner desaparece, campos vuelven a estado previo |
| PDF sin IVA explícito | Aplica ×1.19 de todas formas (estándar Factura Electrónica DTE Chile) |

---

## Archivos afectados

### Nuevos
- `backend/src/services/facturaParser.service.js`
- `backend/src/controllers/facturaParser.controller.js`
- `backend/src/routes/facturaParser.routes.js`
- `frontend/src/components/forms/FacturaUpload.tsx`
- `frontend/src/services/api/facturas.ts`

### Modificados
- `backend/src/index.js` — registrar nueva ruta `/api/facturas`
- `frontend/src/components/ArticuloCreateModal.tsx`
- `frontend/src/components/forms/EditarActivoModal.tsx`
- `frontend/src/components/forms/ArticuloBatchModal.tsx`
- `backend/package.json` — `pdf-parse`
