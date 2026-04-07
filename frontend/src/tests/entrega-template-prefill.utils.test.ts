import { describe, expect, it } from 'vitest';
import {
  buildDraftDetailsFromTemplateItems,
  buildTemplateDetailOverrides,
} from '../components/forms/entregaTemplate.utils';

describe('entrega template prefill utils', () => {
  it('prefill crea detalles compatibles con serial y lote', () => {
    const detalles = buildDraftDetailsFromTemplateItems([
      {
        articulo_id: 'art-serial',
        cantidad: 1,
        requiere_serial: true,
        notas_default: 'Serial requerido',
      },
      {
        articulo_id: 'art-lote',
        cantidad: 3,
        requiere_serial: false,
        notas_default: 'Lote estándar',
      },
    ] as never);

    expect(detalles).toEqual([
      {
        articulo_id: 'art-serial',
        activo_ids: [],
        condicion_salida: 'ok',
        notas: 'Serial requerido',
      },
      {
        articulo_id: 'art-lote',
        cantidad: 3,
        lote_id: null,
        condicion_salida: 'ok',
        notas: 'Lote estándar',
      },
    ]);
  });

  it('construye overrides de detalles para endpoints de plantilla', () => {
    const overrides = buildTemplateDetailOverrides([
      {
        articulo_id: 'art-serial',
        activo_ids: ['activo-1'],
        condicion_salida: 'ok',
        notas: 'nota serial',
      },
      {
        articulo_id: 'art-lote',
        cantidad: 2,
        lote_id: 'lote-1',
        condicion_salida: 'usado',
      },
    ]);

    expect(overrides).toEqual([
      {
        articulo_id: 'art-serial',
        cantidad: undefined,
        activo_ids: ['activo-1'],
        lote_id: null,
        condicion_salida: 'ok',
        notas: 'nota serial',
      },
      {
        articulo_id: 'art-lote',
        cantidad: 2,
        activo_ids: undefined,
        lote_id: 'lote-1',
        condicion_salida: 'usado',
        notas: null,
      },
    ]);
  });
});
