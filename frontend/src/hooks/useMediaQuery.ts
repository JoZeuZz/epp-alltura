import { useState, useEffect } from 'react';

/**
 * Hook personalizado para detectar media queries y cambios en el tamaño de pantalla
 * 
 * @param query - Media query CSS (ej: '(min-width: 768px)')
 * @returns boolean indicando si la media query coincide
 * 
 * @example
 * const isMobile = useMediaQuery('(max-width: 640px)');
 * const isDesktop = useMediaQuery('(min-width: 1024px)');
 */
export const useMediaQuery = (query: string): boolean => {
  // Inicializar con false para evitar hydration mismatch en SSR
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // Crear el objeto MediaQueryList
    const media = window.matchMedia(query);
    
    // Establecer el valor inicial
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    // Listener para cambios en la media query
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Agregar listener (compatible con navegadores modernos y antiguos)
    if (media.addEventListener) {
      media.addEventListener('change', listener);
    } else {
      // Fallback para navegadores antiguos
      media.addListener(listener);
    }

    // Cleanup
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener);
      } else {
        media.removeListener(listener);
      }
    };
  }, [matches, query]);

  return matches;
};
