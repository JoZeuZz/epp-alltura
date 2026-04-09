# Baseline operativo canonico para templates Alltura (2026-04-09)

## Decision
Se oficializa este baseline operativo como regla comun para nuevas apps y para convergencia entre repos Alltura.

## Reglas canonicas obligatorias

### R1) Networking same-origin + separacion de capas
- Consumir API interna solo via `/api`.
- Mantener `httpClient` separado de `apiService`.
- Mantener wrappers legacy solo como compatibilidad temporal (sin logica nueva).

### R2) Playwright dual
- `playwright.config.ts` (smoke rapido) es obligatorio.
- `playwright.real.config.ts` (real e2e) es opcional y controlado.
- Real e2e no debe ser gate obligatorio por defecto en cada PR.

### R3) Guardrails anti-drift
- `scripts/check-backend-validation-usage.js` obligatorio.
- `scripts/check-legacy.js` obligatorio.
- Ambos deben estar integrados en `lint:ci`.

### R4) CI minimo obligatorio
- `lint:ci`
- tests backend + frontend
- build frontend
- detect-db-changes + db-smoke condicionado
- integration-db condicionado por cambios DB
- smoke Playwright en CI (al menos desktop chromium)

### R5) Restriccion de alcance
- Cambios de baseline operativo no deben introducir cambios de logica de negocio.

## Estado de adopcion inter-repo
- herramientas: implementado y tomado como referencia de esta decision.
- epp-alltura: pendiente de verificacion formal contra R1..R5.
- report-alltura: pendiente de verificacion formal contra R1..R5.

## Evidencia local de esta decision
- `docs/standardization/template-operational-baseline.md`
- `docs/standardization/gap-report.md`
- `.github/workflows/ci.yml`
- `frontend/playwright.config.ts`
- `frontend/playwright.real.config.ts`
- `scripts/check-backend-validation-usage.js`
- `scripts/check-legacy.js`

## Criterio de cierre para futuras implementaciones
No marcar un repo como alineado sin evidencia verificable de archivos y pipeline para R1..R5.
