const DEFAULT_MAX_MB = 25;

const parseMaxMb = (value: string | undefined) => {
  if (!value) return DEFAULT_MAX_MB;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_MB;
  return parsed;
};

export const IMAGE_MAX_MB = parseMaxMb(import.meta.env.VITE_IMAGE_MAX_MB);
export const IMAGE_MAX_BYTES = Math.round(IMAGE_MAX_MB * 1024 * 1024);
export const IMAGE_MAX_LABEL = `${IMAGE_MAX_MB}MB`;
