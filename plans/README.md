# Implementation Plans

Generados por el skill `improve` el 2026-06-11, sobre el commit `a87f7a6` (auditoría nivel `standard`, monorepo completo). Ejecutar en el orden de la tabla salvo que las dependencias indiquen otra cosa. Cada ejecutor: leer el plan completo antes de empezar, respetar sus STOP conditions, y actualizar su fila al terminar.

Regla global del repo (aplica a TODOS los planes): commits estilo conventional commits, **sin** trailer `Co-Authored-By`; no push ni PR salvo instrucción del operador.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 001 | Rate limiting: fallback in-memory + límites en endpoints públicos QR y refresh | P1 | M | — | DONE |
| 002 | Tests de caracterización: entregas, devoluciones, inventario | P1 | L | — | DONE |
| 003 | Eliminar deps muertas (exceljs backend*, xlsx frontend, browser-image-compression) | P1 | S | coordinar con 004 | DONE |
| 004 | Migrar export Excel backend de `xlsx` (HIGH vuln sin fix) a `exceljs` | P2 | M | 003 (coordinación*) | DONE |
| 005 | Export de inventario sin cargar 5000 filas en memoria | P2 | M | 004 | DONE |
| 006 | Dividir `apiService.ts` (1007 líneas) en módulos por dominio | P2 | M | — | DONE |
| 007 | Tests de integración para `ActivoProfileModal` (workflows) | P2 | M | — | DONE |
| 008 | Descomponer `ActivoProfileModal` (963 líneas) | P3 | L | 007 | DONE |
| 009 | Batch de queries N+1 en entregas/devoluciones | P3 | S | 002 | DONE |
| 010 | Higiene: log de huérfanos GCS, TTL proxy 7d, typecheck backend | P3 | S | — | DONE |
| 011 | Spike: Web Push — cablear a eventos de negocio o eliminar | P3 | M | — | TODO |
| 012 | Diseño: import de inventario por Excel | P3 | M | 004 (hard) | TODO |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (con motivo en una línea) | REJECTED (con justificación — hallazgo corregido por otra vía o enfoque abandonado)

\* 003/004: si 004 se va a ejecutar, 003 NO elimina `exceljs` del backend (queda como motor del export). Detalle en ambos planes.

## Dependency notes

- **002 → 009**: los tests de caracterización fijan mensajes/códigos/orden de errores de los servicios; el batch de queries debe reproducirlos exactamente. Sin red, prohibido refactorizar.
- **007 → 008**: misma lógica para el frontend — los tests de workflows del modal son el criterio de equivalencia de la descomposición, y NO se modifican durante el 008.
- **004 → 005**: tocan la misma función (`buildExcelBuffer` / handler `export`); 004 primero evita conflictos.
- **004 → 012 (hard)**: diseñar import Excel sobre `xlsx` vulnerable (prototype pollution + ReDoS, ambas de *parsing*) está prohibido; primero migrar a `exceljs`.
- 001, 006, 010, 011 son independientes y paralelizables entre sí.

## Findings considered and rejected

(Para que nadie los re-audite — vetados manualmente contra el código en `a87f7a6`.)

- **Refresh token sin rotación**: falso — rotación explícita en `backend/src/services/auth.service.js:392-393` (revoca el token usado y emite uno nuevo).
- **CSRF en rutas de mutación**: no aplica — auth por header `Authorization: Bearer` (ver `backend/src/middleware/auth.js:91`), sin cookies de sesión; el navegador no adjunta el header cross-site.
- **IDOR en firma por QR** (cualquiera con el token puede firmar): by-design — el token bearer de 256 bits (`crypto.randomBytes(32)`, `firmas.service.js:124,566`) ES la credencial del flujo QR. Mitigación proporcional (rate limiting) cubierta por plan 001. Si el negocio exige segundo factor (PIN/OTP) es decisión de producto, no bug.
- **Enumeración de tokens de firma**: infactible con 256 bits de entropía; lo accionable está en plan 001.
- **DoS por parámetros de resize del image proxy**: los tamaños están restringidos a presets whitelisteados (`sizePresets`); especulativo.
- **`unsafe-eval` en CSP**: solo en rama development gated por NODE_ENV, para HMR; convención estándar.
- **SSE sin señal de cierre**: keep-alive intencional del stream de firmas; el cliente cierra.
- **Duplicación `frontend/src/shell/`**: el directorio ya no existe; el churn que lo sugería era histórico (archivos borrados).
- **Cursor de paginación sin versionado** (inventario): defecto cosmético de UX bajo borrado concurrente; no corrompe datos. No vale el esfuerzo ahora.
- **PDF export duplicado entre controllers**: falso — ya centralizado en `backend/src/lib/pdfGenerator.js`; los layouts distintos son intencionales.
- **Contract tests frágiles (string-matching sobre fuentes)**: real pero de bajo riesgo; defensivos a propósito. No vale el esfuerzo ahora.
- **Vulnerabilidades moderadas transitivas de `@google-cloud/storage`** (gaxios/teeny-request/uuid): superficie no expuesta a input de usuario; se resuelven con bumps rutinarios de la lib, sin plan dedicado.
- **TTL de token de stream SSE / fingerprinting de dispositivo en firmas**: endurecimientos posibles pero de bajo leverage frente al plan 001.
- **Badge de Vite 6 vs 7 en README** y similares cosméticos: corregir de pasada en cualquier PR que toque el README; no ameritan plan.

## Direction findings no planificados

- **Bodega mixta en entregas bulk** (TODO en `AsignarEntregarSeleccionadosModal.tsx:136`): el usuario optó por no planificarlo en esta ronda. Sigue siendo riesgo operativo conocido; candidato natural para la próxima.

## No auditado en esta pasada

- `scripts/` de ops y `db/migrations/` individuales (solo revisión superficial).
- `ecosystem.config.js` / despliegue PM2 y docker-compose en profundidad.
- El paquete externo `@jozeuzz/alltura-ui` (repo aparte: `/home/proyectos/alltura-ui`).
- Cobertura E2E Playwright real (`test:smoke:real`) — no ejecutada.
