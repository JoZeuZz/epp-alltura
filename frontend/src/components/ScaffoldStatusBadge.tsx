import React from 'react';
import { Scaffold } from '../types/api';

interface ScaffoldStatusBadgeProps {
  scaffold: Scaffold;
  showDetails?: boolean;
}

/**
 * Componente de badges para mostrar el estado de un andamio
 * Muestra indicadores visuales de tarjeta y estado de armado
 */
export const ScaffoldStatusBadge: React.FC<ScaffoldStatusBadgeProps> = React.memo(({
  scaffold,
  showDetails = false,
}) => {
  return (
    <div className="flex items-center space-x-2">
      {/* Badge de Tarjeta */}
      <div
        className={`flex items-center space-x-1 px-3 py-1 rounded-full text-white text-sm font-medium ${
          scaffold.card_status === 'green'
            ? 'bg-green-500'
            : 'bg-red-500'
        }`}
        title={scaffold.card_status === 'green' ? 'Tarjeta Verde - Todo OK' : 'Tarjeta Roja - Hay problemas'}
        role={!showDetails ? 'status' : undefined}
        aria-live={!showDetails ? 'polite' : undefined}
        aria-label={!showDetails ? `Estado de tarjeta: ${scaffold.card_status === 'green' ? 'verde, todo OK' : 'roja, hay problemas'}` : undefined}
      >
        <span>{scaffold.card_status === 'green' ? '✓' : '✗'}</span>
        {showDetails && (
          <span>{scaffold.card_status === 'green' ? 'Verde' : 'Roja'}</span>
        )}
      </div>

      {/* Badge de Armado */}
      <div
        className={`flex items-center space-x-1 px-3 py-1 rounded-full text-white text-sm font-medium ${
          scaffold.assembly_status === 'assembled'
            ? 'bg-blue-500'
            : 'bg-gray-500'
        }`}
        title={scaffold.assembly_status === 'assembled' ? 'Armado' : 'Desarmado'}
        role={!showDetails ? 'status' : undefined}
        aria-live={!showDetails ? 'polite' : undefined}
        aria-label={!showDetails ? `Estado de armado: ${scaffold.assembly_status === 'assembled' ? 'armado' : 'desarmado'}` : undefined}
      >
        <span>{scaffold.assembly_status === 'assembled' ? '🏗️' : '📦'}</span>
        {showDetails && (
          <span>{scaffold.assembly_status === 'assembled' ? 'Armado' : 'Desarmado'}</span>
        )}
      </div>

      {/* Badge de Progreso (opcional) */}
      {showDetails && (
        <div
          className="flex items-center space-x-1 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-sm font-medium"
          title={`Progreso: ${scaffold.progress_percentage}%`}
          role="status"
          aria-label={`Progreso del andamio: ${scaffold.progress_percentage} por ciento`}
        >
          <span>📊</span>
          <span>{scaffold.progress_percentage}%</span>
        </div>
      )}
    </div>
  );
});

ScaffoldStatusBadge.displayName = 'ScaffoldStatusBadge';

export default ScaffoldStatusBadge;
