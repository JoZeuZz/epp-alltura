import React, { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ConfirmationModal from '../../components/ConfirmationModal';
import Modal from '../../components/Modal';
import { EntityCard } from '../../components/cards';
import { ResponsiveTable, type TableColumn } from '../../components/layout';
import { useAuth, useBreakpoints, useDelete, useGet, usePost, usePut } from '../../hooks';
import type { User } from '../../types/api';
import type { UserCreatePayload, UserRole, UserUpdatePayload } from '../../services/apiService';
import { formatNameParts } from '../../utils/name';

type UserStatus = 'activo' | 'inactivo' | 'bloqueado';
type FilterRole = 'all' | 'admin' | 'supervisor' | 'bodega' | 'worker';

interface UserRecord extends User {
  estado?: UserStatus;
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

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'admin', label: 'Administrador' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'bodega', label: 'Bodega' },
  { value: 'worker', label: 'Trabajador' },
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

const isTemporaryRut = (value?: string | null): boolean => {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized.startsWith('TMP-');
};

const getDisplayRut = (value?: string | null): string => {
  const normalized = String(value || '').trim();
  if (!normalized || isTemporaryRut(normalized)) {
    return '';
  }
  return normalized;
};

const normalizeRole = (role?: string | null): Exclude<FilterRole, 'all'> => {
  if (role === 'admin' || role === 'supervisor' || role === 'bodega') {
    return role;
  }
  return 'worker';
};

const formatRoleLabel = (role?: string | null): string => {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'admin') return 'Administrador';
  if (normalizedRole === 'supervisor') return 'Supervisor';
  if (normalizedRole === 'bodega') return 'Bodega';
  return 'Trabajador';
};

const formatStatusLabel = (status?: string | null): string => {
  if (status === 'inactivo') return 'Inactivo';
  if (status === 'bloqueado') return 'Bloqueado';
  return 'Activo';
};

const statusBadgeClasses = (status?: string | null): string => {
  if (status === 'inactivo') return 'bg-gray-100 text-gray-700';
  if (status === 'bloqueado') return 'bg-amber-100 text-amber-700';
  return 'bg-green-100 text-green-700';
};

const roleBadgeClasses = (role?: string | null): string => {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'admin') return 'bg-red-100 text-red-700';
  if (normalizedRole === 'supervisor') return 'bg-blue-100 text-blue-700';
  if (normalizedRole === 'bodega') return 'bg-indigo-100 text-indigo-700';
  return 'bg-emerald-100 text-emerald-700';
};

const buildFormFromUser = (user: UserRecord): UserFormValues => ({
  first_name: user.first_name || '',
  last_name: user.last_name || '',
  email: user.email || '',
  password: '',
  confirmPassword: '',
  role: normalizeRole(user.role),
  estado: user.estado || 'activo',
  rut: getDisplayRut(user.rut),
  phone_number: user.phone_number || '',
});

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  const payload = error as {
    response?: {
      data?: {
        message?: string;
      };
    };
  };

  return payload?.response?.data?.message || 'No se pudo completar la operación.';
};

