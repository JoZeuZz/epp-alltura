# Extracción automática de datos desde factura PDF — Plan de implementación

> **Para workers agénticos:** SUB-SKILL REQUERIDO: Usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar tarea por tarea. Los pasos usan sintaxis checkbox (`- [ ]`) para seguimiento.

**Goal:** Al subir una factura PDF en los modales de artículo, la app extrae automáticamente proveedor, fecha de compra y precio unitario con IVA, y pre-rellena los campos correspondientes.

**Architecture:** Endpoint backend `POST /api/facturas/parse` recibe PDF vía multipart, usa `pdf-parse` para extraer texto plano, aplica regex para detectar proveedor/RUT/fecha/items, cruza o crea proveedor en DB, y devuelve JSON estructurado. El frontend muestra un componente `FacturaUpload` con estados visuales (badge estilo C, resultado estilo A) en los tres modales afectados.

**Tech Stack:** Node.js/Express, `pdf-parse`, multer (ya instalado), PostgreSQL, React/TypeScript, react-hook-form, @tanstack/react-query

---

## Mapa de archivos

### Nuevos — Backend
| Archivo | Responsabilidad |
|---|---|
| `backend/src/services/facturaParser.service.js` | Extraer texto PDF con pdf-parse, aplicar regex, match/crear proveedor |
| `backend/src/controllers/facturaParser.controller.js` | Recibir multipart, llamar service, limpiar temp file, responder |
| `backend/src/routes/facturaParser.routes.js` | Definir `POST /`, auth + roles + upload middleware |
| `backend/src/tests/integration/facturaParser.routes.test.js` | Tests de integración para el endpoint |

### Nuevos — Frontend
| Archivo | Responsabilidad |
|---|---|
| `frontend/src/services/api/facturas.ts` | `parseFactura(file, articuloNombre)` → `FacturaAnalysis` |
| `frontend/src/components/forms/FacturaUpload.tsx` | Badge interactivo con estados idle/analyzing/done/error |

### Modificados
| Archivo | Cambio |
|---|---|
| `backend/src/index.js` | Registrar `facturaRoutes` en `/api/facturas` |
| `backend/package.json` | Agregar `pdf-parse` |
| `frontend/src/services/api/index.ts` | Exportar desde `./facturas` |
| `frontend/src/components/ArticuloCreateModal.tsx` | Usar `FacturaUpload`, manejar `onAnalysis` |
| `frontend/src/components/forms/EditarActivoModal.tsx` | Ídem |
| `frontend/src/components/forms/ArticuloBatchModal.tsx` | Agregar `FacturaUpload` en step 1 |

---

## Tarea 1: Instalar pdf-parse y crear el servicio de extracción

**Archivos:**
- Modificar: `backend/package.json`
- Crear: `backend/src/services/facturaParser.service.js`
- Crear: `backend/src/tests/integration/facturaParser.routes.test.js` (parcialmente — tests de la extracción unitaria en Tarea 2)

- [ ] **Paso 1: Instalar pdf-parse**

```bash
cd /home/proyectos/herramientas/backend && npm install pdf-parse
```

Verificar que aparece en `package.json` dependencies.

- [ ] **Paso 2: Crear el servicio de extracción**

Crear `backend/src/services/facturaParser.service.js`:

