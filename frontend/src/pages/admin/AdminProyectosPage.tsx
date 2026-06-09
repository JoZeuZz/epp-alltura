import React, { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { extractApiError } from '../../lib/apiError';
import Modal from '../../components/Modal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { ResponsiveTable, type TableColumn } from '../../components/layout';
import { useGet } from '../../hooks';
import { post, put } from '../../services/apiService';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type EstadoProyecto = 'activo' | 'inactivo' | 'finalizado';

interface Proyecto {
  id: string;
  nombre: string;
  sitio?: string | null;
  descripcion?: string | null;
  cliente?: string | null;
  presupuesto_clp?: number | null;
  estado: EstadoProyecto;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  creado_en?: string;
}

interface ProyectoFormValues {
  nombre: string;
  sitio: string;
  descripcion: string;
  cliente: string;
  presupuesto_clp: string;
  estado: EstadoProyecto;
  fecha_inicio: string;
  fecha_fin: string;
}

type FormErrors = Partial<Record<keyof ProyectoFormValues, string>>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INITIAL_FORM: ProyectoFormValues = {
  nombre: '',
  sitio: '',
  descripcion: '',
  cliente: '',
  presupuesto_clp: '',
  estado: 'activo',
  fecha_inicio: '',
  fecha_fin: '',
};

const mapToForm = (p?: Proyecto | null): ProyectoFormValues => {
  if (!p) return INITIAL_FORM;
  return {
    nombre:          p.nombre ?? '',
    sitio:           p.sitio ?? '',
    descripcion:     p.descripcion ?? '',
    cliente:         p.cliente ?? '',
    presupuesto_clp: p.presupuesto_clp != null ? String(p.presupuesto_clp) : '',
    estado:          p.estado ?? 'activo',
    fecha_inicio:    p.fecha_inicio ? p.fecha_inicio.slice(0, 10) : '',
    fecha_fin:       p.fecha_fin ? p.fecha_fin.slice(0, 10) : '',
  };
};

const formToPayload = (v: ProyectoFormValues) => ({
  nombre:          v.nombre.trim(),
  sitio:           v.sitio.trim() || null,
  descripcion:     v.descripcion.trim() || null,
  cliente:         v.cliente.trim() || null,
  presupuesto_clp: v.presupuesto_clp !== '' ? parseInt(v.presupuesto_clp, 10) : null,
  estado:          v.estado,
  fecha_inicio:    v.fecha_inicio || null,
  fecha_fin:       v.fecha_fin || null,
});

const formatClp = (value?: number | null): string => {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
};

const ESTADO_COLORS: Record<EstadoProyecto, string> = {
  activo: 'bg-green-100 text-green-700',
  inactivo: 'bg-gray-100 text-gray-700',
  finalizado: 'bg-blue-100 text-blue-700',
};

const ESTADO_LABELS: Record<EstadoProyecto, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  finalizado: 'Finalizado',
};

const validateForm = (v: ProyectoFormValues): FormErrors => {
  const e: FormErrors = {};
  if (!v.nombre.trim()) e.nombre = 'El nombre es obligatorio.';
  else if (v.nombre.trim().length < 2) e.nombre = 'El nombre debe tener al menos 2 caracteres.';
  if (v.presupuesto_clp !== '' && (isNaN(Number(v.presupuesto_clp)) || Number(v.presupuesto_clp) < 0)) {
    e.presupuesto_clp = 'El presupuesto debe ser un número mayor o igual a 0.';
  }
  if (v.fecha_inicio && v.fecha_fin && v.fecha_fin < v.fecha_inicio) {
    e.fecha_fin = 'La fecha de término no puede ser anterior a la fecha de inicio.';
  }
  return e;
};

// ─── Modal formulario ─────────────────────────────────────────────────────────

interface ProyectoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: ProyectoFormValues) => Promise<void>;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
  initialValues?: Proyecto | null;
}

