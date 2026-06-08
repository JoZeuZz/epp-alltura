import React, { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ConfirmationModal from '../../components/ConfirmationModal';
import { extractApiError } from '../../lib/apiError';
import Modal from '../../components/Modal';
import { EntityCard } from '../../components/cards';
import { ResponsiveTable, type TableColumn } from '../../components/layout';
import { FormButtons } from '../../components/forms/FormInputs';
import { useAuth, useBreakpoints, useDelete, useGet, usePost, usePut } from '../../hooks';
import type { User } from '../../types/api';
import type { UserCreatePayload, UserRole, UserUpdatePayload } from '../../services/apiService';
import { formatNameParts } from '../../utils/name';

// ─── Types ────────────────────────────────────────────────────────────────────

type UserStatus = 'activo' | 'inactivo' | 'bloqueado';
type FilterRole = 'all' | 'admin' | 'supervisor';

interface UserRecord extends User {
  estado?: UserStatus;
}

interface UserDeleteResult {
  id: string;
  estado?: UserStatus | 'eliminado';
  action: 'deleted' | 'deactivated';
  reason?: string;
}

interface UserFormValues {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  estado: UserStatus;
  rut: string;
  phone_number: string;
}

type UserFormErrors = Partial<Record<keyof UserFormValues, string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'admin', label: 'Administrador' },
  { value: 'supervisor', label: 'Supervisor' },
];

