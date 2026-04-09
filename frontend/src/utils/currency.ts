const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export const formatCLP = (value: unknown): string => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '$0';
  return clpFormatter.format(Math.round(num));
};
