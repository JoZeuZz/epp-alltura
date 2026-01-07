import React from 'react';

/**
 * Componente base para mostrar información en formato card
 * Útil para convertir tablas a cards en pantallas móviles
 */

export interface InfoField {
  label: string;
  value: string | number | null | undefined;
  secondary?: boolean; // Si es campo secundario (texto más pequeño)
  hide?: boolean; // Ocultar si está vacío
}

export interface CardAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  show?: boolean; // Condicional para mostrar/ocultar
  icon?: React.ReactNode;
}

export interface EntityCardProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  fields: InfoField[];
  actions?: CardAction[];
  inactive?: boolean; // Estilos para entidades desactivadas
  onClick?: () => void; // Si el card completo es clickeable
}

const InfoRow: React.FC<{ field: InfoField }> = ({ field }) => {
  // No renderizar si está marcado para ocultar y está vacío
  if (field.hide && !field.value) return null;
  
  const value = field.value ?? '-';
  
  return (
    <div className={field.secondary ? 'text-sm' : ''}>
      <span className="label-base text-gray-600">{field.label}: </span>
      <span className={`body-base ${field.secondary ? 'text-gray-500' : 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
};

const ActionButton: React.FC<{ action: CardAction }> = ({ action }) => {
  const baseClasses = 'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5';
  
  const variantClasses = {
    primary: 'bg-primary-blue text-white hover:bg-blue-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100',
    success: 'bg-green-50 text-green-700 hover:bg-green-100',
  };
  
  const variant = action.variant || 'secondary';
  
  return (
    <button
      onClick={action.onClick}
      className={`${baseClasses} ${variantClasses[variant]}`}
      title={action.label}
    >
      {action.icon && <span className="w-3.5 h-3.5">{action.icon}</span>}
      <span className="text-xs">{action.label}</span>
    </button>
  );
};

export const EntityCard: React.FC<EntityCardProps> = ({
  title,
  subtitle,
  badge,
  fields,
  actions = [],
  inactive = false,
  onClick,
}) => {
  const cardClasses = `
    bg-white rounded-lg shadow-md p-4 
    transition-shadow
    ${inactive ? 'opacity-60 bg-gray-50' : 'hover:shadow-lg'}
    ${onClick ? 'cursor-pointer' : ''}
  `.trim();
  
  const visibleActions = actions.filter(action => action.show !== false);
  
  return (
    <div className={cardClasses} onClick={onClick}>
      {/* Header con título, subtitle y badge */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="heading-4 text-dark-blue mb-1">{title}</h3>
          {subtitle && (
            <p className="body-small text-gray-600">{subtitle}</p>
          )}
        </div>
        {badge && (
          <div className="ml-2 flex-shrink-0">
            {badge}
          </div>
        )}
      </div>
      
      {/* Campos de información */}
      {fields.length > 0 && (
        <div className="space-y-2 mb-4">
          {fields.map((field, index) => (
            <InfoRow key={index} field={field} />
          ))}
        </div>
      )}
      
      {/* Acciones */}
      {visibleActions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
          {visibleActions.map((action, index) => (
            <ActionButton key={index} action={action} />
          ))}
        </div>
      )}
    </div>
  );
};

export default EntityCard;
