import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../Modal';
import {
  buildIngresoRequestBody,
  type InventoryIngressFormValues,
  type TrackingMode,
} from '../../pages/admin/inventory/inventoryIngress.utils';
import type { InventoryIngresoCreatePayload } from '../../services/apiService';

interface ArticuloOption {
  id: string;
  nombre: string;
  tracking_mode: TrackingMode;
}

interface UbicacionOption {
  id: string;
  nombre: string;
}

interface ProveedorOption {
  id: string;
  nombre: string;
}

interface InventoryIngressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: InventoryIngresoCreatePayload | FormData) => Promise<void>;
  isSubmitting: boolean;
  articulos: ArticuloOption[];
  ubicaciones: UbicacionOption[];
  proveedores: ProveedorOption[];
}

type Step = 1 | 2 | 3;

const INITIAL_FORM_STATE: InventoryIngressFormValues = {
  articulo_id: '',
  ubicacion_id: '',
  fecha_ingreso: new Date().toISOString().slice(0, 10),
  notas: '',
  cantidad: 1,
  costo_unitario: 0,
  codigo_lote: '',
  seriales: '',
  agregar_documento: false,
  proveedor_id: '',
  documento_tipo: 'factura',
  documento_numero: '',
  documento_fecha: new Date().toISOString().slice(0, 10),
  documento_archivo: null,
};

const fileAccept = '.pdf,image/jpeg,image/png,image/webp';

