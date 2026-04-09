export interface BarcodeMatchAsset {
  codigo?: string | null;
  nro_serie?: string | null;
}

export function parseScannedCode(rawValue: string | null | undefined): string | null {
  if (!rawValue) return null;

  const normalized = rawValue.trim().replace(/\s+/g, '').toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

export function findAssetByScannedCode<T extends BarcodeMatchAsset>(
  assets: T[],
  scannedCode: string | null | undefined
): T | null {
  const parsedCode = parseScannedCode(scannedCode);
  if (!parsedCode) return null;

  return (
    assets.find((asset) => {
      const codigo = parseScannedCode(asset.codigo);
      const nroSerie = parseScannedCode(asset.nro_serie);
      return codigo === parsedCode || nroSerie === parsedCode;
    }) ?? null
  );
}