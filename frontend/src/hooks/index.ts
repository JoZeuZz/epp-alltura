/**
 * Barrel export para hooks personalizados
 * Facilita la importación de múltiples hooks desde un solo punto
 */

// Hooks existentes
export { useFormErrors } from './useFormErrors';
export { useGet } from './useGet';
export { usePost, usePut, useDelete } from './useMutate';
export { useScaffoldValidation } from './useScaffoldValidation';

// Hooks responsive (nuevos)
export { useMediaQuery } from './useMediaQuery';
export { 
  useBreakpoint, 
  useBreakpoints, 
  useBreakpointDown, 
  useBreakpointUp,
  BREAKPOINTS,
  type Breakpoint 
} from './useBreakpoint';
export { useScaffoldPermissions } from './useScaffoldPermissions';
