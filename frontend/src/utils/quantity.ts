const integerQuantityFormatter = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export const parseQuantityInteger = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
};

export const formatQuantityInteger = (value: unknown, fallback = 0): string => {
  const normalized = parseQuantityInteger(value, fallback);
  return integerQuantityFormatter.format(normalized);
};
