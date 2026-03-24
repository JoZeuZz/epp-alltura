import { describe, expect, it } from 'vitest';
import {
  buildIngresoPayload,
  buildIngresoRequestBody,
} from '../pages/admin/inventory/inventoryIngress.utils';

const baseForm = {
  articulo_id: 'article-1',
  ubicacion_id: 'location-1',
  fecha_ingreso: '2026-02-12',
  notas: 'Ingreso inicial',
  cantidad: 3,
  costo_unitario: 12000,
  codigo_lote: '',
  seriales: '',
  agregar_documento: false,
  proveedor_id: '',
  documento_tipo: 'factura' as const,
  documento_numero: '',
  documento_fecha: '2026-02-12',
  documento_archivo: null,
};

describe('inventoryIngress.utils', () => {
  it('serial: deriva cantidad y arma activos[]', () => {
    const payload = buildIngresoPayload({
      form: {
        ...baseForm,
        cantidad: 999,
        seriales: 'ACT-001\n ACT-002 \n',
      },
      trackingMode: 'serial',
    });

    expect(payload.detalles).toHaveLength(1);
    expect(payload.detalles[0].cantidad).toBe(2);
    expect(payload.detalles[0].activos).toEqual([{ codigo: 'ACT-001' }, { codigo: 'ACT-002' }]);
  });

  it('lote: respeta cantidad y lote', () => {
    const payload = buildIngresoPayload({
      form: {
        ...baseForm,
        cantidad: 5,
        codigo_lote: 'LOT-2026-01',
      },
      trackingMode: 'lote',
    });

    expect(payload.detalles[0].cantidad).toBe(5);
    expect(payload.detalles[0].lote).toEqual({ codigo_lote: 'LOT-2026-01' });
  });

  it('permite ingreso manual sin documento', () => {
    const payload = buildIngresoPayload({
      form: {
        ...baseForm,
        agregar_documento: false,
      },
      trackingMode: 'lote',
    });

    expect(payload.documento_compra).toBeUndefined();
    expect(payload.detalles).toHaveLength(1);
  });

  it('devuelve FormData cuando hay archivo de documento', () => {
    const file = new File(['%PDF-1.4'], 'doc.pdf', { type: 'application/pdf' });
    const payload = buildIngresoRequestBody({
      form: {
        ...baseForm,
        agregar_documento: true,
        proveedor_id: 'supplier-1',
        documento_numero: 'F-100',
        documento_archivo: file,
      },
      trackingMode: 'lote',
    });

    expect(payload).toBeInstanceOf(FormData);
    const formData = payload as FormData;
    expect(formData.get('payload_json')).toBeTruthy();
    expect(formData.get('documento_archivo')).toBe(file);
  });
});
