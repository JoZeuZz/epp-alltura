export type ImageSize = 'thumb' | 'medium' | 'full';

export const DEFAULT_IMAGE_PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="400"%3E%3Crect fill="%23e5e7eb" width="100%25" height="100%25"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="20" font-weight="bold" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImagen no disponible%3C/text%3E%3C/svg%3E';

export const appendQueryParam = (url: string, key: string, value: string) => {
  try {
    const isAbsolute = /^https?:\/\//i.test(url);
    const parsed = new URL(url, isAbsolute ? undefined : window.location.origin);
    parsed.searchParams.set(key, value);
    return isAbsolute ? parsed.toString() : `${parsed.pathname}${parsed.search}`;
  } catch (_error) {
    return url;
  }
};

export const buildImageUrl = (url?: string | null, size: ImageSize = 'full') => {
  if (!url) return '';
  if (size === 'full') return url;

  try {
    const isAbsolute = /^https?:\/\//i.test(url);
    const parsed = new URL(url, isAbsolute ? undefined : window.location.origin);

    if (!parsed.pathname.includes('/api/image-proxy')) {
      return url;
    }

    parsed.searchParams.set('size', size);
    return isAbsolute ? parsed.toString() : `${parsed.pathname}${parsed.search}`;
  } catch (_error) {
    return url;
  }
};
