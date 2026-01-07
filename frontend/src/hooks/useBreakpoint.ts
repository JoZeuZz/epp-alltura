import { useMediaQuery } from './useMediaQuery';

/**
 * Tipo que representa los breakpoints disponibles en Tailwind CSS
 */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'base';

/**
 * Breakpoints de Tailwind CSS (en píxeles)
 */
export const BREAKPOINTS = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Hook que retorna el breakpoint actual basado en el ancho de pantalla
 * 
 * @returns El breakpoint actual ('xs', 'sm', 'md', 'lg', 'xl', '2xl', o 'base')
 * 
 * @example
 * const breakpoint = useBreakpoint();
 * 
 * if (breakpoint === 'base' || breakpoint === 'xs') {
 *   // Lógica para móvil
 * }
 */
export const useBreakpoint = (): Breakpoint => {
  const isXs = useMediaQuery(`(min-width: ${BREAKPOINTS.xs}px)`);
  const isSm = useMediaQuery(`(min-width: ${BREAKPOINTS.sm}px)`);
  const isMd = useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`);
  const isLg = useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
  const isXl = useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`);
  const is2xl = useMediaQuery(`(min-width: ${BREAKPOINTS['2xl']}px)`);

  if (is2xl) return '2xl';
  if (isXl) return 'xl';
  if (isLg) return 'lg';
  if (isMd) return 'md';
  if (isSm) return 'sm';
  if (isXs) return 'xs';
  return 'base';
};

/**
 * Hook que retorna un objeto con booleanos para cada breakpoint
 * Útil cuando necesitas verificar múltiples breakpoints
 * 
 * @returns Objeto con propiedades booleanas para cada breakpoint
 * 
 * @example
 * const { isMobile, isTablet, isDesktop } = useBreakpoints();
 * 
 * return (
 *   <div>
 *     {isMobile && <MobileNav />}
 *     {isDesktop && <DesktopNav />}
 *   </div>
 * );
 */
export const useBreakpoints = () => {
  const isXs = useMediaQuery(`(min-width: ${BREAKPOINTS.xs}px)`);
  const isSm = useMediaQuery(`(min-width: ${BREAKPOINTS.sm}px)`);
  const isMd = useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`);
  const isLg = useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
  const isXl = useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`);
  const is2xl = useMediaQuery(`(min-width: ${BREAKPOINTS['2xl']}px)`);

  return {
    // Breakpoints individuales
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2xl,
    
    // Alias semánticos útiles
    isMobile: !isSm,        // < 640px
    isTablet: isSm && !isLg, // 640px - 1023px
    isDesktop: isLg,         // >= 1024px
    
    // Categorías adicionales
    isSmallScreen: !isMd,    // < 768px
    isMediumScreen: isMd && !isXl, // 768px - 1279px
    isLargeScreen: isXl,     // >= 1280px
  };
};

/**
 * Hook que verifica si el viewport es menor o igual a un breakpoint específico
 * 
 * @param breakpoint - El breakpoint a verificar
 * @returns boolean indicando si el viewport es menor o igual al breakpoint
 * 
 * @example
 * const isMobileOrSmaller = useBreakpointDown('sm');
 */
export const useBreakpointDown = (breakpoint: keyof typeof BREAKPOINTS): boolean => {
  return useMediaQuery(`(max-width: ${BREAKPOINTS[breakpoint] - 1}px)`);
};

/**
 * Hook que verifica si el viewport es mayor o igual a un breakpoint específico
 * 
 * @param breakpoint - El breakpoint a verificar
 * @returns boolean indicando si el viewport es mayor o igual al breakpoint
 * 
 * @example
 * const isTabletOrLarger = useBreakpointUp('md');
 */
export const useBreakpointUp = (breakpoint: keyof typeof BREAKPOINTS): boolean => {
  return useMediaQuery(`(min-width: ${BREAKPOINTS[breakpoint]}px)`);
};
