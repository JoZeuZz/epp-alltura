import { describe, expect, it } from 'vitest';
import {
  buildDraftDetailsFromTemplateItems,
  buildTemplateDetailOverrides,
} from '../components/forms/entregaTemplate.utils';

describe('entrega template prefill utils', () => {
  it('prefill crea detalles compatibles con serial y cantidad', () => {
    const detalles = buildDraftDetailsFromTemplateItems([
      {
        articulo_id: 'art-serial',
        cantidad: 1,
        requiere_serial: true,
        notas_default: 'Serial requerido',
      },
      {
        articulo_id: 'art-cantidad',
        cantidad: 3,
        requiere_serial: false,
        notas_default: 'Cantidad estándar',
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
        articulo_id: 'art-cantidad',
        cantidad: 3,
        condicion_salida: 'ok',
        notas: 'Cantidad estándar',
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
        articulo_id: 'art-cantidad',
        cantidad: 2,
        condicion_salida: 'usado',
      },
    ]);

    expect(overrides).toEqual([
      {
        articulo_id: 'art-serial',
        cantidad: undefined,
        activo_ids: ['activo-1'],
        condicion_salida: 'ok',
        notas: 'nota serial',
      },
      {
        articulo_id: 'art-cantidad',
        cantidad: 2,
        activo_ids: undefined,
        condicion_salida: 'usado',
        notas: null,
      },
    ]);
  });
});
