import type {
  CompraDetallePayload,
  InventoryIngresoCreatePayload,
} from '../../../services/apiService';

export type TrackingMode = 'serial' | 'lote';

export interface InventoryIngressFormValues {
  articulo_id: string;
  ubicacion_id: string;
  fecha_ingreso: string;
  notas: string;
  cantidad: number;
  costo_unitario: number;
  codigo_lote: string;
  seriales: string;
  agregar_documento: boolean;
  proveedor_id: string;
  documento_tipo: 'factura' | 'boleta' | 'guia';
  documento_numero: string;
  documento_fecha: string;
  documento_archivo: File | null;
}

export interface BuildIngresoPayloadInput {
  form: InventoryIngressFormValues;
  trackingMode?: TrackingMode;
}

const toNumber = (value: number | string, fallback = 0): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

export const splitSerialLines = (rawSerials: string): string[] =>
  rawSerials
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const buildIngresoDetail = (
  form: InventoryIngressFormValues,
  trackingMode?: TrackingMode
): CompraDetallePayload => {
  const base: CompraDetallePayload = {
    articulo_id: form.articulo_id,
    ubicacion_id: form.ubicacion_id,
    cantidad: toNumber(form.cantidad),
    costo_unitario: toNumber(form.costo_unitario),
  };

  if (trackingMode === 'serial') {
    const serialLines = splitSerialLines(form.seriales);
    if (!serialLines.length) {
      throw new Error('Debes ingresar al menos un serial para artículos serializados.');
    }

    base.activos = serialLines.map((codigo) => ({ codigo }));
    base.cantidad = serialLines.length;
  } else {
    if (base.cantidad <= 0) {
      throw new Error('La cantidad debe ser mayor que cero.');
    }
  }

  if (trackingMode === 'lote' || form.codigo_lote.trim()) {
    base.lote = {
      codigo_lote: form.codigo_lote.trim() || null,
    };
  }

  return base;
};

export const buildIngresoPayload = ({
  form,
  trackingMode,
}: BuildIngresoPayloadInput): InventoryIngresoCreatePayload => {
  if (!form.articulo_id) throw new Error('Debes seleccionar un artículo.');
  if (!form.ubicacion_id) throw new Error('Debes seleccionar una ubicación.');
  if (!form.fecha_ingreso) throw new Error('Debes seleccionar la fecha de ingreso.');

  const payload: InventoryIngresoCreatePayload = {
    fecha_ingreso: form.fecha_ingreso,
    notas: form.notas.trim() || null,
    detalles: [buildIngresoDetail(form, trackingMode)],
  };

  if (form.agregar_documento) {
    if (!form.proveedor_id) throw new Error('Debes seleccionar proveedor para adjuntar documento.');
    if (!form.documento_numero.trim()) throw new Error('Debes ingresar el número de documento.');
    if (!form.documento_fecha) throw new Error('Debes seleccionar fecha de documento.');

    payload.documento_compra = {
      proveedor_id: form.proveedor_id,
      tipo: form.documento_tipo,
      numero: form.documento_numero.trim(),
      fecha: form.documento_fecha,
    };
  }

  return payload;
};

export const buildIngresoRequestBody = ({
  form,
  trackingMode,
}: BuildIngresoPayloadInput): InventoryIngresoCreatePayload | FormData => {
  const payload = buildIngresoPayload({ form, trackingMode });

  if (form.agregar_documento && form.documento_archivo) {
    const formData = new FormData();
    formData.append('payload_json', JSON.stringify(payload));
    formData.append('documento_archivo', form.documento_archivo);
    return formData;
  }

  return payload;
};
