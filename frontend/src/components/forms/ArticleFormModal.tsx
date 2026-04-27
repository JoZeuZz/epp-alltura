import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../Modal';
import type {
  Articulo,
  ArticuloCreatePayload,
  ArticuloEspecialidad,
  ArticuloGrupoPrincipal,
  ArticuloSubclasificacion,
} from '../../services/apiService';

interface ArticleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: ArticuloCreatePayload) => Promise<void>;
  isSubmitting: boolean;
  mode?: 'create' | 'edit';
  initialValues?: Articulo | null;
}

interface ArticleFormValues {
  grupo_principal: ArticuloGrupoPrincipal;
  nombre: string;
  marca: string;
  modelo: string;
  subclasificacion: ArticuloSubclasificacion;
  especialidades: ArticuloEspecialidad[];
  nivel_control: NonNullable<ArticuloCreatePayload['nivel_control']>;
  requiere_vencimiento: boolean;
  unidad_medida: string;
  estado: ArticuloCreatePayload['estado'];
}

type FormErrors = Partial<Record<keyof ArticleFormValues, string>>;

const INITIAL_FORM: ArticleFormValues = {
  grupo_principal: 'herramienta',
  nombre: '',
  marca: '',
  modelo: '',
  subclasificacion: 'manual',
  especialidades: ['oocc'],
  nivel_control: 'medio',
  requiere_vencimiento: false,
  unidad_medida: 'unidad',
  estado: 'activo',
};

const SUBCLASIFICACIONES_BY_GRUPO: Record<ArticuloGrupoPrincipal, ArticuloSubclasificacion[]> = {
  equipo: ['epp', 'medicion_ensayos'],
  herramienta: ['manual', 'electrica_cable', 'inalambrica_bateria'],
};

const SUBCLASIFICACION_LABELS: Record<ArticuloSubclasificacion, string> = {
  epp: 'Protección personal',
  medicion_ensayos: 'Medición y ensayos',
  manual: 'Manual',
  electrica_cable: 'Eléctrica cable',
  inalambrica_bateria: 'Inalámbrica batería',
};

const ESPECIALIDAD_SET = new Set<ArticuloEspecialidad>([
  'oocc',
  'ooee',
  'equipos',
  'trabajos_verticales_lineas_de_vida',
]);

const normalizeGrupoPrincipal = (value?: string | null): ArticuloGrupoPrincipal => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'equipo' || normalized === 'epp') {
    return 'equipo';
  }
  return 'herramienta';
};

const normalizeSubclasificacion = (
  value: unknown,
  grupoPrincipal: ArticuloGrupoPrincipal
): ArticuloSubclasificacion => {
  const aliases: Record<string, ArticuloSubclasificacion> = {
    herramientas: 'manual',
    herramientas_electricas: 'electrica_cable',
    proteccion_altura: 'epp',
    proteccion_manos: 'epp',
  };

  const normalized = String(value || '').trim().toLowerCase();
  const mapped = aliases[normalized] || (normalized as ArticuloSubclasificacion);
  const allowed = SUBCLASIFICACIONES_BY_GRUPO[grupoPrincipal];

  return allowed.includes(mapped) ? mapped : allowed[0];
};

const normalizeEspecialidades = (value: unknown): ArticuloEspecialidad[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const mapped = value
    .map((item) => {
      const normalized = String(item || '').trim().toLowerCase();
      if (normalized === 'trabajos_verticales') return 'trabajos_verticales_lineas_de_vida';
      return normalized;
    })
    .filter((item): item is ArticuloEspecialidad => ESPECIALIDAD_SET.has(item as ArticuloEspecialidad));

  return Array.from(new Set(mapped));
};

const ESPECIALIDADES_OPTIONS: Array<{ value: ArticuloEspecialidad; label: string }> = [
  { value: 'oocc', label: 'OOCC' },
  { value: 'ooee', label: 'OOEE' },
  { value: 'equipos', label: 'Equipos' },
  {
    value: 'trabajos_verticales_lineas_de_vida',
    label: 'Trabajos verticales y líneas de vida',
  },
];

