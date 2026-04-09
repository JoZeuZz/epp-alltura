import React from 'react';

/**
 * Variantes predefinidas de grid responsive
 */
export type GridVariant = 'cards' | 'stats' | 'compact' | 'wide' | 'auto';

/**
 * Tamaños de gap entre elementos
 */
export type GridGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Props del componente ResponsiveGrid
 */
export interface ResponsiveGridProps {
  /** Variante de grid que determina el número de columnas en cada breakpoint */
  variant?: GridVariant;
  /** Tamaño del espacio entre elementos */
  gap?: GridGap;
  /** Clases adicionales de Tailwind */
  className?: string;
  /** Contenido del grid */
  children: React.ReactNode;
  /** ID opcional para el grid */
  id?: string;
}

/**
 * Configuración de columnas para cada variante
 * Formato: grid-cols-{mobile} sm:grid-cols-{sm} md:grid-cols-{md} lg:grid-cols-{lg} xl:grid-cols-{xl}
 */
const gridVariants: Record<GridVariant, string> = {
  // Cards: Ideal para tarjetas de productos, proyectos, etc.
  // Móvil: 1 col, Tablet: 2 cols, Desktop: 3 cols, Large: 4 cols
  cards: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  
  // Stats: Ideal para métricas y estadísticas en dashboards
  // Móvil: 2 cols, Desktop: 4 cols (optimizado para aprovechar espacio en mobile)
  stats: 'grid-cols-2 lg:grid-cols-4',
  
  // Compact: Ideal para elementos pequeños como badges, iconos, etc.
  // Móvil: 2 cols, Tablet: 4 cols, Desktop: 6 cols
  compact: 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6',
  
  // Wide: Ideal para contenido que necesita más espacio
  // Móvil: 1 col, Desktop: 2 cols
  wide: 'grid-cols-1 md:grid-cols-2',
  
  // Auto: Las columnas se ajustan automáticamente según el contenido
  auto: 'grid-cols-auto-fit',
};

/**
 * Tamaños de gap responsive
 */
const gapSizes: Record<GridGap, string> = {
  xs: 'gap-2',
  sm: 'gap-3 md:gap-4',
  md: 'gap-4 md:gap-6',
  lg: 'gap-6 md:gap-8',
  xl: 'gap-8 md:gap-10',
};

/**
 * Componente ResponsiveGrid
 * 
 * Grid responsive reutilizable que se adapta automáticamente a diferentes tamaños de pantalla.
 * Proporciona variantes predefinidas para casos de uso comunes.
 * 
 * @example
 * // Grid de tarjetas de proyectos
 * <ResponsiveGrid variant="cards" gap="md">
 *   {projects.map(project => <ProjectCard key={project.id} {...project} />)}
 * </ResponsiveGrid>
 * 
 * @example
 * // Grid de métricas en dashboard
 * <ResponsiveGrid variant="stats" gap="lg">
 *   <StatCard title="Total" value={100} />
 *   <StatCard title="Activos" value={75} />
 *   <StatCard title="Completados" value={25} />
 * </ResponsiveGrid>
 */
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  variant = 'cards',
  gap = 'md',
  className = '',
  children,
  id,
}) => {
  const gridClasses = gridVariants[variant];
  const gapClasses = gapSizes[gap];

  return (
    <div
      id={id}
      className={`grid ${gridClasses} ${gapClasses} ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * Componente para grid personalizado cuando las variantes predefinidas no son suficientes
 */
export interface CustomGridProps {
  /** Columnas en móvil (base) */
  cols?: number;
  /** Columnas en sm (640px+) */
  smCols?: number;
  /** Columnas en md (768px+) */
  mdCols?: number;
  /** Columnas en lg (1024px+) */
  lgCols?: number;
  /** Columnas en xl (1280px+) */
  xlCols?: number;
  /** Columnas en 2xl (1536px+) */
  xxlCols?: number;
  /** Tamaño del gap */
  gap?: GridGap;
  /** Clases adicionales */
  className?: string;
  /** Contenido */
  children: React.ReactNode;
}

/**
 * Grid personalizado para casos donde se necesita control total sobre las columnas
 * 
 * @example
 * <CustomGrid cols={1} mdCols={3} lgCols={5} gap="lg">
 *   {items.map(item => <Item key={item.id} {...item} />)}
 * </CustomGrid>
 */
export const CustomGrid: React.FC<CustomGridProps> = ({
  cols = 1,
  smCols,
  mdCols,
  lgCols,
  xlCols,
  xxlCols,
  gap = 'md',
  className = '',
  children,
}) => {
  const gapClasses = gapSizes[gap];
  
  const colsClasses = [
    `grid-cols-${cols}`,
    smCols && `sm:grid-cols-${smCols}`,
    mdCols && `md:grid-cols-${mdCols}`,
    lgCols && `lg:grid-cols-${lgCols}`,
    xlCols && `xl:grid-cols-${xlCols}`,
    xxlCols && `2xl:grid-cols-${xxlCols}`,
  ].filter(Boolean).join(' ');

  return (
    <div className={`grid ${colsClasses} ${gapClasses} ${className}`}>
      {children}
    </div>
  );
};
