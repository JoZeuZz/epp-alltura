import React, { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Modal from '../../components/Modal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { ResponsiveTable, type TableColumn } from '../../components/layout';
import { useGet } from '../../hooks';
import { post, put } from '../../services/apiService';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Bodega {
  id: string;
  nombre: string;
  direccion?: string | null;
  descripcion?: string | null;
  estado: 'activo' | 'inactivo';
  creado_en?: string;
}

interface BodegaFormValues {
  nombre: string;
  direccion: string;
  descripcion: string;
  estado: 'activo' | 'inactivo';
}

type FormErrors = Partial<Record<keyof BodegaFormValues, string>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INITIAL_FORM: BodegaFormValues = {
  nombre: '',
  direccion: '',
  descripcion: '',
  estado: 'activo',
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  const p = error as { response?: { data?: { message?: string } } };
  return p?.response?.data?.message ?? 'No se pudo completar la operación.';
};

const mapToForm = (b?: Bodega | null): BodegaFormValues => {
  if (!b) return INITIAL_FORM;
  return {
    nombre: b.nombre ?? '',
    direccion: b.direccion ?? '',
    descripcion: b.descripcion ?? '',
    estado: b.estado ?? 'activo',
  };
};

const validateForm = (v: BodegaFormValues): FormErrors => {
  const e: FormErrors = {};
  if (!v.nombre.trim()) e.nombre = 'El nombre es obligatorio.';
  else if (v.nombre.trim().length < 2) e.nombre = 'El nombre debe tener al menos 2 caracteres.';
  return e;
};

// ─── Modal formulario ─────────────────────────────────────────────────────────

interface BodegaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: BodegaFormValues) => Promise<void>;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
  initialValues?: Bodega | null;
}