const mapArticuloToFormValues = (articulo?: Articulo | null): ArticleFormValues => {
  if (!articulo) return INITIAL_FORM;

  const grupoPrincipal = normalizeGrupoPrincipal(articulo.grupo_principal);
  const subclasificacion = normalizeSubclasificacion(
    articulo.subclasificacion,
    grupoPrincipal
  );
  const especialidades = normalizeEspecialidades(articulo.especialidades);

  return {
    grupo_principal: grupoPrincipal,
    nombre: articulo.nombre || '',
    marca: articulo.marca || '',
    modelo: articulo.modelo || '',
    subclasificacion,
    especialidades: especialidades.length ? especialidades : ['oocc'],
    nivel_control: articulo.nivel_control || 'medio',
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

  const validateForm = useMemo(
    () => (values: ArticleFormValues): FormErrors => {
      const nextErrors: FormErrors = {};

      if (!values.nombre.trim()) {
        nextErrors.nombre = 'El nombre es obligatorio.';
      }

      if (!values.unidad_medida.trim()) {
        nextErrors.unidad_medida = 'La unidad de medida es obligatoria.';
      }

      if (!Array.isArray(values.especialidades) || values.especialidades.length === 0) {
        nextErrors.especialidades = 'Selecciona al menos una especialidad.';
      }

      return nextErrors;
    },
    []
  );

  const handleFieldChange = <K extends keyof ArticleFormValues>(
    field: K,
    value: ArticleFormValues[K]
  ) => {
    if (field === 'grupo_principal') {
      const grupoPrincipal = value as ArticuloGrupoPrincipal;
      setFormValues((prev) => ({
        ...prev,
        grupo_principal: grupoPrincipal,
        subclasificacion: normalizeSubclasificacion(prev.subclasificacion, grupoPrincipal),
      }));
    } else {
      setFormValues((prev) => ({ ...prev, [field]: value }));
    }

    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setGeneralError('');
  };

  const toggleEspecialidad = (especialidad: ArticuloEspecialidad) => {
    setFormValues((prev) => {
      const exists = prev.especialidades.includes(especialidad);
      const especialidades = exists
        ? prev.especialidades.filter((item) => item !== especialidad)
        : [...prev.especialidades, especialidad];

      return {
        ...prev,
        especialidades,
      };
    });

    setErrors((prev) => ({ ...prev, especialidades: undefined }));
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
      grupo_principal: formValues.grupo_principal,
      nombre: formValues.nombre.trim(),
      marca: formValues.marca.trim(),
      modelo: formValues.modelo.trim(),
      subclasificacion: formValues.subclasificacion,
      especialidades: formValues.especialidades,
      nivel_control: formValues.nivel_control,
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
              : 'Crea equipos y herramientas para que queden disponibles en ingresos y stock.'}
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
            <label className="label-base text-gray-700">Grupo principal *</label>
            <select
              className="w-full border rounded-md p-2"
              value={formValues.grupo_principal}
              onChange={(event) =>
                handleFieldChange('grupo_principal', event.target.value as ArticuloGrupoPrincipal)
              }
            >
              <option value="equipo">Equipo</option>
              <option value="herramienta">Herramienta</option>
            </select>
          </div>

          <div>
            <label className="label-base text-gray-700">Nivel de control *</label>
            <select
              className="w-full border rounded-md p-2"
              value={formValues.nivel_control}
              onChange={(event) =>
                handleFieldChange(
                  'nivel_control',
                  event.target.value as ArticleFormValues['nivel_control']
                )
              }
            >
              <option value="alto">Alto</option>
              <option value="medio">Medio</option>
              <option value="bajo">Bajo</option>
              <option value="fuera_scope">Fuera de scope</option>
            </select>
          </div>

          <div>
            <label className="label-base text-gray-700">Subclasificación *</label>
            <select
              className="w-full border rounded-md p-2"
              value={formValues.subclasificacion}
              onChange={(event) =>
                handleFieldChange('subclasificacion', event.target.value as ArticuloSubclasificacion)
              }
            >
              {SUBCLASIFICACIONES_BY_GRUPO[formValues.grupo_principal].map((option) => (
                <option key={option} value={option}>
                  {SUBCLASIFICACION_LABELS[option]}
                </option>
              ))}
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
            <label className="label-base text-gray-700">Especialidades *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {ESPECIALIDADES_OPTIONS.map((option) => {
                const checked = formValues.especialidades.includes(option.value);
                return (
                  <label key={option.value} className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEspecialidad(option.value)}
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
            {errors.especialidades ? (
              <p className="text-xs text-red-600 mt-1">{errors.especialidades}</p>
            ) : null}
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