const ProyectoFormModal: React.FC<ProyectoFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  mode,
  initialValues,
}) => {
  const [values, setValues] = useState<ProyectoFormValues>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const isEdit = mode === 'edit';

  React.useEffect(() => {
    if (isOpen) {
      setValues(mapToForm(initialValues));
      setErrors({});
    }
  }, [isOpen, initialValues]);

  const setField = <K extends keyof ProyectoFormValues>(k: K, v: ProyectoFormValues[K]) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formErrors = validateForm(values);
    if (Object.keys(formErrors).length > 0) { setErrors(formErrors); return; }
    try {
      await onSubmit(values);
    } catch (err: unknown) {
      const { message } = extractApiError(err);
      toast.error(message);
    }
  };

  const inputClass = (field: keyof ProyectoFormValues) =>
    `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar Proyecto' : 'Nuevo Proyecto'}>
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            className={inputClass('nombre')}
            placeholder="Ej: Proyecto Planta Norte"
            value={values.nombre}
            onChange={(e) => setField('nombre', e.target.value)}
          />
          {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Sitio
            <span className="text-gray-400 font-normal ml-1">(opcional)</span>
          </label>
          <input
            className={inputClass('sitio')}
            placeholder="Ej: Faena El Teniente"
            value={values.sitio}
            onChange={(e) => setField('sitio', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Cliente
            <span className="text-gray-400 font-normal ml-1">(opcional)</span>
          </label>
          <input
            className={inputClass('cliente')}
            placeholder="Ej: Alltura Servicios Industriales SPA"
            value={values.cliente}
            onChange={(e) => setField('cliente', e.target.value)}
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
            placeholder="Descripción del proyecto"
            value={values.descripcion}
            onChange={(e) => setField('descripcion', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Presupuesto (CLP)
            <span className="text-gray-400 font-normal ml-1">(opcional)</span>
          </label>
          <input
            type="number"
            min="0"
            step="1"
            className={inputClass('presupuesto_clp')}
            placeholder="Ej: 5000000"
            value={values.presupuesto_clp}
            onChange={(e) => setField('presupuesto_clp', e.target.value)}
          />
          {errors.presupuesto_clp && (
            <p className="text-red-500 text-xs mt-1">{errors.presupuesto_clp}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Fecha inicio
              <span className="text-gray-400 font-normal ml-1">(opcional)</span>
            </label>
            <input
              type="date"
              className={inputClass('fecha_inicio')}
              value={values.fecha_inicio}
              onChange={(e) => setField('fecha_inicio', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Fecha término
              <span className="text-gray-400 font-normal ml-1">(opcional)</span>
            </label>
            <input
              type="date"
              className={inputClass('fecha_fin')}
              value={values.fecha_fin}
              onChange={(e) => setField('fecha_fin', e.target.value)}
            />
            {errors.fecha_fin && (
              <p className="text-red-500 text-xs mt-1">{errors.fecha_fin}</p>
            )}
          </div>
        </div>

        {isEdit && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
            <select
              className={inputClass('estado')}
              value={values.estado}
              onChange={(e) => setField('estado', e.target.value as EstadoProyecto)}
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="finalizado">Finalizado</option>
            </select>
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
            {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear Proyecto'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────

interface ConfirmState {
  tipo: 'toggle';
  proyecto: Proyecto;
}

const QUERY_KEY = 'proyectos-admin';

const AdminProyectosPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<EstadoProyecto | 'todos'>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Proyecto | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: rawData, isLoading, error } = useGet<Proyecto[]>(
    QUERY_KEY,
    '/proyectos',
    undefined,
    { placeholderData: keepPreviousData }
  );
  const proyectos: Proyecto[] = rawData ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return proyectos.filter((p) => {
      const matchEstado = filterEstado === 'todos' || p.estado === filterEstado;
      const matchSearch =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        (p.cliente ?? '').toLowerCase().includes(q) ||
        (p.descripcion ?? '').toLowerCase().includes(q);
      return matchEstado && matchSearch;
    });
  }, [proyectos, search, filterEstado]);

  const createMutation = useMutation({
    mutationFn: (payload: ProyectoFormValues) => post<Proyecto>('/proyectos', formToPayload(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['proyectos'] });
      toast.success('Proyecto creado correctamente.');
      setModalOpen(false);
    },
    onError: (err: unknown) => { const { message } = extractApiError(err); toast.error(message); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProyectoFormValues }) =>
      put<Proyecto>(`/proyectos/${id}`, formToPayload(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['proyectos'] });
      toast.success('Proyecto actualizado correctamente.');
      setModalOpen(false);
      setEditTarget(null);
    },
    onError: (err: unknown) => { const { message } = extractApiError(err); toast.error(message); },
  });

  const toggleMutation = useMutation({
    mutationFn: (p: Proyecto) =>
      put<Proyecto>(`/proyectos/${p.id}`, { estado: p.estado === 'activo' ? 'inactivo' : 'activo' }),
    onSuccess: (_data, p) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['proyectos'] });
      toast.success(p.estado === 'activo' ? 'Proyecto desactivado.' : 'Proyecto activado.');
      setConfirmState(null);
    },
    onError: (err: unknown) => { const { message } = extractApiError(err); toast.error(message); },
  });

  const handleFormSubmit = async (values: ProyectoFormValues) => {
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

  const columns: TableColumn<Proyecto>[] = [
    {
      key: 'nombre',
      header: 'Proyecto',
      render: (_v, p) => (
        <div>
          <span className="font-medium text-dark-blue text-sm">{p.nombre}</span>
          {p.cliente && (
            <p className="text-xs text-neutral-gray mt-0.5">{p.cliente}</p>
          )}
        </div>
      ),
    },
    {
      key: 'presupuesto_clp',
      header: 'Presupuesto',
      hideOnMobile: true,
      render: (_v, p) => (
        <span className="text-xs text-gray-700">{formatClp(p.presupuesto_clp)}</span>
      ),
    },
    {
      key: 'fecha_inicio',
      header: 'Período',
      hideOnMobile: true,
      render: (_v, p) => {
        if (!p.fecha_inicio && !p.fecha_fin) return <span className="text-gray-400 text-xs italic">—</span>;
        const inicio = p.fecha_inicio ? p.fecha_inicio.slice(0, 10) : '?';
        const fin = p.fecha_fin ? p.fecha_fin.slice(0, 10) : '?';
        return <span className="text-xs text-gray-600">{inicio} → {fin}</span>;
      },
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (_v, p) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ESTADO_COLORS[p.estado]}`}
        >
          {ESTADO_LABELS[p.estado]}
        </span>
      ),
    },
    {
      key: 'id',
      header: 'Acciones',
      hideOnMobile: true,
      render: (_v, p) => (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setEditTarget(p); setModalOpen(true); }}
            className="px-3 py-1 text-xs rounded-md bg-primary-blue text-white hover:bg-blue-700 transition-colors min-h-[32px]"
          >
            Editar
          </button>
          {p.estado !== 'finalizado' && (
            <button
              onClick={() => setConfirmState({ tipo: 'toggle', proyecto: p })}
              className={`px-3 py-1 text-xs rounded-md transition-colors min-h-[32px] ${
                p.estado === 'activo'
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {p.estado === 'activo' ? 'Desactivar' : 'Activar'}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6" data-tour="admin-proyectos-root">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Proyectos</h1>
          <p className="text-neutral-gray mt-1 text-sm">
            Administra proyectos y frentes de trabajo asociados a la operación.
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-blue text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm flex-shrink-0 min-h-[44px]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Proyecto
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            placeholder="Buscar por nombre o cliente..."
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
            <option value="finalizado">Finalizados</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-blue mx-auto mb-3" />
          <p className="text-neutral-gray text-sm">Cargando proyectos...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-700 text-sm">Error al cargar los proyectos.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-neutral-gray text-sm font-medium">
            {proyectos.length === 0
              ? 'No hay proyectos registrados.'
              : 'No se encontraron proyectos con ese filtro.'}
          </p>
          {proyectos.length === 0 && (
            <button
              onClick={() => { setEditTarget(null); setModalOpen(true); }}
              className="mt-3 px-4 py-2 bg-primary-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Crear primer proyecto
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden" data-tour="admin-proyectos-table">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-sm text-neutral-gray">
              {filtered.length} proyecto{filtered.length !== 1 ? 's' : ''}
              {filterEstado !== 'todos' || search ? ` (filtrado de ${proyectos.length})` : ''}
            </p>
          </div>
          <ResponsiveTable
            columns={columns}
            data={filtered}
            getRowKey={(p) => p.id}
            onRowClick={(p) => navigate(`/ubicacion/proyectos/${p.id}`)}
            rowClassName={() => 'cursor-pointer hover:bg-gray-50 transition-colors'}
            mobileKebab={(p) => [
              { label: 'Editar', onClick: () => { setEditTarget(p); setModalOpen(true); }, variant: 'primary' },
              ...(p.estado !== 'finalizado' ? [{
                label: p.estado === 'activo' ? 'Desactivar' : 'Activar',
                onClick: () => setConfirmState({ tipo: 'toggle', proyecto: p }),
                variant: (p.estado === 'activo' ? 'danger' : 'default') as 'danger' | 'default',
              }] : []),
            ]}
          />
        </div>
      )}

      <ProyectoFormModal
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
        onConfirm={() => confirmState && toggleMutation.mutate(confirmState.proyecto)}
        title={
          confirmState?.proyecto.estado === 'activo'
            ? 'Desactivar proyecto'
            : 'Activar proyecto'
        }
        message={
          confirmState?.proyecto.estado === 'activo'
            ? `¿Desactivar "${confirmState?.proyecto.nombre}"? No estará disponible para nuevas entregas.`
            : `¿Activar "${confirmState?.proyecto.nombre}"?`
        }
        confirmText={confirmState?.proyecto.estado === 'activo' ? 'Desactivar' : 'Activar'}
        variant={confirmState?.proyecto.estado === 'activo' ? 'warning' : 'info'}
      />
    </div>
  );
};

export default AdminProyectosPage;