```js
'use strict';

const pdfParse = require('pdf-parse');
const db = require('../db');
const { logger } = require('../lib/logger');

const MESES = {
  enero: '01', febrero: '02', marzo: '03', abril: '04',
  mayo: '05', junio: '06', julio: '07', agosto: '08',
  septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
};

/**
 * Normaliza texto: minúsculas, sin tildes, sin espacios extra.
 */
function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza RUT: elimina espacios internos y unifica guión.
 * Entrada: "77.401.316- 4" → Salida: "77.401.316-4"
 */
function normalizeRut(raw) {
  return raw.replace(/\s+/g, '').toUpperCase();
}

/**
 * Parsea número en formato chileno (puntos como miles).
 * "36.790" → 36790
 */
function parseChileanNumber(str) {
  if (!str) return null;
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * Extrae texto de un archivo PDF desde su path.
 */
async function extractText(filePath) {
  const fs = require('fs');
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text || '';
}

/**
 * Extrae nombre del proveedor (primera línea no vacía del PDF).
 */
function extractProveedorNombre(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return lines[0] || null;
}

/**
 * Extrae RUT del proveedor (primera ocurrencia de patrón RUT antes de "SEÑOR(ES)").
 * Maneja formato "77.401.316- 4" con espacios internos.
 */
function extractProveedorRut(text) {
  const senorPos = text.toUpperCase().indexOf('SEÑOR');
  const searchText = senorPos > 0 ? text.slice(0, senorPos) : text;
  const match = searchText.match(/R\.U\.T\.?\s*:?\s*(\d{1,2}\.\d{3}\.\d{3}-\s*[\dKk])/i);
  if (!match) return null;
  return normalizeRut(match[1]);
}

/**
 * Extrae fecha de emisión y la convierte a ISO YYYY-MM-DD.
 * Reconoce "Fecha Emision: 12 de Junio del 2026".
 */
function extractFechaCompra(text) {
  const match = text.match(
    /Fecha\s+Emisi[oó]n\s*:?\s*(\d{1,2})\s+de\s+(\w+)\s+del?\s+(\d{4})/i
  );
  if (!match) return null;
  const [, day, monthStr, year] = match;
  const month = MESES[monthStr.toLowerCase()];
  if (!month) return null;
  return `${year}-${month}-${day.padStart(2, '0')}`;
}

/**
 * Extrae líneas de items de la tabla de la factura.
 * Devuelve array de { descripcion, precioUnitario }.
 * precioUnitario está en pesos sin IVA.
 */
function extractItems(text) {
  // Encuentra el inicio de la tabla (header) y el fin (Forma de Pago o MONTO NETO)
  const headerMatch = text.search(/Descripci[oó]n\s+Cantidad\s+Precio/i);
  if (headerMatch < 0) return [];

  const afterHeader = text.slice(headerMatch);
  const endMatch = afterHeader.search(/Forma de Pago|MONTO NETO/i);
  const tableText = endMatch > 0 ? afterHeader.slice(0, endMatch) : afterHeader;

  // Cada línea de item tiene al menos dos números al final (precio y valor total)
  const itemRegex = /^(.+?)\s+(\d+(?:\.\d{3})*)\s+(\d+(?:\.\d{3})*)(?:\s+(\d+(?:\.\d{3})*))?$/;
  const items = [];

  for (const rawLine of tableText.split('\n')) {
    const line = rawLine.trim();
    if (!line || /Descripci[oó]n|Cantidad|Precio|Codigo/i.test(line)) continue;

    const m = line.match(itemRegex);
    if (!m) continue;

    // Último número = valor total, penúltimo = precio unitario
    // m[2] y m[3] son los dos últimos grupos de números
    const precioUnitario = parseChileanNumber(m[3] ? m[2] : null);
    const descripcion = m[1].replace(/^[-\s]+/, '').trim();

    if (descripcion && precioUnitario !== null) {
      items.push({ descripcion, precioUnitario });
    }
  }

  return items;
}

/**
 * Determina si la factura tiene IVA explícito (DTE estándar Chile = siempre neto).
 */
function hasIva(text) {
  return /I\.V\.A\.?\s*19\s*%/i.test(text);
}

/**
 * Aplica IVA del 19% al precio unitario neto.
 */
function aplicarIva(precioNeto) {
  return Math.round(precioNeto * 1.19);
}

/**
 * Busca el precio unitario (con IVA) del item que mejor coincide con articuloNombre.
 * Si hay un solo item, lo usa directamente.
 * Si hay múltiples, busca coincidencia por substring normalizado.
 * Retorna null si no puede determinar el precio.
 */
function matchPrecio(items, articuloNombre, tieneIva) {
  if (!items.length) return null;

  const applyIva = (p) => tieneIva ? aplicarIva(p) : p;

  if (items.length === 1) {
    return applyIva(items[0].precioUnitario);
  }

  const normalizedNombre = normalize(articuloNombre);
  const matches = items.filter(item =>
    normalize(item.descripcion).includes(normalizedNombre) ||
    normalizedNombre.includes(normalize(item.descripcion))
  );

  if (matches.length === 1) {
    return applyIva(matches[0].precioUnitario);
  }

  return null;
}

/**
 * Busca o crea un proveedor en la DB dado nombre y RUT extraídos de la factura.
 * Orden: busca por RUT exacto → busca por nombre ILIKE → crea nuevo.
 * Retorna { id, nombre, creado: boolean }.
 */
async function resolveProveedor(nombre, rut) {
  if (!nombre) return null;

  // 1. Buscar por RUT
  if (rut) {
    const { rows: byRut } = await db.query(
      `SELECT id, nombre FROM proveedor WHERE rut = $1 AND estado = 'activo' LIMIT 1`,
      [rut]
    );
    if (byRut.length) {
      return { id: byRut[0].id, nombre: byRut[0].nombre, creado: false };
    }
  }

  // 2. Buscar por nombre
  const { rows: byNombre } = await db.query(
    `SELECT id, nombre FROM proveedor WHERE nombre ILIKE $1 AND estado = 'activo' LIMIT 1`,
    [`%${nombre}%`]
  );
  if (byNombre.length) {
    return { id: byNombre[0].id, nombre: byNombre[0].nombre, creado: false };
  }

  // 3. Crear nuevo
  const { rows: created } = await db.query(
    `INSERT INTO proveedor (nombre, rut, estado) VALUES ($1, $2, 'activo') RETURNING id, nombre`,
    [nombre.slice(0, 150), rut || null]
  );
  logger.info('[facturaParser] Proveedor creado desde factura', { nombre, rut });
  return { id: created[0].id, nombre: created[0].nombre, creado: true };
}

/**
 * Parsea una factura PDF y retorna datos estructurados.
 * @param {string} filePath - ruta al archivo PDF temporal
 * @param {string} articuloNombre - nombre del artículo para matching de precio
 */
async function parseFactura(filePath, articuloNombre) {
  const text = await extractText(filePath);

  const proveedorNombre = extractProveedorNombre(text);
  const proveedorRut    = extractProveedorRut(text);
  const fechaCompra     = extractFechaCompra(text);
  const items           = extractItems(text);
  const tieneIva        = hasIva(text);
  const valor           = matchPrecio(items, articuloNombre || '', tieneIva);

  const proveedorResult = await resolveProveedor(proveedorNombre, proveedorRut);

  return {
    proveedor_id:      proveedorResult?.id   ?? null,
    proveedor_nombre:  proveedorResult?.nombre ?? proveedorNombre,
    proveedor_creado:  proveedorResult?.creado ?? false,
    fecha_compra:      fechaCompra,
    valor,
    extractado_ok: !!(proveedorNombre || fechaCompra || valor),
  };
}

module.exports = { parseFactura, extractProveedorNombre, extractProveedorRut, extractFechaCompra, extractItems, matchPrecio, normalizeRut };
```

