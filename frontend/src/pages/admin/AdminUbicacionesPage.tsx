 import React, { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { ResponsiveTable, type TableColumn } from '../../components/layout';
import { useGet } from '../../hooks';
import { post, put } from '../../services/apiService';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoUbicacion = 'bodega' | 'planta' | 'proyecto' | 'taller_mantencion';
type EstadoUbicacion = 'activo' | 'inactivo';
type TipoUbicacionOperativa = 'bodega' | 'planta';

interface Ubicacion {
  id: string;
  nombre: string;
  tipo: TipoUbicacion;
  cliente?: string | null;
  direccion?: string | null;
  estado: EstadoUbicacion;
  creado_en?: string;
}

interface UbicacionFormValues {
  nombre: string;
  tipo: TipoUbicacion;
  cliente: string;
  direccion: string;
  estado: EstadoUbicacion;
}

type FormErrors = Partial<Record<keyof UbicacionFormValues, string>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INITIAL_FORM: UbicacionFormValues = {
  nombre: '',
  tipo: 'bodega',
  cliente: '',
  direccion: '',
  estado: 'activo',
};

const TIPO_LABELS: Record<TipoUbicacion, string> = {
  bodega: 'Bodega',
  planta: 'Planta',
  proyecto: 'Proyecto',
  taller_mantencion: 'Taller Mantención',
};

const TIPO_COLORS: Record<TipoUbicacion, string> = {
  bodega: 'bg-blue-100 text-blue-700',
  planta: 'bg-purple-100 text-purple-700',
  proyecto: 'bg-orange-100 text-orange-700',
  taller_mantencion: 'bg-yellow-100 text-yellow-700',
};

const TIPO_FORM_LABELS: Record<TipoUbicacionOperativa, string> = {
  bodega: 'Bodega',
  planta: 'Planta',
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  const p = error as { response?: { data?: { message?: string } } };
  return p?.response?.data?.message ?? 'No se pudo completar la operación.';
};

const mapToForm = (u?: Ubicacion | null): UbicacionFormValues => {
  if (!u) return INITIAL_FORM;
  return {
    nombre: u.nombre ?? '',
    tipo: u.tipo ?? 'bodega',
    cliente: u.cliente ?? '',
    direccion: u.direccion ?? '',
    estado: u.estado ?? 'activo',
  };
};

const validateForm = (v: UbicacionFormValues): FormErrors => {
  const e: FormErrors = {};
  if (!v.nombre.trim()) e.nombre = 'El nombre es obligatorio.';
  if (!v.tipo) e.tipo = 'El tipo es obligatorio.';
  return e;
};

// ─── Modal formulario ─────────────────────────────────────────────────────────

interface UbicacionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: UbicacionFormValues) => Promise<void>;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
  initialValues?: Ubicacion | null;
}

