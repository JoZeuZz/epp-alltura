import React from 'react';

interface StatsItem {
  label: string;
  value: string | number;
  color?: string;
}

interface StatsCardProps {
  title: string;
  items: StatsItem[];
  icon: React.ReactNode;
}

/**
 * StatsCard - Tarjeta de estadísticas con múltiples valores
 * Componente para mostrar lista de métricas relacionadas
 * 
 * @param title - Título de la tarjeta
 * @param items - Array de items con label, value y color opcional
 * @param icon - Ícono SVG a mostrar en el header
 */
const StatsCard: React.FC<StatsCardProps> = ({ title, items, icon }) => (
  <div className="bg-white p-3 sm:p-4 md:p-5 rounded-lg shadow-md">
    <div className="flex items-center gap-2 mb-3">
      <div className="text-primary-blue w-5 h-5 sm:w-6 sm:h-6">{icon}</div>
      <h2 className="text-base sm:text-lg font-semibold text-dark-blue">{title}</h2>
    </div>
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex justify-between items-center">
          <span className="text-sm sm:text-base text-neutral-gray">{item.label}</span>
          <span className={`text-lg font-semibold ${item.color || 'text-dark-blue'}`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export default StatsCard;