const STATUS_OPTIONS: Array<{ value: UserStatus; label: string }> = [
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
  { value: 'bloqueado', label: 'Bloqueado' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM: UserFormValues = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'supervisor',
  estado: 'activo',
  rut: '',
  phone_number: '',
};

// ─── Shared form CSS — mirrors FormInput/FormSelect styling exactly ───────────

const inputCls = (hasError: boolean) =>
  [
    'shadow-sm border rounded-lg w-full py-2.5 px-3 body-base text-content-secondary leading-tight min-h-[44px]',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
    'disabled:bg-surface-overlay disabled:cursor-not-allowed disabled:text-content-muted',
    'transition-colors',
    hasError ? 'border-danger focus:ring-danger focus:border-danger' : 'border-edge-strong',
  ].join(' ');

const LABEL_CLS = 'block label-base text-content-secondary mb-1.5';
const ERROR_CLS = 'mt-1 body-small text-danger-text';
const HELP_CLS  = 'mt-1 body-small text-content-muted';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isTemporaryRut = (value?: string | null): boolean =>
  String(value || '').trim().toUpperCase().startsWith('TMP-');

const getDisplayRut = (value?: string | null): string => {
  const n = String(value || '').trim();
  return !n || isTemporaryRut(n) ? '' : n;
};

const normalizeRole = (role?: string | null): Exclude<FilterRole, 'all'> | null =>
  role === 'admin' || role === 'supervisor' ? role : null;

const formatRoleLabel = (role?: string | null): string => {
  const r = normalizeRole(role);
  if (r === 'admin') return 'Administrador';
  if (r === 'supervisor') return 'Supervisor';
  return 'Sin rol válido';
};

const formatStatusLabel = (status?: string | null): string => {
  if (status === 'inactivo') return 'Inactivo';
  if (status === 'bloqueado') return 'Bloqueado';
  return 'Activo';
};

// Badge CSS using design-system classes
const roleBadgeCls = (role?: string | null): string => {
  const r = normalizeRole(role);
  if (r === 'admin') return 'badge badge-danger';
  if (r === 'supervisor') return 'badge badge-info';
  return 'badge badge-default';
};

const statusBadgeCls = (status?: string | null): string => {
  if (status === 'inactivo') return 'badge badge-default';
  if (status === 'bloqueado') return 'badge badge-warning';
  return 'badge badge-success';
};

const buildFormFromUser = (user: UserRecord): UserFormValues => ({
  first_name: user.first_name || '',
  last_name: user.last_name || '',
  email: user.email || '',
  password: '',
  confirmPassword: '',
  role: normalizeRole(user.role) || 'supervisor',
  estado: user.estado || 'activo',
  rut: getDisplayRut(user.rut),
  phone_number: user.phone_number || '',
});

const validateForm = (values: UserFormValues, isEditing: boolean): UserFormErrors => {
  const errors: UserFormErrors = {};
  if (!values.first_name.trim()) errors.first_name = 'El nombre es obligatorio.';
  if (!values.last_name.trim()) errors.last_name = 'El apellido es obligatorio.';
  if (!values.email.trim()) {
    errors.email = 'El email es obligatorio.';
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = 'El formato de email no es válido.';
  }
  if (!isEditing && !values.password.trim()) {
    errors.password = 'La contraseña es obligatoria para crear usuarios.';
  }
  if (values.password && values.password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (values.password && values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden.';
  }
  return errors;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Consistent form field wrapper with label, error and help text */
const FormField: React.FC<{
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  children: React.ReactNode;
}> = ({ id, label, required, error, helpText, children }) => (
  <div>
    <label htmlFor={id} className={LABEL_CLS}>
      {label}
      {required && (
        <span className="text-danger ml-1" aria-label="requerido">*</span>
      )}
    </label>
    {children}
    {error && (
      <p id={`${id}-error`} className={ERROR_CLS} role="alert">{error}</p>
    )}
    {!error && helpText && (
      <p id={`${id}-help`} className={HELP_CLS}>{helpText}</p>
    )}
  </div>
);

/** Role filter counter card with aria-pressed and accessible focus ring */
const RoleCounterCard: React.FC<{
  label: string;
  count: number;
  active: boolean;
  variant: 'default' | 'admin' | 'supervisor';
  onClick: () => void;
}> = ({ label, count, active, variant, onClick }) => {
  const activeCls = {
    default:    'bg-primary     border-primary     text-white ring-2 ring-primary/30',
    admin:      'bg-danger      border-danger      text-white ring-2 ring-danger/30',
    supervisor: 'bg-info        border-info        text-white ring-2 ring-info/30',
  }[variant];

  const inactiveCls =
    'bg-surface border-edge text-content-primary hover:bg-surface-muted hover:border-edge-strong';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl p-4 text-left border transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        ${active ? activeCls : inactiveCls}`}
    >
      <p className={`text-[11px] font-semibold uppercase tracking-widest mb-1 ${active ? 'text-white/80' : 'text-content-muted'}`}>
        {label}
      </p>
      <p className="text-2xl font-bold leading-none">{count}</p>
    </button>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { isMobile } = useBreakpoints();
  const [searchTerm, setSearchTerm]     = useState('');
  const [roleFilter, setRoleFilter]     = useState<FilterRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [isFormModalOpen, setIsFormModalOpen]   = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingUser, setEditingUser]     = useState<UserRecord | null>(null);
  const [userToDelete, setUserToDelete]   = useState<UserRecord | null>(null);
  const [formValues, setFormValues]       = useState<UserFormValues>(EMPTY_FORM);
  const [formErrors, setFormErrors]       = useState<UserFormErrors>({});

  const { data: users = [], isLoading, error } = useGet<UserRecord[]>('admin-users', '/users');

  const createUser = usePost<UserRecord, UserCreatePayload>('admin-users', '/users');
  const updateUser = usePut<UserRecord, UserUpdatePayload>('admin-users', '/users');
  const removeUser = useDelete<UserDeleteResult>('admin-users', '/users');

  const isSaving   = createUser.isPending || updateUser.isPending;
  const isDeleting = removeUser.isPending;

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return users.filter((u) => {
      const matchesRole   = roleFilter === 'all' || normalizeRole(u.role) === roleFilter;
      const matchesStatus = statusFilter === 'all' || (u.estado || 'activo') === statusFilter;
      const fullName      = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
      const matchesSearch =
        !q ||
        fullName.includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        getDisplayRut(u.rut).toLowerCase().includes(q);
      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [roleFilter, searchTerm, statusFilter, users]);

  const userCounters = useMemo(
    () =>
      users.reduce(
        (acc, u) => {
          const r = normalizeRole(u.role);
          acc.total += 1;
          if (r) acc[r] += 1;
          return acc;
        },
        { total: 0, admin: 0, supervisor: 0 }
      ),
    [users]
  );

  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'all';

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
  }, []);

  const resetForm = useCallback(() => {
    setFormValues(EMPTY_FORM);
    setFormErrors({});
    setEditingUser(null);
  }, []);

  const openCreateModal = useCallback(() => { resetForm(); setIsFormModalOpen(true); }, [resetForm]);
  const openEditModal   = useCallback((u: UserRecord) => {
    setEditingUser(u);
    setFormValues(buildFormFromUser(u));
    setFormErrors({});
    setIsFormModalOpen(true);
  }, []);
  const closeFormModal = useCallback(() => { setIsFormModalOpen(false); resetForm(); }, [resetForm]);

  const openDeleteModal  = useCallback((u: UserRecord) => { setUserToDelete(u); setIsDeleteModalOpen(true); }, []);
  const closeDeleteModal = useCallback(() => { setUserToDelete(null); setIsDeleteModalOpen(false); }, []);

  const handleInputChange = useCallback((field: keyof UserFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const handleSubmitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isEditing = Boolean(editingUser);
    const errors = validateForm(formValues, isEditing);
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    const payloadBase = {
      first_name:   formValues.first_name.trim(),
      last_name:    formValues.last_name.trim(),
      email:        formValues.email.trim().toLowerCase(),
      role:         formValues.role,
      rut:          formValues.rut.trim(),
      phone_number: formValues.phone_number.trim(),
    };

    try {
      if (isEditing && editingUser) {
        const payload: UserUpdatePayload = { id: editingUser.id, ...payloadBase, estado: formValues.estado };
        if (formValues.password.trim()) payload.password = formValues.password;
        await updateUser.mutateAsync(payload);
        toast.success('Usuario actualizado correctamente.');
      } else {
        await createUser.mutateAsync({ ...payloadBase, password: formValues.password });
        toast.success('Usuario creado correctamente.');
      }
      closeFormModal();
    } catch (err: unknown) {
      const { message } = extractApiError(err);
      toast.error(message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    if (currentUser?.id === userToDelete.id) {
      toast.error('No puedes eliminar tu propio usuario administrador.');
      closeDeleteModal();
      return;
    }
    try {
      const result = await removeUser.mutateAsync(userToDelete.id);
      toast.success(
        result.action === 'deleted'
          ? 'Usuario eliminado correctamente.'
          : 'Usuario desactivado por tener asignaciones.'
      );
      closeDeleteModal();
    } catch (err: unknown) {
      const { message } = extractApiError(err);
      toast.error(message);
    }
  };

  // ─── Table columns ──────────────────────────────────────────────────────────

  const columns = useMemo<TableColumn<UserRecord>[]>(
    () => [
      {
        key: 'full_name',
        header: 'Nombre',
        render: (_v, row) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-content-primary">
              {formatNameParts(row.first_name, row.last_name)}
            </span>
            {getDisplayRut(row.rut) && (
              <span className="text-xs text-content-muted">{getDisplayRut(row.rut)}</span>
            )}
          </div>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        hideOnMobile: true,
        render: (v) => <span className="text-content-secondary">{v}</span>,
      },
      {
        key: 'role',
        header: 'Rol',
        render: (v) => (
          <span className={roleBadgeCls(String(v))}>
            {formatRoleLabel(String(v))}
          </span>
        ),
      },
      {
        key: 'estado',
        header: 'Estado',
        render: (v) => (
          <span className={statusBadgeCls(String(v || 'activo'))}>
            {formatStatusLabel(String(v || 'activo'))}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        hideOnMobile: true,
        render: (_v, row) => {
          const isSelf = currentUser?.id === row.id;
          return (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
                className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary hover:bg-primary/20
                  transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openDeleteModal(row); }}
                disabled={isSelf}
                title={isSelf ? 'No puedes eliminar tu propio usuario' : 'Eliminar usuario'}
                className="px-3 py-1 text-xs font-medium rounded-full bg-danger-subtle text-danger-text hover:bg-danger-border
                  transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-1
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-danger-subtle"
              >
                Eliminar
              </button>
            </div>
          );
        },
      },
    ],
    [currentUser?.id, openDeleteModal, openEditModal]
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Page header */}
      <section className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4" data-tour="admin-users-root">
        <div className="space-y-1">
          <h1 className="heading-2 text-content-primary">Usuarios del Sistema</h1>
          <p className="body-small text-content-muted">
            Gestión de cuentas con acceso a la plataforma y asignación de roles operativos.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white font-medium text-sm
            hover:bg-primary-hover transition-colors shadow-card hover:shadow-card-hover
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
            self-start sm:self-auto shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Crear Usuario
        </button>
      </section>

      {/* Role filter + counters */}
      <section aria-label="Filtros por rol" className="grid grid-cols-3 gap-3" data-tour="admin-users-role-filters">
        <RoleCounterCard
          label="Total"
          count={userCounters.total}
          active={roleFilter === 'all'}
          variant="default"
          onClick={() => setRoleFilter('all')}
        />
        <RoleCounterCard
          label="Admin"
          count={userCounters.admin}
          active={roleFilter === 'admin'}
          variant="admin"
          onClick={() => setRoleFilter('admin')}
        />
        <RoleCounterCard
          label="Supervisor"
          count={userCounters.supervisor}
          active={roleFilter === 'supervisor'}
          variant="supervisor"
          onClick={() => setRoleFilter('supervisor')}
        />
      </section>

      {/* Search + status filter bar */}
      <section aria-label="Búsqueda y filtros" className="bg-surface rounded-xl shadow-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-content-muted" aria-hidden="true">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, email o RUT…"
              aria-label="Buscar usuarios"
              className="w-full pl-9 pr-3 py-2.5 border border-edge-strong rounded-lg body-base text-content-secondary
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | UserStatus)}
            aria-label="Filtrar por estado"
            className="border border-edge-strong rounded-lg py-2.5 px-3 body-base text-content-secondary
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors
              sm:w-44"
          >
            <option value="all">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="bloqueado">Bloqueado</option>
          </select>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-content-secondary
                hover:text-content-primary border border-edge rounded-lg hover:bg-surface-muted transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1
                shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar
            </button>
          )}
        </div>

        {/* Results count */}
        {!isLoading && (
          <p className="mt-3 body-small text-content-muted" aria-live="polite" aria-atomic="true">
            {filteredUsers.length === users.length
              ? `${users.length} usuario${users.length !== 1 ? 's' : ''}`
              : `${filteredUsers.length} de ${users.length} usuario${users.length !== 1 ? 's' : ''}`}
          </p>
        )}
      </section>

      {/* Error state */}
      {error && (
        <section
          role="alert"
          className="flex items-start gap-3 bg-danger-subtle border border-danger-border rounded-xl p-4"
        >
          <svg className="w-5 h-5 text-danger shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="label-base text-danger-text font-semibold">Error al cargar usuarios</p>
            <p className="body-small text-danger-text mt-0.5">{extractApiError(error).message}</p>
          </div>
        </section>
      )}

      {/* User list */}
      {isMobile ? (
        <section aria-label="Listado de usuarios">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-content-muted gap-3">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span className="body-base">Cargando usuarios…</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <svg className="w-10 h-10 text-content-disabled" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.655-.084-1.289-.241-1.892M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.655.084-1.289.241-1.892m0 0a5.002 5.002 0 019.518 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="body-base text-content-muted">No hay usuarios que coincidan con los filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredUsers.map((u) => (
                <EntityCard
                  key={u.id}
                  title={formatNameParts(u.first_name, u.last_name)}
                  subtitle={u.email}
                  inactive={u.estado === 'inactivo' || u.estado === 'bloqueado'}
                  badge={
                    <div className="flex flex-col items-end gap-1">
                      <span className={roleBadgeCls(u.role)}>{formatRoleLabel(u.role)}</span>
                      <span className={statusBadgeCls(u.estado)}>{formatStatusLabel(u.estado)}</span>
                    </div>
                  }
                  fields={[
                    ...(getDisplayRut(u.rut)
                      ? [{ label: 'RUT', value: getDisplayRut(u.rut), secondary: true as const }]
                      : []),
                    { label: 'Teléfono', value: u.phone_number || '—', secondary: true },
                  ]}
                  actions={[
                    {
                      label: 'Editar',
                      variant: 'primary',
                      onClick: () => openEditModal(u),
                    },
                    {
                      label: 'Eliminar',
                      variant: 'danger',
                      onClick: () => openDeleteModal(u),
                      show: currentUser?.id !== u.id,
                    },
                  ]}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section aria-label="Tabla de usuarios" data-tour="admin-users-table">
          <ResponsiveTable<UserRecord>
            columns={columns}
            data={filteredUsers}
            loading={isLoading}
            emptyMessage="No hay usuarios que coincidan con los filtros."
            caption="Listado de usuarios del sistema"
            getRowKey={(row) => row.id}
            mobileKebab={(row) => [
              { label: 'Editar', onClick: () => openEditModal(row), variant: 'primary' },
              ...(currentUser?.id !== row.id
                ? [{ label: 'Eliminar', onClick: () => openDeleteModal(row), variant: 'danger' as const }]
                : []),
            ]}
          />
        </section>
      )}

      {/* ── Create / Edit modal ──────────────────────────────────────────────── */}
      <Modal isOpen={isFormModalOpen} onClose={closeFormModal}>
        <div className="mb-6">
          <h2 className="heading-3 text-content-primary">
            {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          {editingUser && (
            <p className="body-small text-content-muted mt-1">
              {formatNameParts(editingUser.first_name, editingUser.last_name)} · {editingUser.email}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmitForm} noValidate>

          {/* Identity */}
          <fieldset className="space-y-4">
            <legend className="label-base font-semibold text-content-muted uppercase tracking-wider mb-3">
              Identidad
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField id="user-first-name" label="Nombre" required error={formErrors.first_name}>
                <input
                  id="user-first-name"
                  type="text"
                  autoComplete="given-name"
                  value={formValues.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  aria-invalid={!!formErrors.first_name}
                  aria-describedby={formErrors.first_name ? 'user-first-name-error' : undefined}
                  className={inputCls(!!formErrors.first_name)}
                />
              </FormField>

              <FormField id="user-last-name" label="Apellido" required error={formErrors.last_name}>
                <input
                  id="user-last-name"
                  type="text"
                  autoComplete="family-name"
                  value={formValues.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  aria-invalid={!!formErrors.last_name}
                  aria-describedby={formErrors.last_name ? 'user-last-name-error' : undefined}
                  className={inputCls(!!formErrors.last_name)}
                />
              </FormField>
            </div>

            <FormField id="user-email" label="Email" required error={formErrors.email}>
              <input
                id="user-email"
                type="email"
                autoComplete="email"
                value={formValues.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                aria-invalid={!!formErrors.email}
                aria-describedby={formErrors.email ? 'user-email-error' : undefined}
                className={inputCls(!!formErrors.email)}
              />
            </FormField>
          </fieldset>

          {/* Security */}
          <fieldset className="space-y-4 mt-6 pt-5 border-t border-edge">
            <legend className="label-base font-semibold text-content-muted uppercase tracking-wider mb-3">
              Seguridad
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="user-password"
                label={editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                required={!editingUser}
                error={formErrors.password}
                helpText={
                  editingUser
                    ? 'Dejar vacío para mantener la contraseña actual.'
                    : 'Mínimo 8 caracteres.'
                }
              >
                <input
                  id="user-password"
                  type="password"
                  autoComplete={editingUser ? 'new-password' : 'new-password'}
                  value={formValues.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  aria-invalid={!!formErrors.password}
                  aria-describedby={
                    formErrors.password
                      ? 'user-password-error'
                      : 'user-password-help'
                  }
                  className={inputCls(!!formErrors.password)}
                />
              </FormField>

              <FormField
                id="user-confirm-password"
                label="Confirmar contraseña"
                required={!editingUser}
                error={formErrors.confirmPassword}
                helpText="Repite la contraseña para confirmar."
              >
                <input
                  id="user-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={formValues.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  aria-invalid={!!formErrors.confirmPassword}
                  aria-describedby={
                    formErrors.confirmPassword
                      ? 'user-confirm-password-error'
                      : 'user-confirm-password-help'
                  }
                  className={inputCls(!!formErrors.confirmPassword)}
                />
              </FormField>
            </div>
          </fieldset>

          {/* Role & status */}
          <fieldset className="space-y-4 mt-6 pt-5 border-t border-edge">
            <legend className="label-base font-semibold text-content-muted uppercase tracking-wider mb-3">
              Rol y estado
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField id="user-role" label="Rol" required>
                <select
                  id="user-role"
                  value={formValues.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className={inputCls(false)}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </FormField>

              {editingUser && (
                <FormField id="user-status" label="Estado">
                  <select
                    id="user-status"
                    value={formValues.estado}
                    onChange={(e) => handleInputChange('estado', e.target.value)}
                    className={inputCls(false)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </FormField>
              )}
            </div>
          </fieldset>

          {/* Optional fields */}
          <fieldset className="space-y-4 mt-6 pt-5 border-t border-edge">
            <legend className="label-base font-semibold text-content-muted uppercase tracking-wider mb-3">
              Datos opcionales
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField id="user-rut" label="RUT" helpText="Ejemplo: 12.345.678-9">
                <input
                  id="user-rut"
                  type="text"
                  autoComplete="off"
                  value={formValues.rut}
                  onChange={(e) => handleInputChange('rut', e.target.value)}
                  aria-describedby="user-rut-help"
                  className={inputCls(false)}
                />
              </FormField>

              {editingUser && (
                <FormField id="user-phone" label="Teléfono" helpText="Número con código de país.">
                  <input
                    id="user-phone"
                    type="tel"
                    autoComplete="tel"
                    value={formValues.phone_number}
                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                    aria-describedby="user-phone-help"
                    className={inputCls(false)}
                  />
                </FormField>
              )}
            </div>
          </fieldset>

          {/* Actions */}
          <FormButtons
            submitText={editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
            onCancel={closeFormModal}
            isSubmitting={isSaving}
          />
        </form>
      </Modal>

      {/* ── Delete confirmation ──────────────────────────────────────────────── */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title={`Eliminar a ${formatNameParts(userToDelete?.first_name, userToDelete?.last_name)}`}
        message={`Si el usuario tiene asignaciones activas se desactivará en lugar de eliminarse. Si no tiene asignaciones, se eliminará de forma permanente y esta acción no se puede deshacer.`}
        confirmText={isDeleting ? 'Procesando…' : 'Eliminar'}
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};

export default UsersPage;
