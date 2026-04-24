import type {
  EntregaDetallePayload,
  EntregaTemplateItem,
  EntregaTemplateDetailOverridePayload,
} from '../../services/apiService';

export const buildDraftDetailsFromTemplateItems = (
  templateItems: EntregaTemplateItem[]
): EntregaDetallePayload[] => {
  return templateItems.map((item) => {
    if (item.requiere_serial) {
      return {
        articulo_id: item.articulo_id,
        activo_ids: [],
        condicion_salida: 'ok',
        notas: item.notas_default ?? null,
      };
    }

    return {
      articulo_id: item.articulo_id,
      cantidad: Number(item.cantidad) || 1,
      condicion_salida: 'ok',
      notas: item.notas_default ?? null,
    };
  });
};

export const buildTemplateDetailOverrides = (
  detalles: EntregaDetallePayload[]
): EntregaTemplateDetailOverridePayload[] => {
  return detalles
    .filter((item) => Boolean(item.articulo_id))
    .map((item) => ({
      articulo_id: item.articulo_id,
      cantidad: item.cantidad,
      activo_ids: Array.isArray(item.activo_ids) ? item.activo_ids.filter(Boolean) : undefined,
      condicion_salida: item.condicion_salida,
      notas: item.notas ?? null,
    }));
};
