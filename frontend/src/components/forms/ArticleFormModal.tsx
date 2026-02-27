import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../Modal';
import type { Articulo, ArticuloCreatePayload, ArticuloTipo } from '../../services/apiService';

interface ArticleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: ArticuloCreatePayload) => Promise<void>;
  isSubmitting: boolean;
  mode?: 'create' | 'edit';
  initialValues?: Articulo | null;
}

interface ArticleFormValues {
  tipo: ArticuloTipo;
  nombre: string;
  marca: string;
  modelo: string;
  categoria: string;
  tracking_mode: ArticuloCreatePayload['tracking_mode'];
  retorno_mode: ArticuloCreatePayload['retorno_mode'];
  requiere_vencimiento: boolean;
  unidad_medida: string;
  estado: ArticuloCreatePayload['estado'];
}

type FormErrors = Partial<Record<keyof ArticleFormValues, string>>;

const INITIAL_FORM: ArticleFormValues = {
  tipo: 'herramienta',
  nombre: '',
  marca: '',
  modelo: '',
  categoria: '',
  tracking_mode: 'serial',
  retorno_mode: 'retornable',
  requiere_vencimiento: false,
  unidad_medida: 'unidad',
  estado: 'activo',
};

const mapArticuloToFormValues = (articulo?: Articulo | null): ArticleFormValues => {
  if (!articulo) return INITIAL_FORM;

  return {
    tipo: articulo.tipo || 'herramienta',
    nombre: articulo.nombre || '',
    marca: articulo.marca || '',
    modelo: articulo.modelo || '',
    categoria: articulo.categoria || '',
    tracking_mode: articulo.tracking_mode || 'cantidad',
    retorno_mode: articulo.retorno_mode || 'retornable',
    requiere_vencimiento: Boolean(articulo.requiere_vencimiento),
    unidad_medida: articulo.unidad_medida || 'unidad',
    estado: articulo.estado || 'activo',
  };
};

