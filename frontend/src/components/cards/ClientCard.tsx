import React from 'react';
import { EntityCard, InfoField, CardAction } from './EntityCard';
import type { Client } from '../../types/api';

interface ClientCardProps {
  client: Client;
  onEdit: (client: Client | null) => void;
  onDelete: (client: Client) => void;
  onReactivate: (client: Client) => void;
}

const StatusBadge: React.FC<{ active: boolean | undefined }> = ({ active }) => {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
      active 
        ? 'bg-green-100 text-green-800' 
        : 'bg-gray-100 text-gray-800'
    }`}>
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
};

export const ClientCard: React.FC<ClientCardProps> = ({
  client,
  onEdit,
  onDelete,
  onReactivate,
}) => {
  const fields: InfoField[] = [
    {
      label: 'Email',
      value: client.email,
      hide: true, // No mostrar fila si está vacío
    },
    {
      label: 'Teléfono',
      value: client.phone,
      hide: true,
    },
    {
      label: 'Dirección',
      value: client.address,
      secondary: true, // Texto más pequeño
      hide: true,
    },
    {
      label: 'Especialidad',
      value: client.specialty,
      secondary: true,
      hide: true,
    },
  ];
  
  const actions: CardAction[] = [];
  
  if (client.active) {
    // Cliente activo: puede editar y eliminar
    actions.push({
      label: 'Editar',
      onClick: () => onEdit(client),
      variant: 'primary',
      show: true,
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    });
    
    actions.push({
      label: 'Eliminar',
      onClick: () => onDelete(client),
      variant: 'danger',
      show: true,
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
    });
  } else {
    // Cliente inactivo: solo puede reactivar
    actions.push({
      label: 'Reactivar',
      onClick: () => onReactivate(client),
      variant: 'success',
      show: true,
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    });
  }
  
  return (
    <EntityCard
      title={client.name}
      badge={<StatusBadge active={client.active} />}
      fields={fields}
      actions={actions}
      inactive={!client.active}
    />
  );
};

export default ClientCard;
