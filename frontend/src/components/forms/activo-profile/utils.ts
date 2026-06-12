export const MOV_ICONS: Record<string, string> = {
  entrada: '↓',
  salida: '↑',
  entrega: '→',
  devolucion: '←',
  ajuste: '≡',
  baja: '×',
  mantencion: '↺',
};

export const MOV_LABELS: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  entrega: 'Entrega',
  devolucion: 'Devolución',
  ajuste: 'Ajuste',
  baja: 'Baja',
  mantencion: 'Mantención',
};

export const CUSTODIA_ESTADO_CLASSES: Record<string, string> = {
  activa: 'text-primary',
  devuelta: 'text-success-text',
  perdida: 'text-danger-text',
  baja: 'text-content-secondary',
  mantencion: 'text-amber-600',
};

export const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
