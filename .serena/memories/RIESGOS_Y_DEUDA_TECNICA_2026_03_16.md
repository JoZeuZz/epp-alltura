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
- Recomendación: priorizar `REPO_ACTUAL_2026_04_28` + `EPP_HERRAMIENTAS_MVP_ESTADO_ACTUAL`.

6. ~~Capa `frontend/src/shell/` en transición~~ — RESUELTO 2026-04-28:
- `shell/index.ts` exporta correctamente todos los primitivos incluyendo `frontendLogger`.
- Imports directos internos actualizados al barrel. Sin divergencia pendiente.

7. ~~Validación duplicada en backend~~ — RESUELTO 2026-04-28:
- `backend/src/validation/index.js` (proxy) eliminado.
- Las 4 rutas estandarizadas a `require('../lib/validation')`.

9. ~~Duplicación de constantes de validación en routes vs model~~ — RESUELTO 2026-04-29:
- `backend/src/lib/articuloValidation.js` creado como módulo canónico.
- `articulo.js` model y `articulos.routes.js` importan de él; ya no definen localmente.

10. ~~`articulo.tipo` se escribía igual que `grupo_principal`~~ — RESUELTO 2026-04-29:
- `articulo.js` model ya no escribe la columna `tipo` en CREATE ni UPDATE.
- La columna permanece en DB (nullable-no-nullable legacy), candidata a DROP.

11. Páginas de inventario huérfanas (sin ruta activa):
- `AdminInventoryActivosPage`, `AdminInventoryEgressPage`, `AdminInventoryMovementsPage`,
  `AdminInventoryStockPage`, `AdminInventoryIngressPage` (esta última tiene 1 test).
- Decisión pendiente: eliminar páginas + test o crear rutas para rehabilitarlas.

12. `AdminInventoryLayout` con navegación rota — solo existe para `/admin/inventario/legacy`,
    sus tabs todos redirigen al mismo destino. Candidato a eliminar junto con la ruta legacy.

8. ~~`articulo` escribe `categoria` y `subclasificacion` con el mismo valor~~ — RESUELTO 2026-04-28:
- Modelo `articulo.js` ya no escribe la columna `categoria` en CREATE ni UPDATE.
- La columna `categoria` permanece en DB (nullable) pero deja de sincronizarse.