- [ ] **Paso 3: Commit**

```bash
cd /home/proyectos/herramientas
git add backend/package.json backend/package-lock.json backend/src/services/facturaParser.service.js
git commit -m "feat(facturas): instalar pdf-parse y crear servicio de extracción"
```

---

## Tarea 2: Controller, rutas y registro en index.js

**Archivos:**
- Crear: `backend/src/controllers/facturaParser.controller.js`
- Crear: `backend/src/routes/facturaParser.routes.js`
- Modificar: `backend/src/index.js`

- [ ] **Paso 1: Crear controller**

Crear `backend/src/controllers/facturaParser.controller.js`:

```js
'use strict';

const fs = require('fs');
const { parseFactura } = require('../services/facturaParser.service');
const { logger } = require('../lib/logger');

const safeUnlink = async (filePath) => {
  if (!filePath) return;
  try { await fs.promises.unlink(filePath); } catch { /* ignorar */ }
};

class FacturaParserController {
  static async parse(req, res, next) {
    const file = req.file;
    try {
      if (!file) {
        return res.status(400).json({ error: 'Se requiere un archivo PDF (campo: factura)' });
      }

      const articuloNombre = String(req.body?.articulo_nombre || '');
      const result = await parseFactura(file.path, articuloNombre);

      await safeUnlink(file.path);
      return res.json({ ok: true, data: result });
    } catch (err) {
      await safeUnlink(file?.path);
      logger.warn('[facturaParser] Error al parsear factura', { error: err.message });
      // Responder ok:false en vez de 500 — el frontend sube la factura igual
      return res.json({
        ok: true,
        data: {
          proveedor_id:     null,
          proveedor_nombre: null,
          proveedor_creado: false,
          fecha_compra:     null,
          valor:            null,
          extractado_ok:    false,
        },
      });
    }
  }
}

module.exports = FacturaParserController;
```

- [ ] **Paso 2: Crear rutas**

Crear `backend/src/routes/facturaParser.routes.js`:

```js
'use strict';

const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');
const { documentUpload } = require('../middleware/upload');
const FacturaParserController = require('../controllers/facturaParser.controller');

const router = express.Router();

router.post(
  '/parse',
  authMiddleware,
  checkRole(['admin', 'supervisor']),
  documentUpload.single('factura'),
  FacturaParserController.parse
);

module.exports = router;
```

- [ ] **Paso 3: Registrar en index.js**

En `backend/src/index.js`, agregar junto a los otros requires de rutas (línea ~43):

```js
const facturaRoutes = require('./routes/facturaParser.routes');
```

Y en la sección de `app.use` (junto a los otros `/api/...`, línea ~190):

```js
app.use('/api/facturas', facturaRoutes);
```

- [ ] **Paso 4: Verificar que el servidor arranca sin errores**

```bash
cd /home/proyectos/herramientas/backend && node -e "require('./src/index.js')" 2>&1 | head -20
```

No debe mostrar errores de require ni de sintaxis.

- [ ] **Paso 5: Commit**

```bash
cd /home/proyectos/herramientas
git add backend/src/controllers/facturaParser.controller.js \
        backend/src/routes/facturaParser.routes.js \
        backend/src/index.js
git commit -m "feat(facturas): agregar endpoint POST /api/facturas/parse"
```

---

## Tarea 3: Tests de integración del endpoint

