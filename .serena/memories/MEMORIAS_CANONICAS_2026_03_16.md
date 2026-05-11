# Índice canónico de memorias (consolidado 2026-03-23)

## Fuente primaria por tema (vigente)
- Arquitectura y mapa del sistema actual: `REPO_CANONICO_2026_03_23_ARQUITECTURA_HERRAMIENTAS`
- Contratos API vigentes: `REPO_CANONICO_2026_03_23_CONTRATOS_API`
- Reglas de negocio y flujos: `REPO_CANONICO_2026_03_23_REGLAS_NEGOCIO_FLUJOS`
- Operación y checklist productivo: `REPO_CANONICO_2026_03_23_CHECKLIST_OPERACION`
- Trazabilidad de sincronización interna->local: `SYNC_MEMORIAS_SERENA_2026_03_23`
- Deploy productivo Coolify+Cloudflare: `DEPLOYMENT_COOLIFY_CLOUDFLARE`
- Convenciones de código: `code_style_and_conventions`
- Guía base para nuevas apps: `FORMATO_MAESTRO_APP`

## Memorias secundarias
- `RESPONSIVE_DESIGN`: patrones UI responsive detallados.
- `PERFORMANCE_OPTIMIZATION_PATTERNS`: patrones de optimización frontend.

## Memorias históricas / compatibilidad
- `CI_CD_Y_OPERACION_ACTUAL_2026_03_16`: snapshot operativo (CI, testing, Docker).
- `RIESGOS_Y_DEUDA_TECNICA_2026_03_16`: deuda técnica, varios ítems resueltos al 2026-05-11.
- `ARQUITECTURA_SISTEMA`: resumen consolidado del dominio EPP actual.
- `EPP_HERRAMIENTAS_MVP_ESTADO_ACTUAL`: snapshot funcional operativo.
- `DEPLOY_COOLIFY`: referencia corta; guía completa en `DEPLOYMENT_COOLIFY_CLOUDFLARE`.
- `AUDITORIA_CODIGO_2026_04_28`: auditoría de código muerto; ítems resueltos marcados en la memoria.
- `REPO_ACTUAL_2026_05_08`: snapshot más reciente de rutas activas y deuda técnica de contratos.

## Memorias ELIMINADAS (2026-05-11)
- `REPO_ACTUAL_2026_03_16`: superseded por `REPO_ACTUAL_2026_05_08`.
- `SYNC_MEMORIAS_SERENA_2026_03_23`: registro interno de sync, sin valor residual.
- `P0.1 Plan Estabilización/QA`: plan completado, sin valor residual.

## Corte de consolidación 2026-03-30
- Se consolidaron memorias canónicas nuevas visibles en `.serena/memories` sin sobrescribir snapshots históricos.
- Este índice pasa a ser el punto de entrada principal para consultas de arquitectura, contratos, reglas y operación.

## Política de mantenimiento
- Mantener memorias cortas y sin repetir bloques largos.
- Si hay solapamiento, actualizar la memoria primaria y dejar referencias en las secundarias.
- Preferir fechas en nombre para snapshots (`*_YYYY_MM_DD`).
