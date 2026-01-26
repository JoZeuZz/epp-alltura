import React from 'react';
import { EntityCard, InfoField, CardAction } from './EntityCard';
import type { User } from '../../types/api';
import { formatNameParts } from '../../utils/name';

interface UserCardProps {
  user: User;
  onEdit: (user?: User | null) => void;
  onDelete: (userId: number) => void;
  onHistory?: (userId: number) => void;
  currentUserRole?: string;
}

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const roleConfig = {
    admin: { label: 'Administrador', color: 'bg-blue-100 text-blue-800' },
    supervisor: { label: 'Supervisor', color: 'bg-green-100 text-green-800' },
    client: { label: 'Cliente', color: 'bg-purple-100 text-purple-800' },
  };
  
  const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.client;
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

export const UserCard: React.FC<UserCardProps> = ({
  user,
  onEdit,
  onDelete,
  onHistory,
  currentUserRole,
}) => {
  const fields: InfoField[] = [
    {
      label: 'Email',
      value: user.email,
    },
  ];
  
  const actions: CardAction[] = [];
  
  // Acción Historial (solo para admin y supervisor)
  if (onHistory && (currentUserRole === 'admin' || currentUserRole === 'supervisor')) {
    actions.push({
      label: 'Historial',
      onClick: () => onHistory(user.id),
      variant: 'secondary',
      show: true,
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    });
  }
  
  // Acción Editar
  actions.push({
    label: 'Editar',
    onClick: () => onEdit(user),
    variant: 'primary',
    show: true,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  });
  
  // Acción Eliminar
  actions.push({
    label: 'Eliminar',
    onClick: () => onDelete(user.id),
    variant: 'danger',
    show: true,
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
  });
  
  return (
    <EntityCard
      title={formatNameParts(user.first_name, user.last_name)}
      badge={<RoleBadge role={user.role} />}
      fields={fields}
      actions={actions}
    />
  );
};

export default UserCard;