const InventoryIngressModal: React.FC<InventoryIngressModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  articulos,
  ubicaciones,
  proveedores,
}) => {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<InventoryIngressFormValues>(INITIAL_FORM_STATE);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setForm(INITIAL_FORM_STATE);
      setError('');
    }
  }, [isOpen]);

  const selectedArticulo = useMemo(
    () => articulos.find((item) => item.id === form.articulo_id),
    [articulos, form.articulo_id]
  );

  const trackingMode = selectedArticulo?.tracking_mode;

  const setField = <K extends keyof InventoryIngressFormValues>(field: K, value: InventoryIngressFormValues[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep = (targetStep: Step): boolean => {
    if (targetStep === 1) {
      if (!form.articulo_id) {
        setError('Debes seleccionar un artículo.');
        return false;
      }

      if (!form.ubicacion_id) {
        setError('Debes seleccionar una ubicación.');
        return false;
      }

      if (!form.fecha_ingreso) {
        setError('Debes seleccionar fecha de ingreso.');
        return false;
      }
    }

    if (targetStep === 2) {
      if (!trackingMode) {
        setError('Selecciona primero un artículo para determinar el tracking.');
        return false;
      }

      if (trackingMode === 'serial') {
        if (!form.seriales.trim()) {
          setError('Debes ingresar seriales para artículos serializados.');
          return false;
        }
      } else if (Number(form.cantidad) <= 0) {
        setError('La cantidad debe ser mayor que cero.');
        return false;
      }
    }

    if (targetStep === 3 && form.agregar_documento) {
      if (!form.proveedor_id) {
        setError('Debes seleccionar proveedor para adjuntar documento.');
        return false;
      }

      if (!form.documento_numero.trim()) {
        setError('Debes ingresar el número de documento.');
        return false;
      }

      if (!form.documento_fecha) {
        setError('Debes seleccionar fecha de documento.');
        return false;
      }
    }

    setError('');
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    if (step < 3) {
      setStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step);
      setError('');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateStep(step)) return;

    try {
      const payload = buildIngresoRequestBody({
        form,
        trackingMode,
      });

      await onSubmit(payload);
      onClose();
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
        return;
      }
      setError('No se pudo registrar el ingreso.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ingresar herramienta o EPP"
      description="Wizard para registrar ingreso de inventario con documento opcional"
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-dark-blue">Ingresar Herramienta/EPP</h2>
          <p className="text-sm text-gray-500">
            Registra un ingreso manual o adjunta documento de respaldo de forma opcional.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          <div className={`rounded-md px-3 py-2 ${step === 1 ? 'bg-primary-blue text-white' : 'bg-gray-100'}`}>
            1. Identificación
          </div>
          <div className={`rounded-md px-3 py-2 ${step === 2 ? 'bg-primary-blue text-white' : 'bg-gray-100'}`}>
            2. Detalle
          </div>
          <div className={`rounded-md px-3 py-2 ${step === 3 ? 'bg-primary-blue text-white' : 'bg-gray-100'}`}>
            3. Documento
          </div>
        </div>

        {step === 1 ? (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-3" data-tour="admin-inventory-ingress-step-1">
            <div className="md:col-span-2">
              <label className="label-base text-gray-700">Artículo *</label>
              <select
                className="w-full border rounded-md p-2"
                value={form.articulo_id}
                onChange={(event) => setField('articulo_id', event.target.value)}
              >
                <option value="">Seleccionar artículo</option>
                {articulos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre} ({item.tracking_mode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-base text-gray-700">Ubicación destino *</label>
              <select
                className="w-full border rounded-md p-2"
                value={form.ubicacion_id}
                onChange={(event) => setField('ubicacion_id', event.target.value)}
              >
                <option value="">Seleccionar ubicación</option>
                {ubicaciones.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-base text-gray-700">Fecha ingreso *</label>
              <input
                type="date"
                className="w-full border rounded-md p-2"
                value={form.fecha_ingreso}
                onChange={(event) => setField('fecha_ingreso', event.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="label-base text-gray-700">Notas</label>
              <textarea
                className="w-full border rounded-md p-2 min-h-[84px]"
                placeholder="Observaciones de ingreso"
                value={form.notas}
                onChange={(event) => setField('notas', event.target.value)}
              />
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-3" data-tour="admin-inventory-ingress-step-2">
            <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2 text-sm text-blue-700">
              Tracking activo: <strong>{trackingMode || 'No definido'}</strong>
            </div>

            {trackingMode === 'serial' ? (
              <div>
                <label className="label-base text-gray-700">Seriales (1 por línea) *</label>
                <textarea
                  className="w-full border rounded-md p-2 min-h-[150px]"
                  placeholder="ACT-001\nACT-002"
                  value={form.seriales}
                  onChange={(event) => setField('seriales', event.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  La cantidad final se deriva automáticamente del total de seriales.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="label-base text-gray-700">Cantidad *</label>
                  <input
                    type="number"
                    min={0.0001}
                    step={0.0001}
                    className="w-full border rounded-md p-2"
                    value={form.cantidad}
                    onChange={(event) => setField('cantidad', Number(event.target.value))}
                  />
                </div>

                <div>
                  <label className="label-base text-gray-700">Código lote (opcional)</label>
                  <input
                    className="w-full border rounded-md p-2"
                    value={form.codigo_lote}
                    onChange={(event) => setField('codigo_lote', event.target.value)}
                    placeholder="L-2026-001"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label-base text-gray-700">Costo unitario (opcional)</label>
              <input
                type="number"
                min={0}
                step={0.0001}
                className="w-full md:w-1/2 border rounded-md p-2"
                value={form.costo_unitario}
                onChange={(event) => setField('costo_unitario', Number(event.target.value))}
              />
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-3" data-tour="admin-inventory-ingress-step-3">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={form.agregar_documento}
                onChange={(event) => setField('agregar_documento', event.target.checked)}
              />
              Agregar documento de respaldo
            </label>

            {form.agregar_documento ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="label-base text-gray-700">Proveedor *</label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={form.proveedor_id}
                    onChange={(event) => setField('proveedor_id', event.target.value)}
                  >
                    <option value="">Seleccionar proveedor</option>
                    {proveedores.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label-base text-gray-700">Tipo documento *</label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={form.documento_tipo}
                    onChange={(event) =>
                      setField('documento_tipo', event.target.value as InventoryIngressFormValues['documento_tipo'])
                    }
                  >
                    <option value="factura">Factura</option>
                    <option value="boleta">Boleta</option>
                    <option value="guia">Guía</option>
                  </select>
                </div>

                <div>
                  <label className="label-base text-gray-700">Número documento *</label>
                  <input
                    className="w-full border rounded-md p-2"
                    value={form.documento_numero}
                    onChange={(event) => setField('documento_numero', event.target.value)}
                    placeholder="F-12345"
                  />
                </div>

                <div>
                  <label className="label-base text-gray-700">Fecha documento *</label>
                  <input
                    type="date"
                    className="w-full border rounded-md p-2"
                    value={form.documento_fecha}
                    onChange={(event) => setField('documento_fecha', event.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="label-base text-gray-700">Archivo (PDF o imagen)</label>
                  <input
                    type="file"
                    accept={fileAccept}
                    className="w-full border rounded-md p-2"
                    onChange={(event) => setField('documento_archivo', event.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Puedes enviar metadata sin archivo, o adjuntar PDF/JPG/PNG/WEBP.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-gray-300 p-3 text-sm text-gray-600">
                Este ingreso quedará registrado como manual (sin factura/boleta/guía).
              </div>
            )}
          </section>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
            onClick={handleBack}
            disabled={step === 1 || isSubmitting}
          >
            Anterior
          </button>

          {step < 3 ? (
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-primary-blue text-white hover:bg-blue-700 disabled:opacity-60"
              onClick={handleNext}
              disabled={isSubmitting}
            >
              Siguiente
            </button>
          ) : (
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-primary-blue text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Registrar Ingreso'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default InventoryIngressModal;
