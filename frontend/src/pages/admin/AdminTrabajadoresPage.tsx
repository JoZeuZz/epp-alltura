import React, { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import ConfirmationModal from '../../components/ConfirmationModal';
import TrabajadorProfileModal from '../../components/forms/TrabajadorProfileModal';
import { ResponsiveTable, type TableColumn } from '../../components/layout';
import { useGet } from '../../hooks';
import { post, put } from '../../services/apiService';
import { isValidRut, normalizeRut } from '../../utils/rutUtils';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Persona {
  rut: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  email?: string;
  foto_url?: string;
  estado: 'activo' | 'inactivo';
}

interface Trabajador extends Persona {
  id: string;
  persona_id: string;
  usuario_id?: string;
  cargo?: string;
  fecha_ingreso?: string;
  estado: 'activo' | 'inactivo';
  email_login?: string;
}

interface TrabajadorFormValues {
  rut: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  email: string;
  cargo: string;
  fecha_ingreso: string;
  estado: 'activo' | 'inactivo';
}

type FormErrors = Partial<Record<keyof TrabajadorFormValues, string>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INITIAL_FORM: TrabajadorFormValues = {
  rut: '',
  nombres: '',
  apellidos: '',
  telefono: '',
  email: '',
  cargo: '',
  fecha_ingreso: '',
  estado: 'activo',
};

const mapTrabajadorToForm = (t?: Trabajador | null): TrabajadorFormValues => {
  if (!t) return INITIAL_FORM;
  return {
    rut: t.rut ?? '',
    nombres: t.nombres ?? '',
    apellidos: t.apellidos ?? '',
    telefono: t.telefono ?? '',
    email: t.email ?? '',
    cargo: t.cargo ?? '',
    fecha_ingreso: t.fecha_ingreso ? t.fecha_ingreso.slice(0, 10) : '',
    estado: t.estado ?? 'activo',
  };
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  const payload = error as { response?: { data?: { message?: string } } };
  return payload?.response?.data?.message ?? 'No se pudo completar la operación.';
};

const validateForm = (values: TrabajadorFormValues, isEdit: boolean): FormErrors => {
  const errors: FormErrors = {};
  if (!isEdit) {
    if (!values.rut.trim()) {
      errors.rut = 'El RUT es obligatorio.';
    } else if (!isValidRut(values.rut)) {
      errors.rut = 'RUT inválido — verifique el número y el dígito verificador.';
    }
  }
  if (!values.nombres.trim()) errors.nombres = 'Los nombres son obligatorios.';
  if (!values.apellidos.trim()) errors.apellidos = 'Los apellidos son obligatorios.';
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Email no válido.';
  }
  return errors;
};

const estadoBadge = (estado: string) =>
  estado === 'inactivo'
    ? 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700'
    : 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700';

// ─── Subcomponentes ───────────────────────────────────────────────────────────

interface TrabajadorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: TrabajadorFormValues) => Promise<void>;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
  initialValues?: Trabajador | null;
}

