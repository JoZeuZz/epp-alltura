import React from 'react';

interface Props {
  alerta?: boolean;
}

const AlertaDevolucionBadge: React.FC<Props> = ({ alerta }) => {
  if (!alerta) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 border border-red-200 text-red-700 flex-shrink-0">
      ⚠ Proyecto finalizado
    </span>
  );
};

export default AlertaDevolucionBadge;