const BodegaFormModal: React.FC<BodegaFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  mode,
  initialValues,
}) => {
  const [values, setValues] = useState<BodegaFormValues>(INITIAL_FORM);
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

  const setField = <K extends keyof BodegaFormValues>(k: K, v: BodegaFormValues[K]) => {
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

  const inputClass = (field: keyof BodegaFormValues) =>
    `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar Bodega' : 'Nueva Bodega'}>
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            className={inputClass('nombre')}
            placeholder="Ej: Bodega Central Santiago"
            value={values.nombre}
            onChange={(e) => setField('nombre', e.target.value)}
          />
          {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
        </div>

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

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Descripción
            <span className="text-gray-400 font-normal ml-1">(opcional)</span>
          </label>
          <textarea
            className={`${inputClass('descripcion')} resize-none`}
            rows={2}
            placeholder="Descripción o notas sobre esta bodega"
            value={values.descripcion}
            onChange={(e) => setField('descripcion', e.target.value)}
          />
        </div>

        {isEdit && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
            <select
              className={inputClass('estado')}
              value={values.estado}
              onChange={(e) => setField('estado', e.target.value as BodegaFormValues['estado'])}
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        )}

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
            {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear Bodega'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

interface ConfirmState {
  tipo: 'toggle';
  bodega: Bodega;
}

const QUERY_KEY = 'bodegas-admin';

const AdminBodegasPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<'activo' | 'inactivo' | 'todos'>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Bodega | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: rawData, isLoading, error } = useGet<Bodega[]>(
    QUERY_KEY,
    '/bodegas',
    undefined,
    { placeholderData: keepPreviousData }
  );
  const bodegas: Bodega[] = rawData ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return bodegas.filter((b) => {
      const matchEstado = filterEstado === 'todos' || b.estado === filterEstado;
      const matchSearch =
        !q ||
        b.nombre.toLowerCase().includes(q) ||
        (b.direccion ?? '').toLowerCase().includes(q) ||
        (b.descripcion ?? '').toLowerCase().includes(q);
      return matchEstado && matchSearch;
    });
  }, [bodegas, search, filterEstado]);

  const createMutation = useMutation({
    mutationFn: (payload: BodegaFormValues) => post<Bodega>('/bodegas', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['bodegas'] });
      toast.success('Bodega creada correctamente.');
      setModalOpen(false);
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<BodegaFormValues> }) =>
      put<Bodega>(`/bodegas/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['bodegas'] });
      toast.success('Bodega actualizada correctamente.');
      setModalOpen(false);
      setEditTarget(null);
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  const toggleMutation = useMutation({
    mutationFn: (b: Bodega) =>
      put<Bodega>(`/bodegas/${b.id}`, { estado: b.estado === 'activo' ? 'inactivo' : 'activo' }),
    onSuccess: (_data, b) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['bodegas'] });
      toast.success(b.estado === 'activo' ? 'Bodega desactivada.' : 'Bodega activada.');
      setConfirmState(null);
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  const handleFormSubmit = async (values: BodegaFormValues) => {
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

  const columns: TableColumn<Bodega>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (_v, b) => (
        <span className="font-medium text-dark-blue text-sm">{b.nombre}</span>
      ),
    },
    {
      key: 'direccion',
      header: 'Dirección',
      hideOnMobile: true,
      render: (_v, b) =>
        b.direccion ? (
          <span className="text-xs text-gray-600">{b.direccion}</span>
        ) : (
          <span className="text-gray-400 text-xs italic">—</span>
        ),
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      hideOnMobile: true,
      render: (_v, b) =>
        b.descripcion ? (
          <span className="text-xs text-gray-600">{b.descripcion}</span>
        ) : (
          <span className="text-gray-400 text-xs italic">—</span>
        ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (_v, b) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            b.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {b.estado === 'activo' ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'id',
      header: 'Acciones',
      hideOnMobile: true,
      render: (_v, b) => (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setEditTarget(b); setModalOpen(true); }}
            className="px-3 py-1 text-xs rounded-md bg-primary-blue text-white hover:bg-blue-700 transition-colors min-h-[32px]"
          >
            Editar
          </button>
          <button
            onClick={() => setConfirmState({ tipo: 'toggle', bodega: b })}
            className={`px-3 py-1 text-xs rounded-md transition-colors min-h-[32px] ${
              b.estado === 'activo'
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {b.estado === 'activo' ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6" data-tour="admin-bodegas-root">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Bodegas</h1>
          <p className="text-neutral-gray mt-1 text-sm">
            Administra las bodegas operativas donde se controla el inventario.
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-blue text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm flex-shrink-0 min-h-[44px]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Bodega
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            placeholder="Buscar por nombre, dirección o descripción..."
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
            <option value="activo">Activas</option>
            <option value="inactivo">Inactivas</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-blue mx-auto mb-3" />
          <p className="text-neutral-gray text-sm">Cargando bodegas...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-700 text-sm">Error al cargar las bodegas.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <p className="text-neutral-gray text-sm font-medium">
            {bodegas.length === 0
              ? 'No hay bodegas registradas.'
              : 'No se encontraron bodegas con ese filtro.'}
          </p>
          {bodegas.length === 0 && (
            <button
              onClick={() => { setEditTarget(null); setModalOpen(true); }}
              className="mt-3 px-4 py-2 bg-primary-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Crear primera bodega
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden" data-tour="admin-bodegas-table">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-sm text-neutral-gray">
              {filtered.length} bodega{filtered.length !== 1 ? 's' : ''}
              {filterEstado !== 'todos' || search ? ` (filtrado de ${bodegas.length})` : ''}
            </p>
          </div>
          <ResponsiveTable
            columns={columns}
            data={filtered}
            getRowKey={(b) => b.id}
            mobileKebab={(b) => [
              { label: 'Editar', onClick: () => { setEditTarget(b); setModalOpen(true); }, variant: 'primary' },
              {
                label: b.estado === 'activo' ? 'Desactivar' : 'Activar',
                onClick: () => setConfirmState({ tipo: 'toggle', bodega: b }),
                variant: b.estado === 'activo' ? 'danger' : 'default',
              },
            ]}
          />
        </div>
      )}

      <BodegaFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        mode={editTarget ? 'edit' : 'create'}
        initialValues={editTarget}
      />

      <ConfirmationModal
        isOpen={confirmState?.tipo === 'toggle'}
        onClose={() => setConfirmState(null)}
        onConfirm={() => confirmState && toggleMutation.mutate(confirmState.bodega)}
        title={confirmState?.bodega.estado === 'activo' ? 'Desactivar bodega' : 'Activar bodega'}
        message={
          confirmState?.bodega.estado === 'activo'
            ? `¿Desactivar "${confirmState?.bodega.nombre}"? No aparecerá en los selectores de nuevos ingresos ni entregas.`
            : `¿Activar "${confirmState?.bodega.nombre}"?`
        }
        confirmText={confirmState?.bodega.estado === 'activo' ? 'Desactivar' : 'Activar'}
        variant={confirmState?.bodega.estado === 'activo' ? 'warning' : 'info'}
      />
    </div>
  );
};

export default AdminBodegasPage;