**Archivos:**
- Crear: `backend/src/tests/integration/facturaParser.routes.test.js`

- [ ] **Paso 1: Crear test de integración**

Crear `backend/src/tests/integration/facturaParser.routes.test.js`:

```js
'use strict';

jest.mock('../../middleware/auth', () => ({
  authMiddleware: jest.fn((_req, _res, next) => next()),
}));

jest.mock('../../middleware/roles', () => ({
  checkRole: jest.fn(() => (_req, _res, next) => next()),
}));

jest.mock('../../services/facturaParser.service', () => ({
  parseFactura: jest.fn(),
}));

jest.mock('../../lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  requestLogger: (_req, _res, next) => next(),
}));

const express = require('express');
const request = require('supertest');
const facturaRoutes = require('../../routes/facturaParser.routes');
const { parseFactura } = require('../../services/facturaParser.service');
const errorHandler = require('../../middleware/errorHandler');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/facturas', facturaRoutes);
  app.use(errorHandler);
  return app;
};

const MOCK_RESULT = {
  proveedor_id:     'prov-uuid-1',
  proveedor_nombre: 'AGUA-BLANCA INVERSIONES SPA',
  proveedor_creado: false,
  fecha_compra:     '2026-06-12',
  valor:            43780,
  extractado_ok:    true,
};

describe('POST /api/facturas/parse', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 400 si no se envía archivo', async () => {
    const res = await request(buildApp())
      .post('/api/facturas/parse')
      .field('articulo_nombre', 'anclaje');

    expect(res.status).toBe(400);
  });

  it('retorna resultado del servicio cuando se envía PDF', async () => {
    parseFactura.mockResolvedValueOnce(MOCK_RESULT);

    const res = await request(buildApp())
      .post('/api/facturas/parse')
      .attach('factura', Buffer.from('%PDF-1.4 fake'), { filename: 'test.pdf', contentType: 'application/pdf' })
      .field('articulo_nombre', 'anclaje de cinta');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.proveedor_nombre).toBe('AGUA-BLANCA INVERSIONES SPA');
    expect(res.body.data.valor).toBe(43780);
    expect(parseFactura).toHaveBeenCalledWith(
      expect.stringContaining('upload-'),
      'anclaje de cinta'
    );
  });

  it('retorna extractado_ok:false si el servicio lanza error (no rompe el flujo)', async () => {
    parseFactura.mockRejectedValueOnce(new Error('PDF corrupto'));

    const res = await request(buildApp())
      .post('/api/facturas/parse')
      .attach('factura', Buffer.from('%PDF-1.4 fake'), { filename: 'bad.pdf', contentType: 'application/pdf' })
      .field('articulo_nombre', 'algo');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.extractado_ok).toBe(false);
    expect(res.body.data.proveedor_id).toBeNull();
  });
});
```

- [ ] **Paso 2: Correr tests**

```bash
cd /home/proyectos/herramientas/backend && npx jest facturaParser.routes.test.js --no-coverage 2>&1 | tail -20
```

Esperado: 3 passed.

- [ ] **Paso 3: Commit**

```bash
cd /home/proyectos/herramientas
git add backend/src/tests/integration/facturaParser.routes.test.js
git commit -m "test(facturas): tests de integración para POST /api/facturas/parse"
```

---

## Tarea 4: Servicio y tipo frontend

**Archivos:**
- Crear: `frontend/src/services/api/facturas.ts`
- Modificar: `frontend/src/services/api/index.ts`

- [ ] **Paso 1: Crear servicio frontend**

Crear `frontend/src/services/api/facturas.ts`:

```ts
import { postForm } from './http';

export interface FacturaAnalysis {
  proveedor_id:     string | null;
  proveedor_nombre: string | null;
  proveedor_creado: boolean;
  fecha_compra:     string | null;  // ISO YYYY-MM-DD
  valor:            number | null;  // con IVA incluido
  extractado_ok:    boolean;
}

export async function parseFactura(
  file: File,
  articuloNombre: string
): Promise<FacturaAnalysis> {
  const fd = new FormData();
  fd.append('factura', file);
  fd.append('articulo_nombre', articuloNombre);

  const res = await postForm<{ ok: boolean; data: FacturaAnalysis }>(
    '/facturas/parse',
    fd
  );
  return res.data;
}
```

- [ ] **Paso 2: Exportar desde barrel**

En `frontend/src/services/api/index.ts`, agregar al final:

```ts
export * from './facturas';
```

- [ ] **Paso 3: Verificar typecheck**

```bash
cd /home/proyectos/herramientas/frontend && npx tsc --noEmit 2>&1 | grep -iE "error|facturas" | head -20
```

Sin errores de tipo.

- [ ] **Paso 4: Commit**

```bash
cd /home/proyectos/herramientas
git add frontend/src/services/api/facturas.ts frontend/src/services/api/index.ts
git commit -m "feat(facturas): agregar servicio parseFactura y tipo FacturaAnalysis"
```

