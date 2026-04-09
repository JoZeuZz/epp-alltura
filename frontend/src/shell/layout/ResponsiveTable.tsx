import React from 'react';

/**
 * Props para las columnas de la tabla
 */
export interface TableColumn<T = any> {
  /** Clave del campo en los datos */
  key: keyof T | string;
  /** Texto del encabezado de la columna */
  header: string;
  /** Función de renderizado personalizado (opcional) */
  render?: (value: any, row: T, index: number) => React.ReactNode;
  /** Clases adicionales para la celda */
  className?: string;
  /** Ocultar columna en móvil (< md) */
  hideOnMobile?: boolean;
  /** Ocultar columna en tablet (< lg) */
  hideOnTablet?: boolean;
  /** Alineación del contenido */
  align?: 'left' | 'center' | 'right';
}

/**
 * Props del componente ResponsiveTable
 */
export interface ResponsiveTableProps<T = any> {
  /** Configuración de columnas */
  columns: TableColumn<T>[];
  /** Datos de la tabla */
  data: T[];
  /** Texto para lectores de pantalla */
  caption?: string;
  /** Clases adicionales para el contenedor */
  className?: string;
  /** Callback al hacer clic en una fila */
  onRowClick?: (row: T, index: number) => void;
  /** Clase condicional para filas */
  rowClassName?: (row: T, index: number) => string;
  /** Función para obtener la key única de cada fila */
  getRowKey?: (row: T, index: number) => string | number;
  /** Mostrar indicador de carga */
  loading?: boolean;
  /** Mensaje cuando no hay datos */
  emptyMessage?: string;
}

/**
 * Componente de tabla responsive con scroll horizontal
 * 
 * Características:
 * - Scroll horizontal suave en móvil/tablet
 * - Scrollbar personalizado
 * - Columnas ocultables por breakpoint
 * - Accesible (ARIA labels, caption)
 * - Personalizable por fila y columna
 * 
 * @example
 * ```tsx
 * const columns: TableColumn<Project>[] = [
 *   { key: 'name', header: 'Nombre' },
 *   { key: 'client', header: 'Cliente', hideOnMobile: true },
 *   { 
 *     key: 'status', 
 *     header: 'Estado',
 *     render: (value) => <StatusBadge status={value} />
 *   },
 *   { 
 *     key: 'actions', 
 *     header: 'Acciones',
 *     align: 'right',
 *     render: (_, row) => <ActionsMenu project={row} />
 *   },
 * ];
 * 
 * <ResponsiveTable
 *   columns={columns}
 *   data={projects}
 *   caption="Lista de proyectos activos"
 *   onRowClick={(project) => navigate(`/projects/${project.id}`)}
 * />
 * ```
 */
export function ResponsiveTable<T = any>({
  columns,
  data,
  caption,
  className = '',
  onRowClick,
  rowClassName,
  getRowKey,
  loading = false,
  emptyMessage = 'No hay datos para mostrar',
}: ResponsiveTableProps<T>) {
  
  // Función para obtener el valor de una celda
  const getCellValue = (row: T, key: string | keyof T): any => {
    if (typeof key === 'string' && key.includes('.')) {
      // Soporte para claves anidadas (ej: 'client.name')
      return key.split('.').reduce((obj: any, k) => obj?.[k], row);
    }
    return (row as any)[key];
  };

  // Función para obtener la alineación de texto
  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  // Función para obtener clases de visibilidad responsive
  const getVisibilityClass = (column: TableColumn<T>) => {
    const classes = [];
    if (column.hideOnMobile) classes.push('hidden md:table-cell');
    else if (column.hideOnTablet) classes.push('hidden lg:table-cell');
    return classes.join(' ');
  };

  return (
    <div className={`bg-white shadow-md rounded-lg overflow-hidden ${className}`}>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-full leading-normal">
          {/* Caption para accesibilidad */}
          {caption && <caption className="sr-only">{caption}</caption>}
          
          {/* Encabezados */}
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={`header-${index}`}
                  scope="col"
                  className={`
                    px-5 py-3 border-b-2 border-gray-200 bg-gray-100 
                    text-xs font-semibold text-gray-600 uppercase tracking-wider
                    ${getAlignClass(column.align)}
                    ${getVisibilityClass(column)}
                    ${column.className || ''}
                  `}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Cuerpo de la tabla */}
          <tbody>
            {loading ? (
              // Estado de carga
              <tr>
                <td colSpan={columns.length} className="px-5 py-10 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
                    <span className="ml-3 text-gray-600">Cargando...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              // Estado vacío
              <tr>
                <td colSpan={columns.length} className="px-5 py-10 text-center text-gray-600">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              // Datos
              data.map((row, rowIndex) => {
                const key = getRowKey ? getRowKey(row, rowIndex) : rowIndex;
                const additionalRowClass = rowClassName ? rowClassName(row, rowIndex) : '';
                const isClickable = !!onRowClick;

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row, rowIndex)}
                    className={`
                      ${additionalRowClass}
                      ${isClickable ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}
                    `}
                  >
                    {columns.map((column, colIndex) => {
                      const cellValue = getCellValue(row, column.key);
                      const content = column.render 
                        ? column.render(cellValue, row, rowIndex)
                        : cellValue;

                      return (
                        <td
                          key={`cell-${rowIndex}-${colIndex}`}
                          className={`
                            px-5 py-5 border-b border-gray-200 bg-white text-sm
                            ${getAlignClass(column.align)}
                            ${getVisibilityClass(column)}
                            ${column.className || ''}
                          `}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ResponsiveTable;
