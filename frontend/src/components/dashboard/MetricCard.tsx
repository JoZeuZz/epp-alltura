import React from 'react';
import { Link } from 'react-router-dom';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  to?: string;
  subtitle?: string;
  colorClass?: string;
}

/**
 * MetricCard - Tarjeta de métrica reutilizable
 * Componente base para mostrar estadísticas en dashboards
 * 
 * @param title - Título de la métrica
 * @param value - Valor principal a mostrar
 * @param icon - Ícono SVG a mostrar
 * @param to - Ruta opcional para hacer la card clickeable
 * @param subtitle - Texto adicional opcional
 * @param colorClass - Clase de color para el ícono (default: text-primary-blue)
 */
const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  to,
  subtitle,
  colorClass = 'text-primary',
}) => {
  const content = (
    <div className="bg-surface p-3 sm:p-4 rounded-lg shadow-card flex items-center gap-2 sm:gap-3 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1">
      <div className={`${colorClass} flex-shrink-0`}>
        <div className="w-8 h-8 sm:w-9 sm:h-9">{icon}</div>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-xs sm:text-sm text-content-secondary mb-0.5">{title}</h3>
        <p className="text-2xl sm:text-3xl font-bold text-dark-blue leading-tight">{value}</p>
        {subtitle && <p className="text-xs text-content-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }
  return content;
};

export default MetricCard;
