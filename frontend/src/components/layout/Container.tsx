import React from 'react';

/**
 * Variantes de contenedor
 */
export type ContainerVariant = 'default' | 'narrow' | 'wide' | 'full';

/**
 * Props del componente Container
 */
export interface ContainerProps {
  /** Variante que determina el ancho máximo */
  variant?: ContainerVariant;
  /** Padding horizontal */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Clases adicionales */
  className?: string;
  /** Contenido */
  children: React.ReactNode;
  /** ID opcional */
  id?: string;
}

/**
 * Anchos máximos para cada variante
 */
const containerVariants: Record<ContainerVariant, string> = {
  default: 'max-w-7xl',  // 1280px - Ideal para la mayoría de contenido
  narrow: 'max-w-4xl',   // 896px - Ideal para formularios y contenido de lectura
  wide: 'max-w-full',    // Sin límite - Usa todo el ancho disponible
  full: 'w-full',        // 100% sin padding lateral del container
};

/**
 * Padding horizontal responsive
 */
const paddingSizes = {
  none: '',
  sm: 'px-4',
  md: 'px-4 md:px-6 lg:px-8',
  lg: 'px-4 md:px-8 lg:px-12',
};

/**
 * Componente Container
 * 
 * Contenedor responsive que centra el contenido y limita el ancho máximo.
 * Proporciona padding lateral adaptativo.
 * 
 * @example
 * <Container variant="default" padding="md">
 *   <h1>Contenido centrado con ancho máximo</h1>
 * </Container>
 * 
 * @example
 * <Container variant="narrow" padding="lg">
 *   <form>Formulario con ancho limitado para mejor legibilidad</form>
 * </Container>
 */
export const Container: React.FC<ContainerProps> = ({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  id,
}) => {
  const variantClasses = containerVariants[variant];
  const paddingClasses = paddingSizes[padding];

  return (
    <div
      id={id}
      className={`${variantClasses} mx-auto ${paddingClasses} ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * Props del componente Section
 */
export interface SectionProps {
  /** Espaciado vertical */
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Color de fondo */
  background?: 'white' | 'gray' | 'transparent';
  /** Clases adicionales */
  className?: string;
  /** Contenido */
  children: React.ReactNode;
  /** ID opcional para navegación */
  id?: string;
}

/**
 * Espaciado vertical responsive
 */
const spacingSizes = {
  none: '',
  sm: 'py-4 md:py-6',
  md: 'py-6 md:py-10',
  lg: 'py-8 md:py-12 lg:py-16',
  xl: 'py-12 md:py-16 lg:py-24',
};

/**
 * Colores de fondo
 */
const backgrounds = {
  white: 'bg-white',
  gray: 'bg-gray-50',
  transparent: 'bg-transparent',
};

/**
 * Componente Section
 * 
 * Sección de página con espaciado vertical adaptativo.
 * Útil para dividir el contenido de la página en secciones lógicas.
 * 
 * @example
 * <Section spacing="lg" background="gray">
 *   <Container>
 *     <h2>Sección de contenido</h2>
 *   </Container>
 * </Section>
 */
export const Section: React.FC<SectionProps> = ({
  spacing = 'md',
  background = 'transparent',
  className = '',
  children,
  id,
}) => {
  const spacingClasses = spacingSizes[spacing];
  const backgroundClasses = backgrounds[background];

  return (
    <section
      id={id}
      className={`${spacingClasses} ${backgroundClasses} ${className}`}
    >
      {children}
    </section>
  );
};
