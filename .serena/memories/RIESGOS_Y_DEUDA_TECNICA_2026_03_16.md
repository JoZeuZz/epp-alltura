# Riesgos/deuda técnica observados (2026-03-16)

1. Doble cliente HTTP frontend:
- `apiService` (axios interceptors) + `fetchAPI` en router.
- Riesgo: manejo divergente de 401, refresh y errores de negocio.

2. Integration DB no obligatorio en PR:
- El flujo más sensible a regresiones SQL está en workflow manual.
- Riesgo: cambios de DB pueden pasar CI sin validación integral de flujo EPP.

3. `trust proxy` hardcoded:
- `app.set('trust proxy', 3)` depende de topología exacta de proxies.
- Riesgo en entornos con diferente número de hops.

4. Config PM2 no portable:
- Frontend definido con `cmd.exe`.
- Riesgo operativo en Linux/entornos no Windows.

5. Memorias históricas desalineadas:
- Existen memorias con dominio "andamios persistentes" que no reflejan completamente el dominio EPP actual.
- Recomendación: mantener memoria histórica pero priorizar referencias `EPP_HERRAMIENTAS_MVP_ESTADO_ACTUAL` + `REPO_ACTUAL_2026_03_16`.