const UbicacionFormModal: React.FC<UbicacionFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  mode,
  initialValues,
}) => {
  const [values, setValues] = useState<UbicacionFormValues>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState('');
  const isEdit = mode === 'edit';

  React.useEffect(() => {
    if (isOpen) {
      setValues(mapToForm(initialValues));
      setErrors({});
      setGeneralError('');
    }
  }, [isOpen, initialValues]);

  const setField = <K extends keyof UbicacionFormValues>(k: K, v: UbicacionFormValues[K]) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formErrors = validateForm(values);
    if (Object.keys(formErrors).length > 0) { setErrors(formErrors); return; }
    setGeneralError('');
    try {
      await onSubmit(values);
    } catch (err) {
      setGeneralError(toErrorMessage(err));
    }
  };

  const inputClass = (field: keyof UbicacionFormValues) =>
    `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Ubicación' : 'Nueva Ubicación'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        {/* Nombre */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            className={inputClass('nombre')}
            placeholder="Ej: Bodega Central Planta Santiago"
            value={values.nombre}
            onChange={(e) => setField('nombre', e.target.value)}
          />
          {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Tipo <span className="text-red-500">*</span>
            </label>
            <select
              className={inputClass('tipo')}
              value={values.tipo}
              onChange={(e) => setField('tipo', e.target.value as TipoUbicacion)}
            >
              {(Object.entries(TIPO_FORM_LABELS) as [TipoUbicacionOperativa, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
              {values.tipo === 'proyecto' && <option value="proyecto">Proyecto</option>}
              {values.tipo === 'taller_mantencion' && (
                <option value="taller_mantencion">Taller Mantención</option>
              )}
            </select>
            {errors.tipo && <p className="text-red-500 text-xs mt-1">{errors.tipo}</p>}
          </div>

          {/* Estado (solo en edición) */}
          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
              <select
                className={inputClass('estado')}
                value={values.estado}
                onChange={(e) => setField('estado', e.target.value as EstadoUbicacion)}
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          )}
        </div>

        {/* Cliente */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Cliente / Empresa
            <span className="text-gray-400 font-normal ml-1">(opcional)</span>
          </label>
          <input
            className={inputClass('cliente')}
            placeholder="Ej: Alltura Servicios Industriales SPA"
            value={values.cliente}
            onChange={(e) => setField('cliente', e.target.value)}
          />
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Dirección
            <span className="text-gray-400 font-normal ml-1">(opcional)</span>
          </label>
          <textarea
            className={`${inputClass('direccion')} resize-none`}
            rows={2}
            placeholder="Av. Los Industriales 1234, Quilicura, Santiago"
            value={values.direccion}
            onChange={(e) => setField('direccion', e.target.value)}
          />
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
            {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear Ubicación'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

interface ConfirmState {
  tipo: 'toggle';
  ubicacion: Ubicacion;
}

const QUERY_KEY = 'ubicaciones-admin';

const AdminUbicacionesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<TipoUbicacion | 'todos'>('todos');
  const [filterEstado, setFilterEstado] = useState<EstadoUbicacion | 'todos'>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Ubicacion | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const { data: rawData, isLoading, error } = useGet<Ubicacion[]>(
    QUERY_KEY,
    '/ubicaciones',
    undefined,
    { placeholderData: keepPreviousData }
  );
  const ubicaciones: Ubicacion[] = rawData ?? [];

  // ── Filtros ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ubicaciones.filter((u) => {
      const matchTipo = filterTipo === 'todos' || u.tipo === filterTipo;
      const matchEstado = filterEstado === 'todos' || u.estado === filterEstado;
      const matchSearch =
        !q ||
        u.nombre.toLowerCase().includes(q) ||
        (u.cliente ?? '').toLowerCase().includes(q) ||
        (u.direccion ?? '').toLowerCase().includes(q);
      return matchTipo && matchEstado && matchSearch;
    });
  }, [ubicaciones, search, filterTipo, filterEstado]);

  // ── Mutaciones ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: UbicacionFormValues) => post<Ubicacion>('/ubicaciones', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      // Invalidar también el cache que usa el modal de ingresos
      queryClient.invalidateQueries({ queryKey: ['admin-inventory', 'ubicaciones'] });
      queryClient.invalidateQueries({ queryKey: ['ubicaciones'] });
      toast.success('Ubicación creada correctamente.');
      setModalOpen(false);
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<UbicacionFormValues> }) =>
      put<Ubicacion>(`/ubicaciones/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory', 'ubicaciones'] });
      queryClient.invalidateQueries({ queryKey: ['ubicaciones'] });
      toast.success('Ubicación actualizada correctamente.');
      setModalOpen(false);
      setEditTarget(null);
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  const toggleMutation = useMutation({
    mutationFn: (u: Ubicacion) =>
      put<Ubicacion>(`/ubicaciones/${u.id}`, {
        estado: u.estado === 'activo' ? 'inactivo' : 'activo',
      }),
    onSuccess: (_, u) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory', 'ubicaciones'] });
      queryClient.invalidateQueries({ queryKey: ['ubicaciones'] });
      toast.success(`Ubicación ${u.estado === 'activo' ? 'desactivada' : 'activada'}.`);
      setConfirmState(null);
    },
    onError: (err) => {
      toast.error(toErrorMessage(err));
      setConfirmState(null);
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleFormSubmit = async (values: UbicacionFormValues) => {
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

  // ── Columnas ───────────────────────────────────────────────────────────────
  const columns: TableColumn<Ubicacion>[] = [
    {
      key: 'nombre',
      header: 'Ubicación',
      render: (_v, u) => (
        <div>
          <p className="font-medium text-dark-blue text-sm">{u.nombre}</p>
          {u.cliente && <p className="text-neutral-gray text-xs">{u.cliente}</p>}
        </div>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (_v, u) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TIPO_COLORS[u.tipo]}`}>
          {TIPO_LABELS[u.tipo]}
        </span>
      ),
    },
    {
      key: 'direccion',
      header: 'Dirección',
      hideOnMobile: true,
      render: (_v, u) =>
        u.direccion ? (
          <span className="text-xs text-gray-600">{u.direccion}</span>
        ) : (
          <span className="text-gray-400 text-xs italic">—</span>
        ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (_v, u) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            u.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {u.estado === 'activo' ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'id',
      header: 'Acciones',
      render: (_v, u) => (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setEditTarget(u); setModalOpen(true); }}
            className="px-3 py-1 text-xs rounded-md bg-primary-blue text-white hover:bg-blue-700 transition-colors min-h-[32px]"
          >
            Editar
          </button>
          <button
            onClick={() => setConfirmState({ tipo: 'toggle', ubicacion: u })}
            className={`px-3 py-1 text-xs rounded-md transition-colors min-h-[32px] ${
              u.estado === 'activo'
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {u.estado === 'activo' ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Ubicaciones</h1>
          <p className="text-neutral-gray mt-1 text-sm">
            Bodegas y plantas donde se almacenan o usan equipos y herramientas.
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-blue text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm flex-shrink-0 min-h-[44px]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Ubicación
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            placeholder="Buscar por nombre, cliente o dirección..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
          />
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value as TipoUbicacion | 'todos')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
          >
            <option value="todos">Todos los tipos</option>
            {(Object.entries(TIPO_LABELS) as [TipoUbicacion, string][]).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as EstadoUbicacion | 'todos')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue"
          >
            <option value="todos">Todos los estados</option>
            <option value="activo">Activas</option>
            <option value="inactivo">Inactivas</option>
          </select>
        </div>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-blue mx-auto mb-3" />
          <p className="text-neutral-gray text-sm">Cargando ubicaciones...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-700 text-sm">Error al cargar las ubicaciones.</p>
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
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-neutral-gray text-sm font-medium">
            {ubicaciones.length === 0
              ? 'No hay ubicaciones registradas.'
              : 'No se encontraron ubicaciones con ese filtro.'}
          </p>
          {ubicaciones.length === 0 && (
            <button
              onClick={() => { setEditTarget(null); setModalOpen(true); }}
              className="mt-3 px-4 py-2 bg-primary-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Crear primera ubicación
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-sm text-neutral-gray">
              {filtered.length} ubicacion{filtered.length !== 1 ? 'es' : ''}
              {filterTipo !== 'todos' || filterEstado !== 'todos' || search
                ? ` (filtrado de ${ubicaciones.length})`
                : ''}
            </p>
          </div>
          <ResponsiveTable
            columns={columns}
            data={filtered}
            getRowKey={(u) => u.id}
          />
        </div>
      )}

      {/* Modal crear/editar */}
      <UbicacionFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        mode={editTarget ? 'edit' : 'create'}
        initialValues={editTarget}
      />

      {/* Modal confirmar toggle */}
      <ConfirmationModal
        isOpen={confirmState?.tipo === 'toggle'}
        onClose={() => setConfirmState(null)}
        onConfirm={() => confirmState && toggleMutation.mutate(confirmState.ubicacion)}
        title={
          confirmState?.ubicacion.estado === 'activo'
            ? 'Desactivar ubicación'
            : 'Activar ubicación'
        }
        message={
          confirmState?.ubicacion.estado === 'activo'
            ? `¿Desactivar "${confirmState?.ubicacion.nombre}"? No aparecerá en los selectores de nuevos ingresos ni entregas.`
            : `¿Activar "${confirmState?.ubicacion.nombre}"?`
        }
        confirmText={confirmState?.ubicacion.estado === 'activo' ? 'Desactivar' : 'Activar'}
        variant={confirmState?.ubicacion.estado === 'activo' ? 'warning' : 'info'}
      />
    </div>
  );
};

export default AdminUbicacionesPage;
