import { renderHook } from '@testing-library/react';
import { useBreakpoint, useBreakpoints } from '../hooks/useBreakpoint';
import { useMediaQuery } from '../hooks/useMediaQuery';

/**
 * Tests básicos para hooks responsive
 * 
 * Nota: Estos tests requieren configuración adicional de jsdom
 * para simular window.matchMedia correctamente.
 */

describe('Responsive Hooks', () => {
  // Mock de window.matchMedia
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  describe('useMediaQuery', () => {
    it('should return false by default', () => {
      const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
      expect(result.current).toBe(false);
    });

    it('should accept valid media query strings', () => {
      const queries = [
        '(min-width: 640px)',
        '(max-width: 1024px)',
        '(orientation: landscape)',
        '(prefers-color-scheme: dark)',
      ];

      queries.forEach((query) => {
        const { result } = renderHook(() => useMediaQuery(query));
        expect(typeof result.current).toBe('boolean');
      });
    });
  });

  describe('useBreakpoint', () => {
    it('should return base breakpoint by default', () => {
      const { result } = renderHook(() => useBreakpoint());
      expect(result.current).toBe('base');
    });

    it('should return valid breakpoint values', () => {
      const { result } = renderHook(() => useBreakpoint());
      const validBreakpoints = ['base', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'];
      expect(validBreakpoints).toContain(result.current);
    });
  });

  describe('useBreakpoints', () => {
    it('should return object with boolean properties', () => {
      const { result } = renderHook(() => useBreakpoints());
      
      expect(typeof result.current.isXs).toBe('boolean');
      expect(typeof result.current.isSm).toBe('boolean');
      expect(typeof result.current.isMd).toBe('boolean');
      expect(typeof result.current.isLg).toBe('boolean');
      expect(typeof result.current.isXl).toBe('boolean');
      expect(typeof result.current.is2xl).toBe('boolean');
      
      expect(typeof result.current.isMobile).toBe('boolean');
      expect(typeof result.current.isTablet).toBe('boolean');
      expect(typeof result.current.isDesktop).toBe('boolean');
    });

    it('should have mobile true when not sm', () => {
      const { result } = renderHook(() => useBreakpoints());
      // Por defecto todos son false, así que isMobile debería ser true
      expect(result.current.isMobile).toBe(true);
    });
  });
});

/**
 * Tests de integración para verificar comportamiento responsive
 * 
 * Estos tests verifican que los componentes respondan correctamente
 * a cambios en el viewport.
 */
describe('Responsive Integration', () => {
  describe('Viewport Changes', () => {
    it('should detect mobile viewport', () => {
      // Simular viewport móvil (< 640px)
      window.innerWidth = 375;
      window.dispatchEvent(new Event('resize'));
      
      const { result } = renderHook(() => useBreakpoints());
      expect(result.current.isMobile).toBe(true);
    });

    // Nota: Estos tests requieren configuración más avanzada
    // con @testing-library/react-hooks y simulación de resize events
  });
});