const ArticleFormModal: React.FC<ArticleFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  mode = 'create',
  initialValues = null,
}) => {
  const [formValues, setFormValues] = useState<ArticleFormValues>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState('');

  const isEditMode = mode === 'edit';

  useEffect(() => {
    if (!isOpen) {
      setFormValues(INITIAL_FORM);
      setErrors({});
      setGeneralError('');
      return;
    }

    if (isEditMode) {
      setFormValues(mapArticuloToFormValues(initialValues));
    } else {
      setFormValues(INITIAL_FORM);
    }

    setErrors({});
    setGeneralError('');
  }, [initialValues, isEditMode, isOpen]);

  const isConsumable = formValues.tipo === 'consumible';
  const isRetornable = formValues.retorno_mode === 'retornable';

  const validateForm = useMemo(
    () => (values: ArticleFormValues): FormErrors => {
      const nextErrors: FormErrors = {};

      if (!values.nombre.trim()) {
        nextErrors.nombre = 'El nombre es obligatorio.';
      }

      if (!values.unidad_medida.trim()) {
        nextErrors.unidad_medida = 'La unidad de medida es obligatoria.';
      }

      return nextErrors;
    },
    []
  );

  const handleFieldChange = <K extends keyof ArticleFormValues>(
    field: K,
    value: ArticleFormValues[K]
  ) => {
    if (field === 'tipo') {
      const tipo = value as ArticuloTipo;
      setFormValues((prev) => ({
        ...prev,
        tipo,
        retorno_mode: tipo === 'consumible' ? 'consumible' : 'retornable',
        tracking_mode: tipo === 'consumible' ? 'cantidad' : 'serial',
      }));
    } else if (field === 'retorno_mode') {
      const retornoMode = value as ArticleFormValues['retorno_mode'];
      setFormValues((prev) => ({
        ...prev,
        retorno_mode: retornoMode,
        tracking_mode: retornoMode === 'retornable' ? 'serial' : prev.tracking_mode,
      }));
    } else {
      setFormValues((prev) => ({ ...prev, [field]: value }));
    }

    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setGeneralError('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validateForm(formValues);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload: ArticuloCreatePayload = {
      tipo: formValues.tipo,
      nombre: formValues.nombre.trim(),
      marca: formValues.marca.trim() || null,
      modelo: formValues.modelo.trim() || null,
      categoria: formValues.categoria.trim() || null,
      tracking_mode: formValues.tracking_mode,
      retorno_mode: isConsumable ? 'consumible' : formValues.retorno_mode,
      requiere_vencimiento: formValues.requiere_vencimiento,
      unidad_medida: formValues.unidad_medida.trim(),
      estado: formValues.estado,
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (error) {
      if (error instanceof Error && error.message) {
        setGeneralError(error.message);
        return;
      }
      setGeneralError(
        isEditMode ? 'No se pudo actualizar el artículo.' : 'No se pudo crear el artículo.'
      );
    }
  };

  const modalTitle = isEditMode ? 'Editar artículo' : 'Nuevo artículo';
  const modalDescription = isEditMode
    ? 'Actualiza los datos operativos del artículo en catálogo'
    : 'Formulario para crear artículos del catálogo de inventario';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} description={modalDescription}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-dark-blue">
            {isEditMode ? 'Editar Artículo' : 'Nuevo Artículo'}
          </h2>
          <p className="text-sm text-gray-500">
            {isEditMode
              ? 'Modifica la configuración del artículo para inventario y trazabilidad.'
              : 'Crea herramientas o EPP para que queden disponibles en ingresos y stock.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label-base text-gray-700">Nombre *</label>
            <input
              className="w-full border rounded-md p-2"
              value={formValues.nombre}
              onChange={(event) => handleFieldChange('nombre', event.target.value)}
              placeholder="Ej: Casco de seguridad"
            />
            {errors.nombre ? <p className="text-xs text-red-600 mt-1">{errors.nombre}</p> : null}
          </div>

          <div>
            <label className="label-base text-gray-700">Tipo *</label>
            <select
              className="w-full border rounded-md p-2"
              value={formValues.tipo}
              onChange={(event) => handleFieldChange('tipo', event.target.value as ArticuloTipo)}
            >
              <option value="herramienta">Herramienta</option>
              <option value="epp">EPP</option>
              <option value="consumible">Consumible</option>
            </select>
          </div>

          <div>
            <label className="label-base text-gray-700">Tracking mode *</label>
            <select
              className="w-full border rounded-md p-2 disabled:bg-gray-100"
              value={formValues.tracking_mode}
              disabled={isConsumable || isRetornable}
              onChange={(event) =>
                handleFieldChange(
                  'tracking_mode',
                  event.target.value as ArticleFormValues['tracking_mode']
                )
              }
            >
              <option value="serial">Serial (por unidad)</option>
              <option value="lote">Lote</option>
              <option value="cantidad">Cantidad (agregado)</option>
            </select>
          </div>

          <div>
            <label className="label-base text-gray-700">Retorno mode *</label>
            <select
              className="w-full border rounded-md p-2 disabled:bg-gray-100"
              value={isConsumable ? 'consumible' : formValues.retorno_mode}
              disabled={isConsumable}
              onChange={(event) =>
                handleFieldChange(
                  'retorno_mode',
                  event.target.value as ArticleFormValues['retorno_mode']
                )
              }
            >
              <option value="retornable">Retornable (activo)</option>
              <option value="consumible">Consumible</option>
            </select>
          </div>

          <div>
            <label className="label-base text-gray-700">Unidad de medida *</label>
            <input
              className="w-full border rounded-md p-2"
              value={formValues.unidad_medida}
              onChange={(event) => handleFieldChange('unidad_medida', event.target.value)}
              placeholder="Ej: unidad, par, caja"
            />
            {errors.unidad_medida ? (
              <p className="text-xs text-red-600 mt-1">{errors.unidad_medida}</p>
            ) : null}
          </div>

          <div>
            <label className="label-base text-gray-700">Marca</label>
            <input
              className="w-full border rounded-md p-2"
              value={formValues.marca}
              onChange={(event) => handleFieldChange('marca', event.target.value)}
            />
          </div>

          <div>
            <label className="label-base text-gray-700">Modelo</label>
            <input
              className="w-full border rounded-md p-2"
              value={formValues.modelo}
              onChange={(event) => handleFieldChange('modelo', event.target.value)}
            />
          </div>

          <div>
            <label className="label-base text-gray-700">Categoría</label>
            <input
              className="w-full border rounded-md p-2"
              value={formValues.categoria}
              onChange={(event) => handleFieldChange('categoria', event.target.value)}
            />
          </div>

          <div>
            <label className="label-base text-gray-700">Estado inicial</label>
            <select
              className="w-full border rounded-md p-2"
              value={formValues.estado}
              onChange={(event) =>
                handleFieldChange('estado', event.target.value as ArticleFormValues['estado'])
              }
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={formValues.requiere_vencimiento}
                onChange={(event) => handleFieldChange('requiere_vencimiento', event.target.checked)}
              />
              Requiere control de vencimiento
            </label>
          </div>
        </div>

        {generalError ? <p className="text-sm text-red-600">{generalError}</p> : null}

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
            className="px-4 py-2 rounded-md bg-primary-blue text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : isEditMode ? 'Guardar cambios' : 'Crear artículo'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ArticleFormModal;
