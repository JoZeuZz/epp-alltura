import React, { useEffect, useState } from 'react';
import Modal from '../Modal';
import type {
  EgresoTipoMotivo,
  InventoryEgresoCreatePayload,
  InventoryEgresoDetallePayload,
} from '../../services/apiService';

interface ArticuloOption {
  id: string;
  nombre: string;
  tracking_mode: 'serial' | 'lote' | 'cantidad';
}

interface UbicacionOption {
  id: string;
  nombre: string;
}

interface LoteOption {
  id: string;
  articulo_id: string;
  codigo_lote?: string | null;
}

interface InventoryEgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: InventoryEgresoCreatePayload) => Promise<void>;
  isSubmitting: boolean;
  articulos: ArticuloOption[];
  ubicaciones: UbicacionOption[];
  lotes?: LoteOption[];
}

const TIPO_MOTIVO_LABELS: Record<EgresoTipoMotivo, string> = {
  salida: 'Salida directa',
  baja: 'Baja / retiro permanente',
  consumo: 'Consumo',
  ajuste: 'Ajuste de inventario',
};

const EMPTY_DETALLE: InventoryEgresoDetallePayload = {
  articulo_id: '',
  ubicacion_id: '',
  cantidad: 1,
  lote_id: null,
  notas: null,
};

const InventoryEgressModal: React.FC<InventoryEgressModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  articulos,
  ubicaciones,
  lotes = [],
}) => {
  const [tipoMotivo, setTipoMotivo] = useState<EgresoTipoMotivo>('salida');
  const [notasGenerales, setNotasGenerales] = useState('');
  const [detalles, setDetalles] = useState<InventoryEgresoDetallePayload[]>([{ ...EMPTY_DETALLE }]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setTipoMotivo('salida');
      setNotasGenerales('');
      setDetalles([{ ...EMPTY_DETALLE }]);
      setError('');
    }
  }, [isOpen]);

  const setDetalleField = <K extends keyof InventoryEgresoDetallePayload>(
    index: number,
    field: K,
    value: InventoryEgresoDetallePayload[K]
  ) => {
    setDetalles((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Al cambiar artículo, limpiar lote
      if (field === 'articulo_id') {
        updated[index].lote_id = null;
      }
      return updated;
    });
    setError('');
  };

  const addDetalle = () => {
    setDetalles((prev) => [...prev, { ...EMPTY_DETALLE }]);
  };

  const removeDetalle = (index: number) => {
    setDetalles((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    for (let i = 0; i < detalles.length; i++) {
      const d = detalles[i];
      if (!d.articulo_id) {
        setError(`Fila ${i + 1}: selecciona un artículo.`);
        return false;
      }
      if (!d.ubicacion_id) {
        setError(`Fila ${i + 1}: selecciona una ubicación de origen.`);
        return false;
      }
      if (Number(d.cantidad) <= 0) {
        setError(`Fila ${i + 1}: la cantidad debe ser mayor que cero.`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    const payload: InventoryEgresoCreatePayload = {
      tipo_motivo: tipoMotivo,
      notas: notasGenerales.trim() || null,
      detalles: detalles.map((d) => ({
        articulo_id: d.articulo_id,
        ubicacion_id: d.ubicacion_id,
        cantidad: Number(d.cantidad),
        lote_id: d.lote_id || null,
        notas: d.notas?.trim() || null,
      })),
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
        return;
      }
      setError('No se pudo registrar el egreso.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar egreso de inventario"
      description="Registra una salida, baja, consumo o ajuste de stock"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-dark-blue">Registrar Egreso</h2>
          <p className="text-sm text-gray-500">
            Retira stock indicando el motivo. El stock disponible se decrementará de inmediato.
          </p>
        </div>

        {/* Motivo y notas generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label-base text-gray-700">Motivo *</label>
            <select
              className="w-full border rounded-md p-2"
              value={tipoMotivo}
              onChange={(e) => setTipoMotivo(e.target.value as EgresoTipoMotivo)}
            >
              {(Object.entries(TIPO_MOTIVO_LABELS) as [EgresoTipoMotivo, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="label-base text-gray-700">Notas generales</label>
            <input
              className="w-full border rounded-md p-2"
              placeholder="Observación general del egreso"
              value={notasGenerales}
              onChange={(e) => setNotasGenerales(e.target.value)}
            />
          </div>
        </div>

        {/* Detalles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Ítems a egresar</h3>
            <button
              type="button"
              className="text-sm px-3 py-1 rounded-md border border-primary-blue text-primary-blue hover:bg-blue-50"
              onClick={addDetalle}
            >
              + Agregar ítem
            </button>
          </div>

          {detalles.map((detalle, index) => {
            const lotesDelArticulo = lotes.filter((l) => l.articulo_id === detalle.articulo_id);
            const articuloSeleccionado = articulos.find((a) => a.id === detalle.articulo_id);

            return (
              <div
                key={index}
                className="border rounded-md p-3 space-y-3 bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Ítem {index + 1}
                  </span>
                  {detalles.length > 1 && (
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:text-red-800"
                      onClick={() => removeDetalle(index)}
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="label-base text-gray-700">Artículo *</label>
                    <select
                      className="w-full border rounded-md p-2"
                      value={detalle.articulo_id}
                      onChange={(e) => setDetalleField(index, 'articulo_id', e.target.value)}
                    >
                      <option value="">Seleccionar artículo</option>
                      {articulos.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre} ({a.tracking_mode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label-base text-gray-700">Ubicación origen *</label>
                    <select
                      className="w-full border rounded-md p-2"
                      value={detalle.ubicacion_id}
                      onChange={(e) => setDetalleField(index, 'ubicacion_id', e.target.value)}
                    >
                      <option value="">Seleccionar ubicación</option>
                      {ubicaciones.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label-base text-gray-700">Cantidad *</label>
                    <input
                      type="number"
                      min={0.0001}
                      step={0.0001}
                      className="w-full border rounded-md p-2"
                      value={detalle.cantidad}
                      onChange={(e) => setDetalleField(index, 'cantidad', Number(e.target.value))}
                    />
                  </div>

                  {articuloSeleccionado?.tracking_mode === 'lote' && (
                    <div>
                      <label className="label-base text-gray-700">Lote (opcional)</label>
                      <select
                        className="w-full border rounded-md p-2"
                        value={detalle.lote_id ?? ''}
                        onChange={(e) =>
                          setDetalleField(index, 'lote_id', e.target.value || null)
                        }
                      >
                        <option value="">Sin lote específico</option>
                        {lotesDelArticulo.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.codigo_lote ?? `Lote ${l.id.slice(0, 8)}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="label-base text-gray-700">Notas del ítem</label>
                    <input
                      className="w-full border rounded-md p-2"
                      placeholder="Motivo específico para este ítem"
                      value={detalle.notas ?? ''}
                      onChange={(e) => setDetalleField(index, 'notas', e.target.value || null)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registrando...' : 'Registrar Egreso'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default InventoryEgressModal;
