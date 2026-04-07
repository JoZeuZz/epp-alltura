import { describe, expect, it } from 'vitest';
import { findAssetByScannedCode, parseScannedCode } from '../utils/barcode';

describe('barcode utils', () => {
  it('parseScannedCode normaliza espacios y mayúsculas', () => {
    expect(parseScannedCode('  tal-001\n')).toBe('TAL-001');
    expect(parseScannedCode(' ser  002 ')).toBe('SER002');
  });

  it('parseScannedCode devuelve null para entradas vacías', () => {
    expect(parseScannedCode('')).toBeNull();
    expect(parseScannedCode('   ')).toBeNull();
    expect(parseScannedCode(null)).toBeNull();
  });

  it('findAssetByScannedCode encuentra match exacto por codigo o nro_serie', () => {
    const assets = [
      { codigo: 'TAL-001', nro_serie: 'SER-001', activo_id: 'a1' },
      { codigo: 'TAL-002', nro_serie: 'SER-002', activo_id: 'a2' },
    ];

    expect(findAssetByScannedCode(assets, 'tal-002')?.activo_id).toBe('a2');
    expect(findAssetByScannedCode(assets, 'SER-001')?.activo_id).toBe('a1');
    expect(findAssetByScannedCode(assets, 'NO-EXISTE')).toBeNull();
  });
});