const TrabajadorFormModal: React.FC<TrabajadorFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  mode,
  initialValues,
}) => {
  const [values, setValues] = useState<TrabajadorFormValues>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState('');
  const isEdit = mode === 'edit';

  React.useEffect(() => {
    if (isOpen) {
      setValues(mapTrabajadorToForm(initialValues));
      setErrors({});
      setGeneralError('');
    }
  }, [isOpen, initialValues]);

  const setField = <K extends keyof TrabajadorFormValues>(key: K, value: TrabajadorFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formErrors = validateForm(values, isEdit);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    setGeneralError('');
    try {
      await onSubmit(values);
    } catch (err) {
      setGeneralError(toErrorMessage(err));
    }
  };

  const inputClass = (field: keyof TrabajadorFormValues) =>
    `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Trabajador' : 'Nuevo Trabajador'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* RUT */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              RUT {!isEdit && <span className="text-red-500">*</span>}
            </label>
            <input
              className={inputClass('rut')}
              placeholder="12345678-9"
              value={values.rut}
              onChange={(e) => setField('rut', e.target.value)}
              onBlur={(e) => {
                const normalized = normalizeRut(e.target.value);
                if (normalized !== e.target.value) setField('rut', normalized);
              }}
              disabled={isEdit}
            />
            {errors.rut && <p className="text-red-500 text-xs mt-1">{errors.rut}</p>}
          </div>

          {/* Nombres */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nombres <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass('nombres')}
              placeholder="Juan Carlos"
              value={values.nombres}
              onChange={(e) => setField('nombres', e.target.value)}
            />
            {errors.nombres && <p className="text-red-500 text-xs mt-1">{errors.nombres}</p>}
          </div>

          {/* Apellidos */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Apellidos <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass('apellidos')}
              placeholder="González Pérez"
              value={values.apellidos}
              onChange={(e) => setField('apellidos', e.target.value)}
            />
            {errors.apellidos && <p className="text-red-500 text-xs mt-1">{errors.apellidos}</p>}
          </div>

          {/* Cargo */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cargo</label>
            <input
              className={inputClass('cargo')}
              placeholder="Operario de planta"
              value={values.cargo}
              onChange={(e) => setField('cargo', e.target.value)}
            />
          </div>

          {/* Fecha Ingreso */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de Ingreso</label>
            <input
              type="date"
              className={inputClass('fecha_ingreso')}
              value={values.fecha_ingreso}
              onChange={(e) => setField('fecha_ingreso', e.target.value)}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              className={inputClass('email')}
              placeholder="trabajador@empresa.cl"
              value={values.email}
              onChange={(e) => setField('email', e.target.value)}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
            <input
              className={inputClass('telefono')}
              placeholder="+56 9 1234 5678"
              value={values.telefono}
              onChange={(e) => setField('telefono', e.target.value)}
            />
          </div>

          {/* Estado (solo en edición) */}
          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
              <select
                className={inputClass('estado')}
                value={values.estado}
                onChange={(e) => setField('estado', e.target.value as 'activo' | 'inactivo')}
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          )}
        </div>

        {generalError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{generalError}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 rounded-lg bg-primary-blue text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear Trabajador'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

type ActionType = 'toggle' | 'edit';
interface ActionState {
  type: ActionType;
  trabajador: Trabajador;
}

const QUERY_KEY = 'trabajadores';

const AdminTrabajadoresPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Trabajador | null>(null);
  const [confirmAction, setConfirmAction] = useState<ActionState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  // ── Deep-link: ?perfil=<trabajadorId> abre modal automáticamente
  useEffect(() => {
    const perfilParam = searchParams.get('perfil');
    if (perfilParam) {
      setProfileId(perfilParam);
      searchParams.delete('perfil');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const { data: rawData, isLoading, error } = useGet<Trabajador[]>(
    QUERY_KEY,
    '/trabajadores',
    undefined,
    { placeholderData: keepPreviousData }
  );
  const trabajadores: Trabajador[] = rawData ?? [];

  // ── Filtros ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return trabajadores.filter((t) => {
      const matchEstado = filterEstado === 'todos' || t.estado === filterEstado;
      const matchSearch =
        !q ||
        `${t.nombres} ${t.apellidos}`.toLowerCase().includes(q) ||
        (t.rut ?? '').toLowerCase().includes(q) ||
        (t.cargo ?? '').toLowerCase().includes(q);
      return matchEstado && matchSearch;
    });
  }, [trabajadores, search, filterEstado]);

  // ── Mutación crear ────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: TrabajadorFormValues) => post<Trabajador>('/trabajadores', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Trabajador creado correctamente.');
      setModalOpen(false);
    },
    onError: (err) => {
      toast.error(toErrorMessage(err));
    },
  });

  // ── Mutación actualizar ───────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TrabajadorFormValues }) =>
      put<Trabajador>(`/trabajadores/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Trabajador actualizado correctamente.');
      setModalOpen(false);
      setEditTarget(null);
    },
    onError: (err) => {
      toast.error(toErrorMessage(err));
    },
  });

  // ── Mutación toggle estado ────────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: ({ t }: { t: Trabajador }) =>
      put<Trabajador>(`/trabajadores/${t.id}`, {
        estado: t.estado === 'activo' ? 'inactivo' : 'activo',
      }),
    onSuccess: (_, { t }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      const accion = t.estado === 'activo' ? 'desactivado' : 'activado';
      toast.success(`Trabajador ${accion} correctamente.`);
      setConfirmAction(null);
    },
    onError: (err) => {
      toast.error(toErrorMessage(err));
      setConfirmAction(null);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (t: Trabajador) => {
    setEditTarget(t);
    setModalOpen(true);
  };

  const handleFormSubmit = async (values: TrabajadorFormValues) => {
    setIsSubmitting(true);
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, payload: values });
      } else {
        await createMutation.mutateAsync(values);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmToggle = () => {
    if (!confirmAction || confirmAction.type !== 'toggle') return;
    toggleMutation.mutate({ t: confirmAction.trabajador });
  };

  // ── Columnas ──────────────────────────────────────────────────────────────
  const columns: TableColumn<Trabajador>[] = [
    {
      key: 'nombres',
      header: 'Trabajador',
      render: (_v, t) => (
        <div>
          <p className="font-medium text-dark-blue text-sm">
            {t.nombres} {t.apellidos}
          </p>
          <p className="text-neutral-gray text-xs">RUT: {t.rut ?? '-'}</p>
        </div>
      ),
    },
    {
      key: 'cargo',
      header: 'Cargo',
      render: (_v, t) => (
        <div>
          <p className="text-sm">{t.cargo || <span className="text-gray-400 italic">Sin cargo</span>}</p>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Contacto',
      render: (_v, t) => (
        <div>
          {t.email && <p className="text-xs text-gray-600">{t.email}</p>}
          {t.telefono && <p className="text-xs text-gray-500">{t.telefono}</p>}
          {!t.email && !t.telefono && <span className="text-gray-400 text-xs italic">—</span>}
        </div>
      ),
    },
    {
      key: 'fecha_ingreso',
      header: 'Ingreso',
      render: (_v, t) =>
        t.fecha_ingreso ? (
          <span className="text-xs text-gray-600">
            {new Date(t.fecha_ingreso).toLocaleDateString('es-CL')}
          </span>
        ) : (
          <span className="text-gray-400 text-xs italic">—</span>
        ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (_v, t) => (
        <span className={estadoBadge(t.estado)}>
          {t.estado === 'activo' ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'id',
      header: 'Acciones',
      render: (_v, t) => (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setProfileId(t.id)}
            className="px-3 py-1 text-xs rounded-md bg-gray-50 text-blue-700 hover:bg-blue-50 border border-blue-200 transition-colors min-h-[32px]"
          >
            Ver perfil
          </button>
          <button
            onClick={() => handleOpenEdit(t)}
            className="px-3 py-1 text-xs rounded-md bg-primary-blue text-white hover:bg-blue-700 transition-colors min-h-[32px]"
          >
            Editar
          </button>
          <button
            onClick={() => setConfirmAction({ type: 'toggle', trabajador: t })}
            className={`px-3 py-1 text-xs rounded-md transition-colors min-h-[32px] ${
              t.estado === 'activo'
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {t.estado === 'activo' ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Trabajadores</h1>
          <p className="text-neutral-gray mt-1 text-sm">
            Gestiona el personal que recibe EPP y herramientas.
          </p>
        </div>
        <button
          data-tour="new-trabajador"
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-blue text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm flex-shrink-0 min-h-[44px]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Trabajador
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            placeholder="Buscar por nombre, RUT o cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
          />
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as typeof filterEstado)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
          >
            <option value="todos">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-blue mx-auto mb-3" />
          <p className="text-neutral-gray text-sm">Cargando trabajadores...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-700 text-sm">Error al cargar los trabajadores.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.655-.084-1.289-.241-1.892M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.655.084-1.289.241-1.892m0 0a5.002 5.002 0 019.518 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-neutral-gray text-sm font-medium">
            {trabajadores.length === 0
              ? 'No hay trabajadores registrados.'
              : 'No se encontraron trabajadores con ese filtro.'}
          </p>
          {trabajadores.length === 0 && (
            <button
              onClick={handleOpenCreate}
              className="mt-3 px-4 py-2 bg-primary-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Crear primer trabajador
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm text-neutral-gray">
              {filtered.length} trabajador{filtered.length !== 1 ? 'es' : ''}
              {filterEstado !== 'todos' || search ? ` (filtrado de ${trabajadores.length})` : ''}
            </p>
          </div>
          <ResponsiveTable columns={columns} data={filtered} getRowKey={(t) => t.id} />
        </div>
      )}

      {/* Modal crear/editar */}
      <TrabajadorFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditTarget(null);
        }}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        mode={editTarget ? 'edit' : 'create'}
        initialValues={editTarget}
      />

      {/* Modal confirmar toggle estado */}
      <ConfirmationModal
        isOpen={confirmAction?.type === 'toggle'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmToggle}
        title={
          confirmAction?.trabajador.estado === 'activo'
            ? 'Desactivar trabajador'
            : 'Activar trabajador'
        }
        message={
          confirmAction?.trabajador.estado === 'activo'
            ? `¿Desactivar a ${confirmAction?.trabajador.nombres} ${confirmAction?.trabajador.apellidos}? No podrá ser seleccionado en nuevas entregas.`
            : `¿Activar a ${confirmAction?.trabajador.nombres} ${confirmAction?.trabajador.apellidos}?`
        }
        confirmText={confirmAction?.trabajador.estado === 'activo' ? 'Desactivar' : 'Activar'}
        variant={confirmAction?.trabajador.estado === 'activo' ? 'danger' : 'info'}
      />

      {/* Modal perfil trabajador */}
      {profileId && (
        <TrabajadorProfileModal
          trabajadorId={profileId}
          onClose={() => setProfileId(null)}
        />
      )}
    </div>
  );
};

export default AdminTrabajadoresPage;