---

## Tarea 5: Componente FacturaUpload

**Archivos:**
- Crear: `frontend/src/components/forms/FacturaUpload.tsx`

- [ ] **Paso 1: Crear componente**

Crear `frontend/src/components/forms/FacturaUpload.tsx`:

```tsx
import React, { useRef, useState } from 'react';
import { parseFactura, type FacturaAnalysis } from '../../services/api/facturas';

type UploadState = 'idle' | 'analyzing' | 'done' | 'error';

interface Props {
  articuloNombre: string;
  value: File | null;
  onChange: (file: File | null) => void;
  onAnalysis: (result: FacturaAnalysis | null) => void;
  existingUrl?: string | null;
}

const FacturaUpload: React.FC<Props> = ({
  articuloNombre,
  value,
  onChange,
  onAnalysis,
  existingUrl,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>('idle');

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    onChange(file);
    setState('analyzing');
    try {
      const result = await parseFactura(file, articuloNombre);
      setState(result.extractado_ok ? 'done' : 'error');
      onAnalysis(result);
    } catch {
      setState('error');
      onAnalysis({ proveedor_id: null, proveedor_nombre: null, proveedor_creado: false, fecha_compra: null, valor: null, extractado_ok: false });
    }
  };

  const handleClear = () => {
    onChange(null);
    onAnalysis(null);
    setState('idle');
    if (inputRef.current) inputRef.current.value = '';
  };

  /* ── Franja inferior dinámica según estado ── */
  const stripe = (): { bg: string; text: string; content: React.ReactNode } => {
    if (state === 'analyzing') return {
      bg: 'bg-amber-50 border-t border-amber-200',
      text: 'text-amber-800',
      content: (
        <span className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          Analizando factura…
        </span>
      ),
    };
    if (state === 'done') return {
      bg: 'bg-green-50 border-t border-green-200',
      text: 'text-green-800 font-semibold',
      content: '✓ Análisis completado',
    };
    if (state === 'error') return {
      bg: 'bg-red-50 border-t border-red-200',
      text: 'text-red-800',
      content: '⚠ No se pudo leer la factura — completá los datos manualmente',
    };
    return {
      bg: 'bg-blue-50 border-t border-blue-100',
      text: 'text-blue-800',
      content: '✦ Extrae proveedor, fecha y precio automáticamente',
    };
  };

  const { bg, text, content } = stripe();

  const PDF_ICON = (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  return (
    <div className="space-y-1">
      {existingUrl && !value && (
        <a href={existingUrl} target="_blank" rel="noopener noreferrer"
          className="block text-xs text-primary-blue hover:underline mb-1">
          ↓ Ver factura actual
        </a>
      )}

      <div
        className={`rounded-lg border-2 overflow-hidden cursor-pointer transition-colors ${
          value ? 'border-primary-blue' : 'border-dashed border-primary-blue'
        }`}
        onClick={() => !value && inputRef.current?.click()}
        role={value ? undefined : 'button'}
        tabIndex={value ? undefined : 0}
        onKeyDown={(e) => { if (!value && (e.key === 'Enter' || e.key === ' ')) inputRef.current?.click(); }}
        aria-label={value ? undefined : 'Subir factura PDF'}
      >
        {/* Fila principal */}
        <div className="px-4 py-3 flex items-center gap-3 bg-blue-50">
          <span className="text-primary-blue">{PDF_ICON}</span>
          {value ? (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-dark-blue truncate">{value.name}</p>
                <p className="text-xs text-content-muted">{(value.size / 1024).toFixed(0)} KB · PDF</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                className="text-danger hover:text-danger-text text-lg leading-none px-1"
                aria-label="Eliminar factura seleccionada"
              >
                ×
              </button>
            </>
          ) : (
            <div>
              <p className="text-sm font-semibold text-primary-blue">Subir factura PDF</p>
              <p className="text-xs text-content-muted">PDF · máx 25MB</p>
            </div>
          )}
        </div>

        {/* Franja inferior */}
        <div className={`px-4 py-1.5 text-xs font-medium ${bg} ${text}`}>
          {content}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
};

export default FacturaUpload;
```

- [ ] **Paso 2: Verificar typecheck**

```bash
cd /home/proyectos/herramientas/frontend && npx tsc --noEmit 2>&1 | grep -iE "error|FacturaUpload" | head -20
```

Sin errores.

- [ ] **Paso 3: Commit**

```bash
cd /home/proyectos/herramientas
git add frontend/src/components/forms/FacturaUpload.tsx
git commit -m "feat(facturas): componente FacturaUpload con estados idle/analyzing/done/error"
```

---

## Tarea 6: Modificar ArticuloCreateModal

**Archivos:**
- Modificar: `frontend/src/components/ArticuloCreateModal.tsx`