const validateForm = (values: UserFormValues, isEditing: boolean): UserFormErrors => {
  const errors: UserFormErrors = {};

  if (!values.first_name.trim()) {
    errors.first_name = 'El nombre es obligatorio.';
  }

  if (!values.last_name.trim()) {
    errors.last_name = 'El apellido es obligatorio.';
  }

  if (!values.email.trim()) {
    errors.email = 'El email es obligatorio.';
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = 'El formato de email no es válido.';
  }

  if (!isEditing && !values.password.trim()) {
    errors.password = 'La contraseña es obligatoria para crear usuarios.';
  }

  if (values.password && values.password.length < 12) {
    errors.password = 'La contraseña debe tener al menos 12 caracteres.';
  }

  if (values.password && values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden.';
  }

  return errors;
};

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { isMobile } = useBreakpoints();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<FilterRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null);
  const [formValues, setFormValues] = useState<UserFormValues>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<UserFormErrors>({});

  const {
    data: users = [],
    isLoading,
    error,
  } = useGet<UserRecord[]>('admin-users', '/users');

  const createUser = usePost<UserRecord, UserCreatePayload>('admin-users', '/users');
  const updateUser = usePut<UserRecord, UserUpdatePayload>('admin-users', '/users');
  const deactivateUser = useDelete<{ id: string; estado: UserStatus }>('admin-users', '/users');

  const isSaving = createUser.isPending || updateUser.isPending;
  const isDeleting = deactivateUser.isPending;

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const normalizedRole = normalizeRole(user.role);
      const matchesRole = roleFilter === 'all' || normalizedRole === roleFilter;
      const matchesStatus = statusFilter === 'all' || (user.estado || 'activo') === statusFilter;
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        fullName.includes(normalizedSearch) ||
        (user.email || '').toLowerCase().includes(normalizedSearch) ||
        getDisplayRut(user.rut).toLowerCase().includes(normalizedSearch);

      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [roleFilter, searchTerm, statusFilter, users]);

  const userCounters = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        const normalizedRole = normalizeRole(user.role);
        acc.total += 1;
        acc[normalizedRole] += 1;
        return acc;
      },
      { total: 0, admin: 0, supervisor: 0, bodega: 0, worker: 0 }
    );
  }, [users]);

  const resetForm = useCallback(() => {
    setFormValues(EMPTY_FORM);
    setFormErrors({});
    setEditingUser(null);
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm();
    setIsFormModalOpen(true);
  }, [resetForm]);

  const openEditModal = useCallback((user: UserRecord) => {
    setEditingUser(user);
    setFormValues(buildFormFromUser(user));
    setFormErrors({});
    setIsFormModalOpen(true);
  }, []);

  const closeFormModal = useCallback(() => {
    setIsFormModalOpen(false);
    resetForm();
  }, [resetForm]);

  const openDeleteModal = useCallback((user: UserRecord) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setUserToDelete(null);
    setIsDeleteModalOpen(false);
  }, []);

  const handleInputChange = useCallback(
    (field: keyof UserFormValues, value: string) => {
      setFormValues((prev) => ({ ...prev, [field]: value }));
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    []
  );

  const handleSubmitForm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isEditing = Boolean(editingUser);
    const errors = validateForm(formValues, isEditing);

    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    const payloadBase = {
      first_name: formValues.first_name.trim(),
      last_name: formValues.last_name.trim(),
      email: formValues.email.trim().toLowerCase(),
      role: formValues.role,
      rut: formValues.rut.trim(),
      phone_number: formValues.phone_number.trim(),
    };

    try {
      if (isEditing && editingUser) {
        const payload: UserUpdatePayload = {
          id: editingUser.id,
          ...payloadBase,
          estado: formValues.estado,
        };

        if (formValues.password.trim()) {
          payload.password = formValues.password;
        }

        await updateUser.mutateAsync(payload);
        toast.success('Usuario actualizado correctamente.');
      } else {
        await createUser.mutateAsync({
          ...payloadBase,
          password: formValues.password,
        });
        toast.success('Usuario creado correctamente.');
      }

      closeFormModal();
    } catch (submitError) {
      toast.error(toErrorMessage(submitError));
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    if (currentUser?.id === userToDelete.id) {
      toast.error('No puedes desactivar tu propio usuario administrador.');
      closeDeleteModal();
      return;
    }

    try {
      await deactivateUser.mutateAsync(userToDelete.id);
      toast.success('Usuario desactivado correctamente.');
      closeDeleteModal();
    } catch (deleteError) {
      toast.error(toErrorMessage(deleteError));
    }
  };

  const columns = useMemo<TableColumn<UserRecord>[]>(
    () => [
      {
        key: 'full_name',
        header: 'Nombre',
        render: (_value, row) => (
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900">
              {formatNameParts(row.first_name, row.last_name)}
            </span>
            {getDisplayRut(row.rut) ? (
              <span className="text-xs text-gray-500">{getDisplayRut(row.rut)}</span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'email',
        header: 'Email',
      },
      {
        key: 'role',
        header: 'Rol',
        render: (value) => (
          <span
            className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${roleBadgeClasses(
              String(value)
            )}`}
          >
            {formatRoleLabel(String(value))}
          </span>
        ),
      },
      {
        key: 'estado',
        header: 'Estado',
        render: (value) => (
          <span
            className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${statusBadgeClasses(
              String(value || 'activo')
            )}`}
          >
            {formatStatusLabel(String(value || 'activo'))}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        align: 'right',
        render: (_value, row) => (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
              onClick={(event) => {
                event.stopPropagation();
                openEditModal(row);
              }}
            >
              Editar
            </button>
            <button
              type="button"
              className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={(event) => {
                event.stopPropagation();
                openDeleteModal(row);
              }}
              disabled={row.estado === 'inactivo' || currentUser?.id === row.id}
            >
              Desactivar
            </button>
          </div>
        ),
      },
    ],
    [currentUser?.id, openDeleteModal, openEditModal]
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Gestión de Usuarios</h1>
          <p className="text-neutral-gray mt-1">
            Administración de usuarios y roles para la operación EPP/Herramientas.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 rounded-md bg-primary-blue text-white hover:bg-blue-700 transition-colors"
        >
          Crear Usuario
        </button>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setRoleFilter('all')}
          className={`rounded-lg p-3 text-left border transition-colors ${
            roleFilter === 'all' ? 'bg-primary-blue text-white border-primary-blue' : 'bg-white border-gray-200'
          }`}
        >
          <p className="text-xs uppercase opacity-80">Total</p>
          <p className="text-xl font-bold">{userCounters.total}</p>
        </button>
        <button
          type="button"
          onClick={() => setRoleFilter('admin')}
          className={`rounded-lg p-3 text-left border transition-colors ${
            roleFilter === 'admin' ? 'bg-red-600 text-white border-red-600' : 'bg-white border-gray-200'
          }`}
        >
          <p className="text-xs uppercase opacity-80">Admin</p>
          <p className="text-xl font-bold">{userCounters.admin}</p>
        </button>
        <button
          type="button"
          onClick={() => setRoleFilter('supervisor')}
          className={`rounded-lg p-3 text-left border transition-colors ${
            roleFilter === 'supervisor'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white border-gray-200'
          }`}
        >
          <p className="text-xs uppercase opacity-80">Supervisor</p>
          <p className="text-xl font-bold">{userCounters.supervisor}</p>
        </button>
        <button
          type="button"
          onClick={() => setRoleFilter('bodega')}
          className={`rounded-lg p-3 text-left border transition-colors ${
            roleFilter === 'bodega' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200'
          }`}
        >
          <p className="text-xs uppercase opacity-80">Bodega</p>
          <p className="text-xl font-bold">{userCounters.bodega}</p>
        </button>
        <button
          type="button"
          onClick={() => setRoleFilter('worker')}
          className={`rounded-lg p-3 text-left border transition-colors ${
            roleFilter === 'worker'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white border-gray-200'
          }`}
        >
          <p className="text-xs uppercase opacity-80">Trabajador</p>
          <p className="text-xl font-bold">{userCounters.worker}</p>
        </button>
      </section>

      <section className="bg-white rounded-lg shadow-md p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            className="border rounded-md p-2"
            placeholder="Buscar por nombre, email o RUT"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <select
            className="border rounded-md p-2"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as FilterRole)}
          >
            <option value="all">Todos los roles</option>
            <option value="admin">Administrador</option>
            <option value="supervisor">Supervisor</option>
            <option value="bodega">Bodega</option>
            <option value="worker">Trabajador</option>
          </select>
          <select
            className="border rounded-md p-2"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | UserStatus)}
          >
            <option value="all">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="bloqueado">Bloqueado</option>
          </select>
        </div>
      </section>

      {error ? (
        <section className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error al cargar usuarios: {toErrorMessage(error)}
        </section>
      ) : null}

      {isMobile ? (
        <section className="grid grid-cols-1 gap-3">
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-md p-5 text-gray-600">Cargando usuarios...</div>
          ) : filteredUsers.length ? (
            filteredUsers.map((user) => (
              <EntityCard
                key={user.id}
                title={formatNameParts(user.first_name, user.last_name)}
                subtitle={user.email}
                badge={
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${roleBadgeClasses(
                      user.role
                    )}`}
                  >
                    {formatRoleLabel(user.role)}
                  </span>
                }
                fields={[
                  { label: 'Estado', value: formatStatusLabel(user.estado) },
                  ...(getDisplayRut(user.rut)
                    ? [{ label: 'RUT', value: getDisplayRut(user.rut), secondary: true as const }]
                    : []),
                  { label: 'Teléfono', value: user.phone_number || '-', secondary: true },
                ]}
                actions={[
                  {
                    label: 'Editar',
                    variant: 'primary',
                    onClick: () => openEditModal(user),
                  },
                  {
                    label: 'Desactivar',
                    variant: 'danger',
                    onClick: () => openDeleteModal(user),
                    show: user.estado !== 'inactivo' && currentUser?.id !== user.id,
                  },
                ]}
              />
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-md p-5 text-gray-600">
              No hay usuarios que coincidan con los filtros.
            </div>
          )}
        </section>
      ) : (
        <section>
          <ResponsiveTable<UserRecord>
            columns={columns}
            data={filteredUsers}
            loading={isLoading}
            emptyMessage="No hay usuarios que coincidan con los filtros."
            caption="Listado de usuarios del sistema"
            getRowKey={(row) => row.id}
          />
        </section>
      )}

      <Modal isOpen={isFormModalOpen} onClose={closeFormModal}>
        <h2 className="text-2xl font-bold text-dark-blue mb-4">
          {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        </h2>
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="user-first-name" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                id="user-first-name"
                type="text"
                className={`w-full border rounded-md p-2 ${
                  formErrors.first_name ? 'border-red-400' : 'border-gray-300'
                }`}
                value={formValues.first_name}
                onChange={(event) => handleInputChange('first_name', event.target.value)}
              />
              {formErrors.first_name ? (
                <p className="text-xs text-red-600 mt-1">{formErrors.first_name}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="user-last-name" className="block text-sm font-medium text-gray-700 mb-1">
                Apellido <span className="text-red-500">*</span>
              </label>
              <input
                id="user-last-name"
                type="text"
                className={`w-full border rounded-md p-2 ${
                  formErrors.last_name ? 'border-red-400' : 'border-gray-300'
                }`}
                value={formValues.last_name}
                onChange={(event) => handleInputChange('last_name', event.target.value)}
              />
              {formErrors.last_name ? (
                <p className="text-xs text-red-600 mt-1">{formErrors.last_name}</p>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <label htmlFor="user-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="user-email"
                type="email"
                className={`w-full border rounded-md p-2 ${
                  formErrors.email ? 'border-red-400' : 'border-gray-300'
                }`}
                value={formValues.email}
                onChange={(event) => handleInputChange('email', event.target.value)}
              />
              {formErrors.email ? <p className="text-xs text-red-600 mt-1">{formErrors.email}</p> : null}
            </div>
            <div>
              <label htmlFor="user-password" className="block text-sm font-medium text-gray-700 mb-1">
                {editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña *'}
              </label>
              <input
                id="user-password"
                type="password"
                className={`w-full border rounded-md p-2 ${
                  formErrors.password ? 'border-red-400' : 'border-gray-300'
                }`}
                value={formValues.password}
                onChange={(event) => handleInputChange('password', event.target.value)}
                placeholder={editingUser ? 'Dejar vacío para mantener actual' : ''}
              />
              {formErrors.password ? (
                <p className="text-xs text-red-600 mt-1">{formErrors.password}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="user-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar contraseña {editingUser ? '' : <span className="text-red-500">*</span>}
              </label>
              <input
                id="user-confirm-password"
                type="password"
                className={`w-full border rounded-md p-2 ${
                  formErrors.confirmPassword ? 'border-red-400' : 'border-gray-300'
                }`}
                value={formValues.confirmPassword}
                onChange={(event) => handleInputChange('confirmPassword', event.target.value)}
              />
              {formErrors.confirmPassword ? (
                <p className="text-xs text-red-600 mt-1">{formErrors.confirmPassword}</p>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <label htmlFor="user-role" className="block text-sm font-medium text-gray-700 mb-1">
                Rol <span className="text-red-500">*</span>
              </label>
              <select
                id="user-role"
                className="w-full border rounded-md p-2 border-gray-300"
                value={formValues.role}
                onChange={(event) => handleInputChange('role', event.target.value)}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="user-rut" className="block text-sm font-medium text-gray-700 mb-1">
                RUT (opcional)
              </label>
              <input
                id="user-rut"
                type="text"
                className="w-full border rounded-md p-2 border-gray-300"
                value={formValues.rut}
                onChange={(event) => handleInputChange('rut', event.target.value)}
              />
            </div>
            {editingUser ? (
              <div>
                <label htmlFor="user-status" className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  id="user-status"
                  className="w-full border rounded-md p-2 border-gray-300"
                  value={formValues.estado}
                  onChange={(event) => handleInputChange('estado', event.target.value)}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {editingUser ? (
              <div>
                <label htmlFor="user-phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono (opcional)
                </label>
                <input
                  id="user-phone"
                  type="text"
                  className="w-full border rounded-md p-2 border-gray-300"
                  value={formValues.phone_number}
                  onChange={(event) => handleInputChange('phone_number', event.target.value)}
                />
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700"
              onClick={closeFormModal}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-primary-blue text-white disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Desactivar usuario"
        message={`Se desactivará el usuario "${formatNameParts(
          userToDelete?.first_name,
          userToDelete?.last_name
        )}". Podrá reactivarse editando su estado.`}
        confirmText={isDeleting ? 'Desactivando...' : 'Desactivar'}
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};

export default UsersPage;
