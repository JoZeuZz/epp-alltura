# Proyecto de Reportabilidad - Frontend

Este proyecto es la interfaz de usuario para la aplicación de reportabilidad de Alltura.

## Tecnologías

- React 19.1.1
- TypeScript
- Tailwind CSS 3.4.4
- Vite 6
- React Router v7
- @tanstack/react-query

## 📱 Sistema Responsive

La aplicación cuenta con un **sistema de diseño responsive completo** que garantiza una experiencia óptima en todos los dispositivos.

### Breakpoints Personalizados

| Breakpoint | Ancho | Dispositivo |
|------------|-------|-------------|
| `xs` | 480px | Smartphones grandes |
| `sm` | 640px | Tablets pequeñas |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops/Desktop |
| `xl` | 1280px | Pantallas grandes |
| `2xl` | 1536px | Pantallas muy grandes |

### Hooks Disponibles

```tsx
import { useBreakpoint, useBreakpoints, useMediaQuery } from './hooks';

// Hook para breakpoint actual
const breakpoint = useBreakpoint(); // 'base' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

// Hook para múltiples estados
const { isMobile, isTablet, isDesktop, isLg, isXl } = useBreakpoints();

// Hook para media queries personalizadas
const isDark = useMediaQuery('(prefers-color-scheme: dark)');
```

### Componentes Responsive

#### ResponsiveGrid
Grid adaptativo con variantes predefinidas:

```tsx
import { ResponsiveGrid } from './components/layout';

// Variantes: 'cards' | 'stats' | 'compact' | 'wide'
<ResponsiveGrid variant="cards" gap="lg">
  {items.map(item => <Card key={item.id} {...item} />)}
</ResponsiveGrid>
```

#### Container & Section
Contenedores con ancho máximo y padding responsive:

```tsx
import { Container, Section } from './components/layout';

<Container variant="default" padding="md">
  <Section variant="card" padding="lg">
    {/* Contenido */}
  </Section>
</Container>
```

#### ResponsiveTable
Tabla con scroll horizontal y ocultación de columnas:

```tsx
import { ResponsiveTable } from './components/layout';

<ResponsiveTable
  columns={[
    { key: 'name', header: 'Nombre' },
    { key: 'email', header: 'Email', hideOnMobile: true },
  ]}
  data={items}
  onRowClick={handleClick}
/>
```

#### Componentes de Formulario
Inputs optimizados con touch targets y accesibilidad:

```tsx
import { FormInput, FormSelect, FormTextarea, FormButtons } from './components/forms';

<FormInput
  id="email"
  name="email"
  label="Correo Electrónico"
  type="email"
  required
  error={errors?.email}
/>

<FormButtons
  submitText="Guardar"
  onCancel={handleCancel}
  isSubmitting={isSubmitting}
/>
```

### Sistema Tipográfico

Clases estandarizadas con tamaños responsive:

```tsx
<h1 className="heading-1">Título Principal</h1>
<h2 className="heading-2">Subtítulo</h2>
<p className="body-base">Texto normal</p>
<p className="body-small text-gray-500">Texto secundario</p>
<span className="stat-large text-primary-blue">1,234</span>
```

**Clases disponibles:**
- Headings: `heading-hero`, `heading-1`, `heading-2`, `heading-3`, `heading-4`
- Body: `body-large`, `body-base`, `body-small`
- Labels: `label-large`, `label-base`
- Stats: `stat-large`, `stat-base`, `stat-small`

### Documentación Completa

Para más detalles sobre el sistema responsive, consulta:
📖 **[Guía de Sistema Responsive](./docs/RESPONSIVE_GUIDE.md)**

Incluye:
- Ejemplos de uso completos
- Mejores prácticas
- Patrones de diseño
- Guía de accesibilidad

## Scripts Disponibles

En el directorio del proyecto, puedes ejecutar:

### `npm run dev`

Ejecuta la aplicación en modo de desarrollo con Vite.\
Abre http://localhost:5173 (o el puerto que indique Vite) para verla en tu navegador.

La página se recargará si haces cambios.\
También verás cualquier error de lint en la consola.

### `npm test`

Lanza el corredor de pruebas en modo interactivo.

### `npm run build`

Construye la aplicación para producción en la carpeta `dist`.\
Empaqueta React correctamente en modo de producción y optimiza la compilación para obtener el mejor rendimiento.

### `npm run preview`

Sirve la build de producción de forma local para previsualizarla.

## Aprender Más

Para aprender React, consulta la [documentación de React](https://reactjs.org/).