El modal ya tiene `facturaFile` y `setFacturaFile`. Hay que:
1. Agregar import de `FacturaUpload` y `FacturaAnalysis`
2. Agregar estado `analysisResult`
3. Reemplazar el `<input type="file">` de factura por `<FacturaUpload>`
4. Mover `FacturaUpload` al top de la sección Compra
5. Agregar banner verde con resultado
6. En `onSubmit`, resetear `analysisResult`

- [ ] **Paso 1: Agregar imports y estado**

En `ArticuloCreateModal.tsx`, agregar al bloque de imports:

```tsx
import FacturaUpload from './forms/FacturaUpload';
import type { FacturaAnalysis } from '../services/api/facturas';
```

Agregar estado junto a los demás `useState` (línea ~93):

```tsx
const [analysisResult, setAnalysisResult] = useState<FacturaAnalysis | null>(null);
```

- [ ] **Paso 2: Handler de análisis**

Agregar función handler antes del `return`, después de `toggleEsp`:

```tsx
const handleAnalysis = (result: FacturaAnalysis | null) => {
  setAnalysisResult(result);
  if (!result) {
    // Usuario borró la factura — limpiar campos auto-rellenados
    return;
  }
  if (result.proveedor_id) setValue('proveedor_id', result.proveedor_id);
  if (result.fecha_compra) setValue('fecha_compra', result.fecha_compra);
  if (result.valor !== null) setValue('valor', String(result.valor));
};
```

- [ ] **Paso 3: Limpiar analysisResult en reset**

En `onSuccess` de la mutation (línea ~144), agregar al bloque de resets:

```tsx
setAnalysisResult(null);
```

- [ ] **Paso 4: Reemplazar la sección Compra**

Reemplazar la sección `{/* SECCIÓN: COMPRA */}` completa (líneas 320-367 aprox.) por:

```tsx
{/* SECCIÓN: COMPRA */}
<section className="space-y-3">
  <h4 className={sectionTitleCls}>Compra</h4>

  {/* Factura al top — dispara análisis automático */}
  <FacturaUpload
    articuloNombre={watch('nombre') ?? ''}
    value={facturaFile}
    onChange={setFacturaFile}
    onAnalysis={handleAnalysis}
  />

  {/* Banner resultado análisis */}
  {analysisResult?.extractado_ok && (
    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800">
      <strong>✓ Datos extraídos de la factura:</strong>{' '}
      {analysisResult.proveedor_nombre && <span>{analysisResult.proveedor_nombre} · </span>}
      {analysisResult.fecha_compra && <span>{analysisResult.fecha_compra} · </span>}
      {analysisResult.valor !== null
        ? <span>${analysisResult.valor.toLocaleString('es-CL')} (con IVA)</span>
        : <span className="text-amber-700">Precio no detectado — completá el valor manualmente</span>
      }
      {analysisResult.proveedor_creado && (
        <span className="block mt-1 text-green-700">Proveedor nuevo creado en la base de datos.</span>
      )}
      <span className="block mt-1 text-green-600 font-normal">Podés editar los campos si algo no es correcto.</span>
    </div>
  )}

  <div className="grid grid-cols-2 gap-3">
    <div>
      <label className={labelCls}>Fecha de compra</label>
      <input
        {...register('fecha_compra')}
        type="date"
        className={`${inputCls} ${analysisResult?.fecha_compra ? 'border-green-400' : ''}`}
      />
    </div>
    <div>
      <label className={labelCls}>Valor (CLP) *</label>
      <input
        {...register('valor')}
        type="number"
        min={0}
        className={`${inputCls} ${analysisResult?.valor !== null && analysisResult?.extractado_ok ? 'border-green-400' : ''}`}
        placeholder="0"
      />
      {errors.valor && <p className="text-red-500 text-xs mt-1">{errors.valor.message}</p>}
    </div>
  </div>

  <div>
    <label className={labelCls}>Proveedor</label>
    <div className="flex gap-2">
      <select
        {...register('proveedor_id')}
        className={`${inputCls} flex-1 ${analysisResult?.proveedor_id ? 'border-green-400' : ''}`}
      >
        <option value="">Sin proveedor</option>
        {proveedores.map(p => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setShowProveedorModal(true)}
        className="px-3 py-2 text-xs border border-edge rounded-md text-content-secondary hover:bg-surface-muted whitespace-nowrap"
      >
        + Nuevo
      </button>
    </div>
  </div>
</section>
```

- [ ] **Paso 5: Verificar que la lista de proveedores se refresca cuando se crea uno nuevo desde análisis**

Cuando `onAnalysis` recibe un resultado con `proveedor_creado: true`, el nuevo proveedor debe aparecer en el select. Agregar `queryClient.invalidateQueries` en `handleAnalysis`:

```tsx
const handleAnalysis = (result: FacturaAnalysis | null) => {
  setAnalysisResult(result);
  if (!result) return;
  if (result.proveedor_creado) {
    queryClient.invalidateQueries({ queryKey: ['proveedores'] });
  }
  if (result.proveedor_id) setValue('proveedor_id', result.proveedor_id);
  if (result.fecha_compra) setValue('fecha_compra', result.fecha_compra);
  if (result.valor !== null) setValue('valor', String(result.valor));
};
```

- [ ] **Paso 6: Typecheck**

```bash
cd /home/proyectos/herramientas/frontend && npx tsc --noEmit 2>&1 | grep -iE "error|ArticuloCreate" | head -20
```

Sin errores.

- [ ] **Paso 7: Commit**

```bash
cd /home/proyectos/herramientas
git add frontend/src/components/ArticuloCreateModal.tsx
git commit -m "feat(facturas): integrar FacturaUpload en ArticuloCreateModal"
```

---

## Tarea 7: Modificar EditarActivoModal

**Archivos:**
- Modificar: `frontend/src/components/forms/EditarActivoModal.tsx`

Mismo patrón que Tarea 6. El modal usa `useState` en vez de `react-hook-form`.

- [ ] **Paso 1: Agregar imports y estado**

En `EditarActivoModal.tsx`, agregar imports:

```tsx
import FacturaUpload from './FacturaUpload';
import type { FacturaAnalysis } from '../../services/api/facturas';
```

Agregar estado junto a los demás (línea ~65 aprox.):

```tsx
const [analysisResult, setAnalysisResult] = useState<FacturaAnalysis | null>(null);
```

- [ ] **Paso 2: Handler de análisis**

Agregar antes del `return`:

```tsx
const handleAnalysis = (result: FacturaAnalysis | null) => {
  setAnalysisResult(result);
  if (!result) return;
  if (result.proveedor_creado) {
    queryClient.invalidateQueries({ queryKey: ['proveedores'] });
  }
  if (result.proveedor_id)  setProveedorId(result.proveedor_id);
  if (result.fecha_compra)  setFechaCompra(result.fecha_compra);
  if (result.valor !== null) setValor(String(result.valor));
};
```

- [ ] **Paso 3: Reemplazar sección Compra**

Reemplazar la sección `{/* COMPRA */}` completa (líneas 185-226 aprox.) por:

```tsx
{/* COMPRA */}
<section className={sectionCls}>
  <h4 className={sectionTitleCls}>Compra</h4>

  <FacturaUpload
    articuloNombre={nombre}
    value={facturaFile}
    onChange={setFacturaFile}
    onAnalysis={handleAnalysis}
    existingUrl={activo.factura_url}
  />

  {analysisResult?.extractado_ok && (
    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800">
      <strong>✓ Datos extraídos de la factura:</strong>{' '}
      {analysisResult.proveedor_nombre && <span>{analysisResult.proveedor_nombre} · </span>}
      {analysisResult.fecha_compra && <span>{analysisResult.fecha_compra} · </span>}
      {analysisResult.valor !== null
        ? <span>${analysisResult.valor.toLocaleString('es-CL')} (con IVA)</span>
        : <span className="text-amber-700">Precio no detectado — completá el valor manualmente</span>
      }
      {analysisResult.proveedor_creado && (
        <span className="block mt-1 text-green-700">Proveedor nuevo creado en la base de datos.</span>
      )}
      <span className="block mt-1 text-green-600 font-normal">Podés editar los campos si algo no es correcto.</span>
    </div>
  )}

  <div className="grid grid-cols-2 gap-3">
    <div>
      <label className={labelCls}>Fecha de compra</label>
      <input
        type="date"
        value={fechaCompra}
        onChange={e => setFechaCompra(e.target.value)}
        className={`${inputCls} ${analysisResult?.fecha_compra ? 'border-green-400' : ''}`}
      />
    </div>
    <div>
      <label className={labelCls}>Valor (CLP)</label>
      <input
        type="number"
        min={0}
        step={1}
        value={valor}
        onChange={e => setValor(e.target.value)}
        className={`${inputCls} ${analysisResult?.valor !== null && analysisResult?.extractado_ok ? 'border-green-400' : ''}`}
      />
    </div>
  </div>

  <div>
    <label className={labelCls}>Proveedor</label>
    <div className="flex gap-2">
      <select
        value={proveedorId}
        onChange={e => setProveedorId(e.target.value)}
        className={`${inputCls} flex-1 ${analysisResult?.proveedor_id ? 'border-green-400' : ''}`}
      >
        <option value="">Sin proveedor</option>
        {proveedores.map(p => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setShowProveedorModal(true)}
        className="px-3 py-2 text-xs border border-edge rounded-md text-content-secondary hover:bg-surface-muted whitespace-nowrap"
      >
        + Nuevo
      </button>
    </div>
  </div>
</section>
```

- [ ] **Paso 4: Typecheck**

