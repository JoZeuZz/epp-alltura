import { type ReturnEligibleAssetRow } from '../../services/apiService';

export interface ReturnDetailAssetSelectionLike {
  activo_ids: string[];
  custodia_activo_id?: string | null;
}

export const findDuplicateReturnAssetId = (
  detalles: Array<Pick<ReturnDetailAssetSelectionLike, 'activo_ids'>>
): string | null => {
  const seen = new Set<string>();

  for (const detail of detalles) {
    const serialIds = Array.isArray(detail.activo_ids) ? detail.activo_ids.filter(Boolean) : [];
    for (const serialId of serialIds) {
      if (seen.has(serialId)) {
        return serialId;
      }
      seen.add(serialId);
    }
  }

  return null;
};

export const resolveCustodiaActivoId = (
  detail: ReturnDetailAssetSelectionLike,
  eligibleAssetByActivoId: Map<string, ReturnEligibleAssetRow>
): string | null => {
  const explicitCustodiaId = String(detail.custodia_activo_id || '').trim();
  if (explicitCustodiaId) {
    return explicitCustodiaId;
  }

  const assetId = Array.isArray(detail.activo_ids)
    ? detail.activo_ids.find(Boolean)
    : null;

  if (!assetId) {
    return null;
  }

  return eligibleAssetByActivoId.get(assetId)?.custodia_activo_id || null;
};

export const filterEligibleCustodias = (
  assets: ReturnEligibleAssetRow[],
  selectedAssetIds: Set<string>,
  search: string
): ReturnEligibleAssetRow[] => {
  const term = search.trim().toLowerCase();

  return assets.filter((asset) => {
    if (selectedAssetIds.has(asset.activo_id)) {
      return false;
    }

    if (!term) {
      return true;
    }

    return [asset.codigo, asset.nro_serie || '', asset.articulo_nombre || '']
      .some((value) => String(value).toLowerCase().includes(term));
  });
};
