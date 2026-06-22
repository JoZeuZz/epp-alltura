import { describe, it, expect, beforeEach } from 'vitest';
import { buildImageUrl, appendQueryParam } from '../utils/image';

// Regression: a runtime image field that arrives as an object (typed as string)
// must never reach an <img src>, or the browser resolves "[object Object]" as a
// relative URL (e.g. /inventario/[object Object]) and fires a wasted server GET.
describe('buildImageUrl — non-string hardening', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { origin: 'https://inventario.alltura.cl' },
    });
  });

  it('returns a string for valid proxy urls', () => {
    const out = buildImageUrl('/api/image-proxy?token=abc', 'medium');
    expect(typeof out).toBe('string');
    expect(out).toContain('size=medium');
  });

  it('never returns a non-string when given an object', () => {
    // @ts-expect-error simulating bad runtime payload
    const out = buildImageUrl({ url: '/api/image-proxy?token=abc' }, 'medium');
    expect(typeof out).toBe('string');
    expect(out).toBe('');
    expect(String(out)).not.toContain('[object Object]');
  });

  it('appendQueryParam never returns a non-string when given an object', () => {
    // @ts-expect-error simulating bad runtime payload
    const out = appendQueryParam({ foo: 1 }, 'size', 'thumb');
    expect(typeof out).toBe('string');
    expect(out).toBe('');
  });
});