```bash
cd /home/proyectos/herramientas/frontend && npx tsc --noEmit 2>&1 | grep -iE "error|EditarActivo" | head -20
```

Sin errores.

- [ ] **Paso 5: Commit**

```bash
cd /home/proyectos/herramientas
git add frontend/src/components/forms/EditarActivoModal.tsx
git commit -m "feat(facturas): integrar FacturaUpload en EditarActivoModal"
```

---

## Tarea 8: Modificar ArticuloBatchModal (step 1)

**Archivos:**
- Modificar: `frontend/src/components/forms/ArticuloBatchModal.tsx`

En el step 1 del batch modal se definen `plantillaId`, `bodegaId`, `valorDefault`. Hay que agregar `FacturaUpload` cerca del campo valor_default para rellenar `valorDefault` y `proveedorId` (estado nuevo) + `fechaCompraDefault` (estado nuevo).

Nota: `ArticuloBatchModal` actualmente no tiene `proveedor_id` ni `fecha_compra` en las instancias. Se agrega `proveedorId` y `fechaCompraDefault` como estados de step 1 que se pasan a las instancias al crear las filas.

- [ ] **Paso 1: Agregar imports y estados**

En `ArticuloBatchModal.tsx`, agregar imports (nota: `useQueryClient` ya está importado en línea 2):

```tsx
import FacturaUpload from './FacturaUpload';
import type { FacturaAnalysis } from '../../services/api/facturas';
```

Agregar estados junto a los existentes (línea ~38 aprox.) y `queryClient` en el cuerpo del componente (línea ~32, junto a `const queryClient = useQueryClient();` — agregar si no existe):

```tsx
const queryClient = useQueryClient();
const [proveedorIdDefault, setProveedorIdDefault] = useState('');
const [fechaCompraDefault, setFechaCompraDefault] = useState('');
const [facturaFile, setFacturaFile] = useState<File | null>(null);
```

- [ ] **Paso 2: Handler de análisis**

Agregar antes del `return`:

```tsx
const handleAnalysis = (result: FacturaAnalysis | null) => {
  if (!result) return;
  if (result.proveedor_creado) queryClient.invalidateQueries({ queryKey: ['proveedores'] });
  if (result.valor !== null)    setValorDefault(result.valor);
  if (result.proveedor_id)      setProveedorIdDefault(result.proveedor_id);
  if (result.fecha_compra)      setFechaCompraDefault(result.fecha_compra);
};
```

- [ ] **Paso 3: Actualizar reset en onSuccess**

En el bloque `onSuccess` de la mutation (línea ~82 aprox.), agregar:

```tsx
setProveedorIdDefault('');
setFechaCompraDefault('');
setFacturaFile(null);
```

- [ ] **Paso 4: Agregar FacturaUpload en step 1**

En el JSX del step 1, agregar `<FacturaUpload>` justo debajo del campo "Valor por defecto" (antes del campo "Foto de referencia"):

```tsx
{/* Factura — auto-rellena valor, proveedor y fecha para todas las unidades */}
<div>
  <label className="block text-sm font-medium text-content-secondary mb-1">
    Factura de compra{' '}
    <span className="text-xs text-gray-400">(opcional — rellena precio y proveedor)</span>
  </label>
  <FacturaUpload
    articuloNombre={plantillas.find(p => p.id === plantillaId)?.nombre ?? ''}
    value={facturaFile}
    onChange={setFacturaFile}
    onAnalysis={handleAnalysis}
  />
</div>
```

- [ ] **Paso 5: Typecheck**

```bash
cd /home/proyectos/herramientas/frontend && npx tsc --noEmit 2>&1 | grep -iE "error|BatchModal" | head -20
```

Sin errores.

- [ ] **Paso 6: Commit**

```bash
cd /home/proyectos/herramientas
git add frontend/src/components/forms/ArticuloBatchModal.tsx
git commit -m "feat(facturas): integrar FacturaUpload en ArticuloBatchModal step 1"
```

---

## Tarea 9: Verificación final

- [ ] **Paso 1: Correr todos los tests backend**

```bash
cd /home/proyectos/herramientas/backend && npx jest --no-coverage 2>&1 | tail -15
```

Todos deben pasar.

- [ ] **Paso 2: Typecheck frontend completo**

```bash
cd /home/proyectos/herramientas/frontend && npx tsc --noEmit 2>&1 | grep "error" | head -20
```

Sin errores.

- [ ] **Paso 3: Build frontend**

```bash
cd /home/proyectos/herramientas/frontend && npm run build 2>&1 | grep -iE "error|warn" | head -20
```

Sin errores de build.

- [ ] **Paso 4: Commit final si hay archivos sin commitear**

```bash
cd /home/proyectos/herramientas && git status
```

Si hay cambios residuales:

```bash
git add -A && git commit -m "chore(facturas): ajustes finales y verificación"
```
