import imageCompression from 'browser-image-compression';
import { IMAGE_MAX_BYTES, IMAGE_MAX_MB } from '../../config/imageLimits';

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
];

export const ALLOWED_IMAGE_ACCEPT = ALLOWED_IMAGE_TYPES.join(',');

const DEFAULT_TARGET_MAX_MB = 10;
const DEFAULT_MAX_DIMENSION = 1920;

export type ImageProcessingResult = {
  file: File;
  originalBytes: number;
  processedBytes: number;
  wasCompressed: boolean;
};

export const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes)) return '0 B';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const normalizeMimeType = (value: string) => value.toLowerCase();

export const validateImageFile = (file: File) => {
  if (!file) {
    throw new Error('No se seleccionó ninguna imagen.');
  }

  if (!file.type) {
    throw new Error('No se pudo determinar el tipo de la imagen.');
  }

  const type = normalizeMimeType(file.type);
  if (!ALLOWED_IMAGE_TYPES.includes(type)) {
    throw new Error('Solo se permiten imágenes JPG, PNG, WEBP o AVIF.');
  }

  if (file.size > IMAGE_MAX_BYTES) {
    throw new Error(`La imagen no puede superar ${IMAGE_MAX_MB} MB.`);
  }
};

const resolveTargetSizeMb = (override?: number) => {
  if (override && Number.isFinite(override) && override > 0) {
    return Math.min(override, IMAGE_MAX_MB);
  }
  return Math.min(DEFAULT_TARGET_MAX_MB, IMAGE_MAX_MB);
};

export const processImageFile = async (
  file: File,
  options?: { maxSizeMB?: number; maxWidthOrHeight?: number }
): Promise<ImageProcessingResult> => {
  validateImageFile(file);

  const targetMaxSizeMb = resolveTargetSizeMb(options?.maxSizeMB);
  const targetMaxBytes = Math.round(targetMaxSizeMb * 1024 * 1024);
  const maxWidthOrHeight = options?.maxWidthOrHeight ?? DEFAULT_MAX_DIMENSION;

  if (file.size <= targetMaxBytes) {
    return {
      file,
      originalBytes: file.size,
      processedBytes: file.size,
      wasCompressed: false,
    };
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: targetMaxSizeMb,
    maxWidthOrHeight,
    useWebWorker: true,
    initialQuality: 0.9,
  });

  const finalFile = compressed.size <= file.size ? compressed : file;

  if (finalFile.size > IMAGE_MAX_BYTES) {
    throw new Error(`La imagen comprimida supera ${IMAGE_MAX_MB} MB.`);
  }

  return {
    file: finalFile,
    originalBytes: file.size,
    processedBytes: finalFile.size,
    wasCompressed: finalFile.size < file.size,
  };
};
