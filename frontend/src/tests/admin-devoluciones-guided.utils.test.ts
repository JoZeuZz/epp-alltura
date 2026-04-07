import { describe, expect, it } from 'vitest';
import {
  filterEligibleCustodias,
  findDuplicateReturnAssetId,
  resolveCustodiaActivoId,
} from '../pages/admin/adminDevolucionesGuided.utils';
import { type ReturnEligibleAssetRow } from '../services/apiService';

const mockEligibleAssets: ReturnEligibleAssetRow[] = [
  {
    custodia_activo_id: 'custodia-1',
    trabajador_id: 'worker-1',
    desde_en: '2026-01-01T00:00:00.000Z',
    activo_id: 'activo-1',
    codigo: 'TAL-001',
    nro_serie: 'SER-001',
    articulo_id: 'art-1',
    articulo_nombre: 'Taladro',
  },
  {
    custodia_activo_id: 'custodia-2',
    trabajador_id: 'worker-1',
    desde_en: '2026-01-01T00:00:00.000Z',
    activo_id: 'activo-2',
    codigo: 'TAL-002',
    nro_serie: 'SER-ABC',
    articulo_id: 'art-1',
    articulo_nombre: 'Taladro',
  },
];

describe('adminDevolucionesGuided.utils', () => {
  it('detecta activos duplicados entre detalles', () => {
    const duplicated = findDuplicateReturnAssetId([
      { activo_ids: ['activo-1'] },
      { activo_ids: ['activo-2'] },
      { activo_ids: ['activo-1'] },
    ]);

    expect(duplicated).toBe('activo-1');
  });

  it('preserva custodia_activo_id explícita cuando existe', () => {
    const byAssetId = new Map(mockEligibleAssets.map((asset) => [asset.activo_id, asset]));
    const custodia = resolveCustodiaActivoId(
      {
        activo_ids: ['activo-1'],
        custodia_activo_id: 'custodia-manual',
      },
      byAssetId
    );

    expect(custodia).toBe('custodia-manual');
  });

  it('resuelve custodia_activo_id desde activos elegibles cuando no viene en detalle', () => {
    const byAssetId = new Map(mockEligibleAssets.map((asset) => [asset.activo_id, asset]));
    const custodia = resolveCustodiaActivoId(
      {
        activo_ids: ['activo-2'],
        custodia_activo_id: '',
      },
      byAssetId
    );

    expect(custodia).toBe('custodia-2');
  });

  it('filtra custodias elegibles por búsqueda y excluye activos ya seleccionados', () => {
    const filtered = filterEligibleCustodias(mockEligibleAssets, new Set(['activo-2']), 'ser-001');

    expect(filtered).toHaveLength(1);
    expect(filtered[0].activo_id).toBe('activo-1');
  });
});
