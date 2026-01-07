# Sistema de Diseño Responsive - Enero 7, 2026

## Resumen Ejecutivo

Implementación completa de diseño responsive para la aplicación Alltura, transformando tablas de gestión en cards para mobile y optimizando todas las páginas principales para dispositivos móviles.

**Fecha de Implementación:** Enero 7, 2026  
**Estrategia:** Mobile-first con breakpoints Tailwind CSS  
**Páginas Refactorizadas:** 5 páginas principales (Users, Clients, Projects, Scaffolds, Profile)

---

## 1. ARQUITECTURA DE COMPONENTES RESPONSIVE

### 1.1 Sistema de Cards (Mobile-First)

**Ubicación Base:** `frontend/src/components/cards/`

**Estructura:**
```
cards/
├── EntityCard.tsx       # Componente base reutilizable
├── UserCard.tsx         # Cards específicas de usuarios
├── ClientCard.tsx       # Cards específicas de clientes
├── ProjectCard.tsx      # Cards específicas de proyectos
└── index.ts            # Barrel export
```

---

### 1.2 EntityCard - Componente Base

**Ubicación:** `frontend/src/components/cards/EntityCard.tsx`

**Props Interface:**
```typescript
interface InfoField {
  label: string;
  value: string | React.ReactNode;
  hide?: boolean;  // Para campos condicionales
}

interface CardAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  icon?: React.ReactNode;
  show?: boolean;  // Para acciones condicionales
}

interface EntityCardProps {
  title: string;
  badge?: React.ReactNode;
  fields: InfoField[];
  actions?: CardAction[];
}
```

**Características:**
- **InfoRow**: Componente interno para pares label-value
- **ActionButton**: Botón minimalista optimizado para touch
- **Layout**: Flex-wrap para distribución compacta de botones
- **Accesibilidad**: Diseñado para touch targets (mínimo 44px)

**Diseño Minimalista:**
```tsx
// ActionButton styling
const baseClasses = "px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5";

// Icon size
<div className="w-3.5 h-3.5">{icon}</div>

// Variant colors (suaves, no sólidos)
const variantClasses = {
  danger: 'bg-red-50 text-red-700 hover:bg-red-100',
  success: 'bg-green-50 text-green-700 hover:bg-green-100',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  primary: 'bg-blue-50 text-blue-700 hover:bg-blue-100'
};
```

---

### 1.3 UserCard - Cards de Usuarios

**Ubicación:** `frontend/src/components/cards/UserCard.tsx`

**Fields mostrados:**
- Email
- Rol (con RoleBadge colorido)
- Fecha de creación (formateada)

**Actions:**
- Historial (condicional, solo si `onHistory` existe)
- Editar
- Eliminar

**Badge Component:**
```tsx
<RoleBadge role={user.role} />
// admin → bg-purple-100 text-purple-800
// supervisor → bg-blue-100 text-blue-800
// client → bg-green-100 text-green-800
```

**Tipos:**
```typescript
import { User } from '../../types/api';  // NO tipos locales

interface UserCardProps {
  user: User;
  onEdit: (user?: User | null) => void;
  onDelete: (userId: number) => void;
  onHistory?: (user: User) => void;  // Opcional
}
```

---

### 1.4 ClientCard - Cards de Clientes

**Ubicación:** `frontend/src/components/cards/ClientCard.tsx`

**Fields mostrados:**
- Email (condicional, hide si no existe)
- Teléfono (condicional)
- Especialidad (condicional)
- Fecha de creación

**Actions (condicionales por estado):**
- Si activo: Editar + Eliminar
- Si inactivo: Reactivar

**Badge Component:**
```tsx
<StatusBadge active={client.active} />
// true → bg-green-100 text-green-800 "Activo"
// false/undefined → bg-gray-100 text-gray-800 "Inactivo"
```

**Tipos:**
```typescript
import { Client } from '../../types/api';

interface ClientCardProps {
  client: Client;
  onEdit: (client?: Client | null) => void;
  onDelete: (clientId: number) => void;
  onReactivate?: (clientId: number) => void;  // Opcional
}
```

---

### 1.5 ProjectCard - Cards de Proyectos

**Ubicación:** `frontend/src/components/cards/ProjectCard.tsx`

**Fields mostrados:**
- Cliente
- Cliente Asignado (condicional)
- Supervisor Asignado (condicional)
- Estado del proyecto
- Fecha de creación

**Actions (lógica compleja por estado):**
```typescript
// Proyecto activo con cliente activo
if (project.active && project.client_active) {
  actions = [Asignar, Editar, Eliminar];
}
// Proyecto inactivo con cliente activo
else if (!project.active && project.client_active) {
  actions = [Reactivar];
}
// Cliente inactivo
else if (!project.client_active) {
  actions = [];  // Sin acciones
}
```

**Badge Component:**
```tsx
<ProjectStatusBadge project={project} />
// Lógica compleja:
// - active && client_active → bg-green-100 "Activo"
// - !active && client_active → bg-gray-100 "Desactivado"
// - !client_active → bg-red-100 "Cliente Inactivo"
```

**Tipos:**
```typescript
import { Project } from '../../types/api';

interface ProjectCardProps {
  project: Project;
  onEdit: (project?: Project | null) => void;
  onDelete: (projectId: number) => void;
  onAssign?: (project: Project) => void;
  onReactivate?: (projectId: number) => void;
}
```

---

## 2. PÁGINAS REFACTORIZADAS

### 2.1 UsersPage - Gestión de Usuarios

**Ubicación:** `frontend/src/pages/admin/UsersPage.tsx`

**Hook de Responsividad:**
```tsx
import { useBreakpoints } from '../../hooks';
const { isMobile } = useBreakpoints();  // isMobile = ancho < 640px
```

**Renderizado Condicional:**
```tsx
{isMobile ? (
  <ResponsiveGrid variant="wide">
    {users.map(user => (
      <UserCard
        key={user.id}
        user={user}
        onEdit={handleOpenModal}
        onDelete={handleDelete}
        onHistory={handleOpenHistoryModal}
      />
    ))}
  </ResponsiveGrid>
) : (
  <table className="w-full">
    {/* Tabla tradicional para desktop */}
  </table>
)}
```

**ResponsiveGrid Variant:**
```tsx
variant="wide"
// Mobile: 1 columna
// Tablet (640px+): 2 columnas
// Desktop: 2 columnas
```

---

### 2.2 ClientsPage - Gestión de Clientes

**Ubicación:** `frontend/src/pages/admin/ClientsPage.tsx`

**Mismo patrón que UsersPage:**
```tsx
{isMobile ? (
  <ResponsiveGrid variant="wide">
    {clients.map(client => (
      <ClientCard
        key={client.id}
        client={client}
        onEdit={handleOpenModal}
        onDelete={handleDelete}
        onReactivate={handleReactivate}
      />
    ))}
  </ResponsiveGrid>
) : (
  <table>...</table>
)}
```

**Callbacks:**
- `handleOpenModal(client)`: Abre modal de edición
- `handleDelete(clientId)`: Elimina/desactiva cliente
- `handleReactivate(clientId)`: Reactiva cliente inactivo

---

### 2.3 ProjectsPage - Gestión de Proyectos

**Ubicación:** `frontend/src/pages/admin/ProjectsPage.tsx`

**Callback Especial - handleReactivate:**
```tsx
const handleReactivate = async (projectId: number) => {
  try {
    const token = localStorage.getItem('accessToken');
    await axios.patch(`/api/projects/${projectId}/reactivate`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    toast.success('Proyecto reactivado correctamente');
    window.location.reload();
  } catch (error) {
    toast.error('Error al reactivar el proyecto');
  }
};
```

**Renderizado:**
```tsx
{isMobile ? (
  <ResponsiveGrid variant="wide">
    {filteredProjects.map(project => (
      <ProjectCard
        key={project.id}
        project={project}
        onEdit={handleOpenModal}
        onDelete={handleDeleteClick}
        onAssign={handleAssignClick}
        onReactivate={handleReactivate}
      />
    ))}
  </ResponsiveGrid>
) : (
  <table>...</table>
)}
```

---

### 2.4 ScaffoldsPage - Visualizador de Andamios (Admin)

**Ubicación:** `frontend/src/pages/admin/ScaffoldsPage.tsx`

**Optimizaciones Implementadas:**

#### A) Grid de Estadísticas (8 cards)

**Antes:**
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
  <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-gray-500">
    <p className="text-2xl font-bold">{stats.total}</p>
  </div>
</div>
```

**Después:**
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
  <div className="bg-gray-50 rounded-lg p-2.5 md:p-3 border-l-4 border-gray-500">
    <p className="text-xl md:text-2xl font-bold">{stats.total}</p>
  </div>
</div>
```

**Mejoras:**
- Mobile: 2 columnas (era igual)
- Tablet: 4 columnas (ahora desde 640px, antes desde 768px)
- Desktop: 8 columnas (sin cambio)
- Padding responsive: `p-2.5 md:p-3`
- Texto responsive: `text-xl md:text-2xl`

---

#### B) Selector de Proyecto y Filtros

**Antes:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <div className="md:col-span-1">
    <ProjectSelector />
  </div>
  <div className="md:col-span-3">
    <ScaffoldFilters />
  </div>
</div>
```

**Después:**
```tsx
<div className="space-y-4">
  <div>
    <ProjectSelector />
  </div>
  <div>
    <ScaffoldFilters />
  </div>
</div>
```

**Mejoras:**
- Layout vertical en todos los tamaños (más simple)
- Elimina complejidad de columnas
- Mejor UX en mobile (inputs más grandes)

---

#### C) ScaffoldFilters Component

**Ubicación:** `frontend/src/components/ScaffoldFilters.tsx`

**Optimizaciones:**
```tsx
// Removido wrapper con bg-white/shadow (ahora en parent)
<div>
  <h3 className="text-base md:text-lg font-medium mb-3 md:mb-4">Filtros</h3>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
    <select className="p-2 md:p-2.5 text-sm">
      {/* ... */}
    </select>
    <input type="date" className="p-2 md:p-2.5 text-sm" />
    <input type="date" className="p-2 md:p-2.5 text-sm" />
  </div>
</div>
```

**Mejoras:**
- Grid responsive: 1 col mobile → 3 cols tablet
- Inputs con `text-sm` para mejor UX en mobile
- Padding responsive
- Título con tamaño adaptativo

---

#### D) Botones de Acción (Crear/Exportar)

**Antes:**
```tsx
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
  <h2>Título</h2>
  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
    <button>Crear</button>
    <button>PDF</button>
    <button>Excel</button>
  </div>
</div>
```

**Después:**
```tsx
<div className="flex flex-col gap-4">
  <h2>Título</h2>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
    <button>Crear Andamio</button>
    <button>Exportar PDF</button>
    <button className="sm:col-span-2 lg:col-span-1">Exportar Excel</button>
  </div>
</div>
```

**Mejoras:**
- Mobile: 3 botones apilados verticalmente
- Tablet: Grid 2 columnas (Excel ocupa 2 espacios)
- Desktop: Grid 3 columnas (distribución uniforme)
- Mejor distribución de espacio
- Touch-friendly en todos los tamaños

---

#### E) ScaffoldGrid Component

**Ubicación:** `frontend/src/components/ScaffoldGrid.tsx`

**Optimizaciones:**
```tsx
<button className="bg-white rounded-lg shadow-md overflow-hidden ...">
  <img className="h-40 sm:h-48 w-full object-cover" />
  <div className="p-3 sm:p-4">
    <p className="text-lg sm:text-xl font-bold">{scaffold.cubic_meters} m³</p>
    <p className="text-sm text-gray-600">Dimensiones</p>
    <p className="text-xs sm:text-sm text-gray-500 mt-1">Fecha</p>
    <span className="mt-2 inline-block px-2 py-1 text-xs">Estado</span>
  </div>
</button>
```

**Mejoras:**
- Imagen responsive: `h-40 sm:h-48`
- Padding adaptativo: `p-3 sm:p-4`
- Texto responsive: `text-lg sm:text-xl`
- Fecha más pequeña en mobile: `text-xs sm:text-sm`
- Removido `min-h-touch` (ya es clickable naturalmente)

**Grid Layout (ya existente):**
```tsx
<ResponsiveGrid variant="cards" gap="lg">
  {/* Cards de andamios */}
</ResponsiveGrid>
```

---

### 2.5 ProfilePage - Perfil de Usuario

**Ubicación:** `frontend/src/pages/ProfilePage.tsx`

**Patrón de Diseño:** Formularios responsive con grid adaptativo

**Características:**
- **NO usa conditional rendering** (mismo formulario en todos los tamaños)
- Grid 2 columnas en tablet+, 1 columna en mobile
- Secciones separadas: Datos de cuenta + Información personal
- Upload de foto de perfil con preview
- Validación completa con React Hook Form + Zod

**Optimizaciones Implementadas:**

#### A) Layout Principal
```tsx
<div className="space-y-4 sm:space-y-6">
  <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Mi Perfil</h1>
  <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 max-w-3xl">
    {/* Form */}
  </div>
</div>
```

**Mejoras:**
- Spacing responsive: `space-y-4 sm:space-y-6`
- Título adaptativo: `text-2xl sm:text-3xl`
- Padding: `p-4 sm:p-6`
- Max-width para no expandir demasiado en desktop

---

#### B) Foto de Perfil
```tsx
<div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden ring-4 ring-gray-100">
  {imagePreview ? (
    <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover" />
  ) : (
    <UserIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
  )}
</div>
```

**Mejoras:**
- Avatar responsive: `w-24 h-24` mobile → `w-32 h-32` desktop
- Ring decorativo: `ring-4 ring-gray-100`
- Icono escalable: `w-12 h-12 sm:w-16 sm:h-16`

---

#### C) Grid de Inputs
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Nombre <span className="text-red-500">*</span>
    </label>
    <input className="w-full px-3 py-2 border rounded-lg" />
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Apellido <span className="text-red-500">*</span>
    </label>
    <input className="w-full px-3 py-2 border rounded-lg" />
  </div>
</div>
```

**Mejoras:**
- Grid responsive: `grid-cols-1 sm:grid-cols-2`
- Inputs con bordes redondeados: `rounded-lg`
- Focus states: `focus:ring-2 focus:ring-blue-500`
- Gap consistente: `gap-4`

---

#### D) Secciones Separadas
```tsx
{/* Datos de la Cuenta */}
<div>
  <h2 className="text-base sm:text-lg font-semibold text-dark-blue mb-3 sm:mb-4">
    Datos de la Cuenta
  </h2>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {/* Nombre, Apellido */}
  </div>
  <div className="mt-4">
    {/* Email (disabled) */}
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
    {/* Contraseñas */}
  </div>
</div>

{/* Información Personal */}
<div className="pt-6 border-t border-gray-200">
  <h2 className="text-base sm:text-lg font-semibold text-dark-blue mb-3 sm:mb-4">
    Información Personal
  </h2>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {/* RUT, Teléfono */}
  </div>
</div>
```

**Mejoras:**
- Separador visual: `border-t border-gray-200`
- Subtítulos responsive: `text-base sm:text-lg`
- Spacing adaptativo: `mb-3 sm:mb-4`
- Agrupación lógica de campos

---

#### E) Botón de Guardado
```tsx
<button
  type="submit"
  disabled={isSubmitting}
  className="w-full py-2.5 px-4 bg-primary-blue text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm"
>
  {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
</button>
```

**Mejoras:**
- Full-width: `w-full` (touch-friendly en mobile)
- Estados disabled: `disabled:bg-gray-400`
- Focus state: `focus:ring-2 focus:ring-blue-500`
- Loading text: `isSubmitting ? 'Guardando...' : 'Guardar Cambios'`

---

#### F) Campos Implementados

**Datos de Cuenta:**
- `first_name`: Nombre (requerido, max 100)
- `last_name`: Apellido (requerido, max 100)
- `email`: Email (disabled, no editable)
- `password`: Nueva contraseña (opcional, min 8, regex complejo)
- `confirmPassword`: Confirmar contraseña (validación de coincidencia)

**Información Personal:**
- `rut`: RUT chileno (opcional, max 20, placeholder: "12.345.678-9")
- `phone_number`: Teléfono (opcional, max 20, placeholder: "+56 9 1234 5678")

**Upload:**
- `profile_picture`: Foto de perfil (comprimida automáticamente con browser-image-compression)

---

#### G) Validaciones Backend

**Ya implementadas en `/users/me`:**
```javascript
// Validación Joi
const selfUpdateUserSchema = Joi.object({
  first_name: Joi.string().min(1).max(100),
  last_name: Joi.string().min(1).max(100),
  rut: Joi.string().pattern(/^[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9Kk]$/).allow('', null),
  phone_number: Joi.string().pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/).allow('', null),
  password: Joi.string().min(8)
});
```

**Ruta de upload:**
```javascript
// POST /users/me/picture
multer({ storage: multer.memoryStorage() }).single('profile_picture')
// Sube a Google Cloud Storage
// Actualiza user.profile_picture_url
```

---

#### H) UX Improvements

**Eliminados:**
- ❌ Variables de estado `error` y `success` (redundantes)
- ❌ Atributos ARIA redundantes (`aria-invalid`, `aria-describedby`)
- ❌ Clases Tailwind excesivas en inputs

**Simplificado:**
- ✅ Solo toast notifications para feedback
- ✅ Errores inline de React Hook Form
- ✅ Estados claros de loading en botón
- ✅ Validación visual con bordes rojos solo en inputs con error

---

## 3. BREAKPOINTS Y ESTRATEGIA RESPONSIVE

### 3.1 Hook useBreakpoints

**Ubicación:** `frontend/src/hooks/useBreakpoint.ts`

**Breakpoints Tailwind:**
```typescript
const breakpoints = {
  sm: 640,   // Tablet pequeña
  md: 768,   // Tablet
  lg: 1024,  // Desktop
  xl: 1280,  // Desktop grande
  '2xl': 1536 // Desktop extra grande
};

export const useBreakpoints = () => {
  const [width, setWidth] = useState(window.innerWidth);
  
  return {
    isMobile: width < 640,      // < sm
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024,
    width
  };
};
```

**Uso:**
```tsx
const { isMobile } = useBreakpoints();

// Renderizado condicional
{isMobile ? <Cards /> : <Table />}
```

---

### 3.2 ResponsiveGrid Component

**Ubicación:** `frontend/src/components/layout/ResponsiveGrid.tsx`

**Variants:**
```tsx
type GridVariant = 'default' | 'wide' | 'cards' | 'compact';

// Configuración por variant
const variantClasses = {
  default: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  wide: 'grid-cols-1 sm:grid-cols-2',              // Para cards de gestión
  cards: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',  // Para scaffolds
  compact: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
};

const gapClasses = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6'
};
```

**Uso:**
```tsx
<ResponsiveGrid variant="wide" gap="lg">
  <UserCard />
  <UserCard />
</ResponsiveGrid>
```

---

### 3.3 Estrategia de Breakpoints por Sección

**Tablas → Cards (Management Pages):**
- **< 640px (mobile)**: 1 columna de cards
- **≥ 640px (desktop)**: Tabla tradicional

**Estadísticas (ScaffoldsPage):**
- **< 640px (mobile)**: 2 columnas
- **640-1024px (tablet)**: 4 columnas
- **≥ 1024px (desktop)**: 8 columnas

**Filtros:**
- **< 640px (mobile)**: 1 columna (apilados)
- **≥ 640px (tablet+)**: 3 columnas (horizontal)

**Botones de Acción:**
- **< 640px (mobile)**: 1 columna (apilados)
- **640-1024px (tablet)**: 2 columnas
- **≥ 1024px (desktop)**: 3 columnas

**ScaffoldGrid:**
- **< 640px (mobile)**: 1 columna
- **640-1024px (tablet)**: 2 columnas
- **1024-1280px (desktop)**: 3 columnas
- **≥ 1280px (large)**: 4 columnas

**ProfilePage (Formularios):**
- **< 640px (mobile)**: Inputs en 1 columna (apilados)
- **≥ 640px (tablet+)**: Inputs en 2 columnas (horizontal)
- **Elementos únicos**: Full-width en todos los tamaños (email, foto perfil, botón)

---

## 4. PATRONES DE DISEÑO RESPONSIVE

### 4.1 Patrón: Conditional Rendering

**Cuando usar:**
- Diferencias estructurales grandes (tabla vs cards)
- Lógica completamente diferente por tamaño

**Implementación:**
```tsx
const { isMobile } = useBreakpoints();

return (
  <div>
    {isMobile ? (
      <MobileView />
    ) : (
      <DesktopView />
    )}
  </div>
);
```

**Páginas que lo usan:**
- UsersPage
- ClientsPage
- ProjectsPage

**Páginas que NO lo usan:**
- ProfilePage (mismo formulario en todos los tamaños, solo ajusta layout con clases responsive)

---

### 4.2 Patrón: Responsive Classes

**Cuando usar:**
- Ajustes visuales (padding, tamaño, spacing)
- Mismo componente, diferente presentación

**Implementación:**
```tsx
<div className="p-2.5 md:p-3">
  <p className="text-xl md:text-2xl">Título</p>
  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
    {/* ... */}
  </div>
</div>
```

**Componentes que lo usan:**
- ScaffoldFilters
- ScaffoldGrid
- Stats cards en ScaffoldsPage
- ProfilePage (formulario completo)

---

### 4.3 Patrón: Layout Switching

**Cuando usar:**
- Cambiar distribución (flex → grid, vertical → horizontal)

**Implementación:**
```tsx
// Mobile: vertical stack
// Desktop: horizontal flex
<div className="flex flex-col lg:flex-row gap-4">
  <div className="flex-1">Selector</div>
  <div className="flex-1">Filtros</div>
</div>

// Alternativa: grid
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  <div>Selector</div>
  <div>Filtros</div>
</div>
```

---

### 4.4 Patrón: Touch-Friendly Sizing

**Regla:** Mínimo 44x44px para elementos interactivos

**Implementación:**
```tsx
// Botones
<button className="px-4 py-2.5 min-h-[44px]">
  Crear Andamio
</button>

// ActionButton en EntityCard
<button className="px-3 py-1.5 min-h-[40px]">
  {/* Icono + texto */}
</button>

// Card completa (clickable)
<button className="p-3 sm:p-4 w-full text-left">
  {/* Contenido de la card */}
</button>
```

---

## 5. COMPONENTES AUXILIARES

### 5.1 Badge Components

**RoleBadge:**
```tsx
interface RoleBadgeProps {
  role: 'admin' | 'supervisor' | 'client';
}

const roleConfig = {
  admin: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Administrador' },
  supervisor: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Supervisor' },
  client: { bg: 'bg-green-100', text: 'text-green-800', label: 'Cliente' }
};
```

**StatusBadge:**
```tsx
interface StatusBadgeProps {
  active?: boolean;
}

// true → bg-green-100 "Activo"
// false/undefined → bg-gray-100 "Inactivo"
```

**ProjectStatusBadge:**
```tsx
interface ProjectStatusBadgeProps {
  project: Project;
}

// Lógica:
if (!project.client_active) {
  return <Badge color="red">Cliente Inactivo</Badge>;
}
if (!project.active) {
  return <Badge color="gray">Desactivado</Badge>;
}
return <Badge color="green">Activo</Badge>;
```

---

### 5.2 Componentes de Layout

**ResponsiveGrid:**
- Usado para distribuir cards
- Variants predefinidos
- Gap configurable

**Modal:**
- Fullscreen en mobile
- Centered en desktop
- Overlay oscuro

**ConfirmationModal:**
- Botones apilados en mobile
- Horizontal en desktop

---

## 6. GUÍA DE IMPLEMENTACIÓN

### 6.1 Checklist para Nueva Página Responsive

✅ **1. Importar hook de breakpoints:**
```tsx
import { useBreakpoints } from '../../hooks';
const { isMobile } = useBreakpoints();
```

✅ **2. Crear versión mobile (cards):**
```tsx
{isMobile && (
  <ResponsiveGrid variant="wide">
    {items.map(item => (
      <ItemCard key={item.id} item={item} {...actions} />
    ))}
  </ResponsiveGrid>
)}
```

✅ **3. Mantener versión desktop (tabla):**
```tsx
{!isMobile && (
  <table className="w-full">
    {/* Tabla existente */}
  </table>
)}
```

✅ **4. Crear componente Card específico:**
```tsx
// components/cards/ItemCard.tsx
export default function ItemCard({ item, onEdit, onDelete }: Props) {
  const fields: InfoField[] = [
    { label: 'Campo 1', value: item.field1 },
    { label: 'Campo 2', value: item.field2, hide: !item.field2 },
  ];
  
  const actions: CardAction[] = [
    { label: 'Editar', onClick: () => onEdit(item), icon: <EditIcon /> },
    { label: 'Eliminar', onClick: () => onDelete(item.id), variant: 'danger', icon: <TrashIcon /> },
  ];
  
  return (
    <EntityCard
      title={item.name}
      badge={<StatusBadge active={item.active} />}
      fields={fields}
      actions={actions}
    />
  );
}
```

✅ **5. Optimizar filtros y acciones:**
```tsx
// Filtros: 1 col mobile → 3 cols desktop
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
  <select className="p-2 text-sm" />
  <input className="p-2 text-sm" />
</div>

// Botones: grid responsive
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
  <button>Acción 1</button>
  <button>Acción 2</button>
</div>
```

---

### 6.2 Convenciones de Nomenclatura

**Files:**
- Cards: `{Entity}Card.tsx` (UserCard, ClientCard)
- Pages: `{Entity}Page.tsx` o `{Feature}Page.tsx`
- Hooks: `use{Name}.ts` (useBreakpoints, useAuth)

**Components:**
- PascalCase para componentes
- Exports default para componentes principales
- Named exports para utilidades

**Props:**
- `on{Action}` para callbacks (onClick, onEdit, onDelete)
- `is{State}` para booleanos (isLoading, isMobile)
- Singular para entidades (user, client, project)

---

### 6.3 Testing Responsive

**Breakpoints a probar:**
- 320px (iPhone SE)
- 375px (iPhone X)
- 640px (Tablet pequeña - breakpoint sm)
- 768px (Tablet - breakpoint md)
- 1024px (Desktop - breakpoint lg)
- 1280px (Desktop grande - breakpoint xl)

**Checklist por página:**
- ✅ No scroll horizontal en ningún tamaño
- ✅ Botones touch-friendly (≥ 44px)
- ✅ Texto legible (≥ 14px en mobile)
- ✅ Imágenes responsive (object-cover)
- ✅ Modals fullscreen en mobile
- ✅ Inputs con padding adecuado
- ✅ Cards con spacing apropiado

---

## 7. CÓDIGO DE EJEMPLO COMPLETO

### 7.1 Página Responsive Típica

```tsx
import React from 'react';
import { useLoaderData } from 'react-router-dom';
import { useBreakpoints } from '../../hooks';
import { ResponsiveGrid } from '../../components/layout';
import { ItemCard } from '../../components/cards';
import { Item } from '../../types/api';

export default function ItemsPage() {
  const { items } = useLoaderData() as { items: Item[] };
  const { isMobile } = useBreakpoints();
  
  const handleEdit = (item: Item) => {
    // Lógica de edición
  };
  
  const handleDelete = (itemId: number) => {
    // Lógica de eliminación
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white">Items</h1>
      </div>
      
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input type="text" placeholder="Buscar..." className="p-2 text-sm" />
          <select className="p-2 text-sm">
            <option>Todos</option>
          </select>
        </div>
      </div>
      
      {/* Contenido */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        {isMobile ? (
          <ResponsiveGrid variant="wide" gap="lg">
            {items.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </ResponsiveGrid>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.status}</td>
                  <td>
                    <button onClick={() => handleEdit(item)}>Editar</button>
                    <button onClick={() => handleDelete(item.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

---

### 7.2 Card Component Típica

```tsx
import { EntityCard, InfoField, CardAction } from './EntityCard';
import { Item } from '../../types/api';

interface ItemCardProps {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (itemId: number) => void;
}

export default function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const fields: InfoField[] = [
    { label: 'Descripción', value: item.description },
    { label: 'Categoría', value: item.category },
    { label: 'Creado', value: new Date(item.created_at).toLocaleDateString() },
  ];
  
  const actions: CardAction[] = [
    {
      label: 'Editar',
      onClick: () => onEdit(item),
      variant: 'primary',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      show: true
    },
    {
      label: 'Eliminar',
      onClick: () => onDelete(item.id),
      variant: 'danger',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      show: true
    }
  ];
  
  return (
    <EntityCard
      title={item.name}
      badge={<StatusBadge active={item.active} />}
      fields={fields}
      actions={actions}
    />
  );
}
```

---

## 8. ERRORES COMUNES Y SOLUCIONES

### 8.1 Error: Tipos Duplicados

**Problema:**
```tsx
// ❌ MAL
interface User {
  id: number;
  name: string;
}

function UserCard({ user }: { user: User }) {
  // ...
}
```

**Solución:**
```tsx
// ✅ BIEN
import { User } from '../../types/api';

function UserCard({ user }: { user: User }) {
  // ...
}
```

---

### 8.2 Error: Callbacks con Firma Incorrecta

**Problema:**
```tsx
// ❌ MAL - Error de tipo
onEdit: (user: User) => void

// Card llama con undefined
onEdit(undefined)  // Error!
```

**Solución:**
```tsx
// ✅ BIEN
onEdit: (user?: User | null) => void

// Card puede llamar con undefined
onEdit(undefined)  // OK
```

---

### 8.3 Error: Breakpoint Incorrecto

**Problema:**
```tsx
// ❌ MAL - md es 768px, no 640px
<div className="grid-cols-1 md:grid-cols-3">
```

**Solución:**
```tsx
// ✅ BIEN - sm es 640px
<div className="grid-cols-1 sm:grid-cols-3">
```

---

### 8.4 Error: Touch Target Pequeño

**Problema:**
```tsx
// ❌ MAL - Botón muy pequeño para mobile
<button className="px-2 py-1 text-xs">
  Eliminar
</button>
```

**Solución:**
```tsx
// ✅ BIEN - Tamaño touch-friendly
<button className="px-3 py-1.5 text-sm min-h-[44px]">
  Eliminar
</button>
```

---

---

## 9. SIDEBAR COLAPSABLE - Enero 2026

### 9.1 Arquitectura del Sistema

**Ubicación:** `frontend/src/layouts/AppLayout.tsx`

**Características Principales:**
- Sidebar colapsable con persistencia en localStorage
- Ancho dinámico: 256px (expandida) ↔ 64px (colapsada)
- Estados por defecto responsive:
  - **Desktop (≥1024px)**: Expandida por defecto
  - **Mobile (<1024px)**: Colapsada por defecto
- Iconos visibles en estado colapsado
- Texto oculto cuando colapsada usando clases condicionales

---

### 9.2 Estado y Persistencia

**Estado Inicial Responsive:**
```typescript
const [isSidebarOpen, setSidebarOpen] = useState(() => {
  const isDesktop = window.innerWidth >= 1024;
  const saved = localStorage.getItem('sidebarCollapsed');
  if (saved !== null && isDesktop) {
    return !JSON.parse(saved);
  }
  return isDesktop; // true desktop, false móvil
});
```

**Persistencia en localStorage:**
```typescript
useEffect(() => {
  if (window.innerWidth >= 1024) {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(!isSidebarOpen));
  }
}, [isSidebarOpen]);
```

**Clave localStorage:** `'sidebarCollapsed'` (booleano)

---

### 9.3 Diseño Visual

**Nav Container - Ancho Dinámico:**
```typescript
className={`... ${
  isSidebarOpen 
    ? 'w-64 translate-x-0' 
    : 'w-64 -translate-x-full lg:translate-x-0 lg:w-16'
}`}
```

**Comportamiento:**
- **Mobile + cerrada**: `w-64 -translate-x-full` (oculta fuera de pantalla)
- **Mobile + abierta**: `w-64 translate-x-0` (visible)
- **Desktop + cerrada**: `lg:w-16 lg:translate-x-0` (visible, estrecha)
- **Desktop + abierta**: `w-64 translate-x-0` (visible, ancha)

---

### 9.4 Botón de Toggle

**Ubicación:** Debajo del logo, centrado horizontalmente

**Implementación:**
```tsx
<button
  onClick={() => setSidebarOpen(!isSidebarOpen)}
  className="absolute top-[85px] left-1/2 transform -translate-x-1/2 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-all duration-300"
  aria-label={isSidebarOpen ? 'Colapsar menú' : 'Expandir menú'}
>
  {isSidebarOpen ? (
    <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
  ) : (
    <ChevronRightIcon className="w-5 h-5 text-gray-600" />
  )}
</button>
```

**Iconos:**
- **ChevronLeftIcon**: Sidebar expandida (indica "colapsar")
- **ChevronRightIcon**: Sidebar colapsada (indica "expandir")

---

### 9.5 Enlaces con Iconos y Texto Condicional

**Patrón de Implementación:**
```tsx
<Link
  to="/admin/dashboard"
  className={linkClass}
  onClick={handleLinkClick}
>
  <svg className={`w-5 h-5 ${isSidebarOpen ? 'mr-3' : ''}`}>
    {/* Path del icono */}
  </svg>
  <span className={!isSidebarOpen ? 'lg:hidden' : ''}>
    Dashboard
  </span>
</Link>
```

**Clases Condicionales:**
- **Icono**: `mr-3` solo cuando expandida (separación del texto)
- **Texto**: `lg:hidden` cuando colapsada en desktop (oculto visualmente)

**Resultado:**
- **Expandida**: Icono + margin + texto visible
- **Colapsada Desktop**: Solo icono centrado, texto oculto
- **Colapsada Mobile**: Sidebar fuera de pantalla

---

### 9.6 Títulos de Sección

**Implementación:**
```tsx
<div className={sectionTitleClass}>
  GESTIÓN
</div>
```

**Clase Condicional:**
```typescript
const sectionTitleClass = `px-6 py-2 text-xs font-semibold text-white uppercase tracking-wider ${
  !isSidebarOpen ? 'lg:hidden' : ''
}`;
```

**Comportamiento:**
- **Expandida**: Título visible
- **Colapsada Desktop**: Título oculto (`lg:hidden`)
- **Mobile**: Título visible cuando sidebar está abierta

---

### 9.7 Logo en Header

**Implementación:**
```tsx
<img
  src="/logo_alltura_white.png"
  alt="Alltura"
  className={`h-12 w-auto transition-all duration-300 ${
    isSidebarOpen 
      ? 'opacity-100' 
      : 'opacity-100 lg:opacity-0 lg:absolute lg:-left-full'
  }`}
/>
```

**Comportamiento:**
- **Expandida**: Logo visible normalmente
- **Colapsada Desktop**: Logo oculto con `opacity-0` y posicionado fuera (`-left-full`)
- **Mobile**: Logo siempre visible cuando sidebar abierta

---

### 9.8 Control de Overflow

**Nav Principal:**
```tsx
<nav className="... overflow-x-hidden overflow-y-auto">
  {/* Enlaces */}
</nav>
```

**Mejoras Implementadas:**
- `overflow-x-hidden`: Evita scroll horizontal
- `overflow-y-auto`: Permite scroll vertical si es necesario
- **Eliminado CSS inline problemático** que causaba conflictos

---

### 9.9 Comportamiento de Cierre en Mobile

**handleLinkClick Modificado:**
```typescript
const handleLinkClick = () => {
  if (window.innerWidth < 1024) {
    setSidebarOpen(false);
  }
};
```

**Lógica:**
- **Mobile (<1024px)**: Cierra sidebar al hacer clic en enlace
- **Desktop (≥1024px)**: NO cierra sidebar (mantiene estado)

---

### 9.10 Beneficios UX

**Ganancia de Espacio Horizontal:**
- Desktop con sidebar colapsada: ~192px adicionales (256px - 64px)
- ProjectCards y ScaffoldGrid tienen más espacio
- Mejor aprovechamiento de pantalla

**Prioridad Móvil:**
- Supervisor trabaja principalmente desde móvil
- Sidebar colapsada por defecto en móvil maximiza espacio
- Desktop mantiene sidebar expandida por defecto (más cómodo)

**Persistencia:**
- Preferencia del usuario guardada en localStorage
- Estado se mantiene entre sesiones
- Solo en desktop (móvil siempre empieza colapsada)

---

### 9.11 Iconos Implementados

**Import en AppLayout.tsx:**
```typescript
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  // ... otros iconos
} from '@heroicons/react/24/outline';
```

**Iconos de Enlaces (ejemplos):**
- Dashboard: `<svg>` path personalizado (Cuadrados)
- Usuarios: `<UsersIcon>` Heroicon
- Clientes: `<svg>` path personalizado (Edificio)
- Proyectos: `<svg>` path personalizado (Portafolio)
- Andamios: `<svg>` path personalizado (Andamio)
- Perfil: `<UserCircleIcon>` Heroicon
- Cerrar Sesión: `<svg>` path personalizado (Logout)

**Tamaño consistente:** `w-5 h-5` (20px)

---

### 9.12 Clases CSS Relevantes

**linkClass:**
```typescript
const linkClass = `flex items-center ${
  isSidebarOpen ? 'px-6' : 'px-2 lg:justify-center'
} py-3 text-white hover:bg-white/10 transition-colors ${
  !isSidebarOpen ? 'lg:px-0' : ''
}`;
```

**activeLinkClass:**
```typescript
const activeLinkClass = `${linkClass} bg-white/20 border-l-4 border-white`;
```

**Comportamiento:**
- **Expandida**: `px-6` padding horizontal normal
- **Colapsada**: `px-2` reducido, `lg:justify-center` icono centrado

---

## 10. PROJECTCARD MEJORADA - Supervisor Dashboard

### 10.1 Componente ProjectCard

**Ubicación:** `frontend/src/components/ProjectCard.tsx`

**Props:**
```typescript
interface ProjectCardProps {
  project: Project;
  linkTo: string;
}
```

**Características:**
- Card informativa diseñada para vista de supervisor
- Header con degradado azul
- Sistema de badges por estado
- Grid responsive para información
- Footer con CTA

---

### 10.2 Estructura Visual

**Header con Degradado:**
```tsx
<div className="bg-gradient-to-r from-primary-blue to-blue-600 p-4">
  <h3 className="text-xl font-bold text-white">{project.name}</h3>
  <div className="mt-2">{/* Badge */}</div>
</div>
```

**Badges por Estado:**
```typescript
// Proyecto activo con cliente activo
if (project.active && project.client_active) {
  badge = <span className="bg-green-100 text-green-800">Activo</span>;
}
// Proyecto completado
else if (project.completed) {
  badge = <span className="bg-blue-100 text-blue-800">Completado</span>;
}
// Cliente inactivo
else if (!project.client_active) {
  badge = <span className="bg-yellow-100 text-yellow-800">Cliente Inactivo</span>;
}
// Proyecto inactivo
else if (!project.active) {
  badge = <span className="bg-gray-100 text-gray-800">Proyecto Inactivo</span>;
}
```

---

### 10.3 Grid Responsive de Información

**Implementación:**
```tsx
<div className="p-4 space-y-3">
  <div className="space-y-2 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-2 md:space-y-0">
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">Cliente Empresa</p>
      <p className="text-sm font-medium text-gray-900">{project.client_company_name}</p>
    </div>
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">Contacto Asignado</p>
      <p className="text-sm font-medium text-gray-900">
        {project.assigned_contact_first_name} {project.assigned_contact_last_name}
      </p>
    </div>
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">Supervisor</p>
      <p className="text-sm font-medium text-gray-900">
        {project.supervisor_first_name} {project.supervisor_last_name}
      </p>
    </div>
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">Fecha de Creación</p>
      <p className="text-sm font-medium text-gray-900">
        {new Date(project.created_at).toLocaleDateString()}
      </p>
    </div>
  </div>
</div>
```

**Breakpoints:**
- **Mobile (<768px)**: Vertical stack (1 columna)
- **Desktop (≥768px)**: Grid 2 columnas

---

### 10.4 Footer con CTA

**Implementación:**
```tsx
<div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
  <Link
    to={linkTo}
    className="block text-center text-primary-blue hover:text-blue-700 font-medium transition-colors"
  >
    Ver Andamios →
  </Link>
</div>
```

**Estilo:**
- Fondo gris claro: `bg-gray-50`
- Borde superior: `border-t border-gray-200`
- Enlace centrado con hover
- Flecha indicadora de acción

---

### 10.5 Uso en SupervisorDashboard

**Ubicación:** `frontend/src/pages/supervisor/SupervisorDashboard.tsx`

**Renderizado:**
```tsx
<ResponsiveGrid variant="cards" gap="lg">
  {projects.map((project) => (
    <ProjectCard
      key={project.id}
      project={project}
      linkTo={`/supervisor/projects/${project.id}/scaffolds`}
    />
  ))}
</ResponsiveGrid>
```

**Grid Variant "cards":**
- Mobile: 1 columna
- Tablet (640px+): 2 columnas
- Desktop (1024px+): 3 columnas
- Large (1280px+): 4 columnas

---

### 10.6 Información Mostrada

**Campos Clave:**
1. **Cliente Empresa**: `project.client_company_name`
2. **Contacto Asignado**: Nombre completo del contacto
3. **Supervisor**: Nombre completo del supervisor
4. **Fecha de Creación**: Formateada con `toLocaleDateString()`

**Antes (Card Básica):**
- Solo nombre del proyecto
- Sin información adicional
- Enlace simple

**Después (Card Informativa):**
- Header destacado con degradado
- 4 campos de información
- Badge de estado visual
- Footer con CTA clara

---

## 11. SISTEMA DE TARJETAS DE ANDAMIOS

### 11.1 Arquitectura del Sistema

**Backend:**
- Endpoint: `PATCH /api/scaffolds/:id/card-status`
- Body: `{ card_status: 'green' | 'red' }`
- Validación: Solo admin y supervisor pueden cambiar estado
- Regla de negocio: Andamios creados al 100% → tarjeta roja por defecto

**Frontend:**
- Hook: `useScaffoldPermissions` determina permisos
- Componente: `ScaffoldGrid` con switch visual integrado
- Páginas: `ScaffoldsPage` (admin) y `ProjectScaffoldsPage` (supervisor)

---

### 11.2 Hook useScaffoldPermissions

**Ubicación:** `frontend/src/hooks/useScaffoldPermissions.ts`

**Interface:**
```typescript
export const useScaffoldPermissions = (
  projectId?: number,
  scaffoldUserId?: number  // OPCIONAL (undefined si scaffold.user_id es null)
) => {
  const { user } = useAuth();
  
  const canEdit = user?.role === 'admin' || (
    user?.role === 'supervisor' && 
    user?.id === scaffoldUserId
  );
  
  return { canEdit };
};
```

**Cambio Crítico:**
- Antes: `scaffoldUserId: number`
- Después: `scaffoldUserId?: number`
- Razón: `Scaffold.user_id` puede ser `null` en tipos

---

### 11.3 ScaffoldGrid con Switch de Tarjeta

**Ubicación:** `frontend/src/components/ScaffoldGrid.tsx`

**Props:**
```typescript
interface ScaffoldGridProps {
  scaffolds: Scaffold[];
  onToggleCard?: (scaffoldId: number, currentStatus: 'green' | 'red') => void;
  onDisassemble?: (scaffold: Scaffold) => void;
}
```

**Switch Visual:**
```tsx
{canEdit && onToggleCard && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onToggleCard(scaffold.id, scaffold.card_status);
    }}
    className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
      scaffold.card_status === 'green'
        ? 'bg-red-500 hover:bg-red-600'
        : 'bg-green-500 hover:bg-green-600'
    }`}
  >
    <CheckIcon className="w-4 h-4 inline mr-1" />
    {scaffold.card_status === 'green' ? 'Tarjeta Roja' : 'Tarjeta Verde'}
  </button>
)}
```

**Lógica del Botón:**
- **Estado actual verde** → Botón rojo "Tarjeta Roja" (cambiar a rojo)
- **Estado actual rojo** → Botón verde "Tarjeta Verde" (cambiar a verde)
- Icono de check integrado
- `stopPropagation()` evita navegación a detalle

---

### 11.4 ScaffoldsPage (Admin)

**Ubicación:** `frontend/src/pages/admin/ScaffoldsPage.tsx`

**handleToggleCard:**
```typescript
const handleToggleCard = async (scaffoldId: number, currentStatus: 'green' | 'red') => {
  try {
    const token = localStorage.getItem('accessToken');
    const newStatus = currentStatus === 'green' ? 'red' : 'green';
    
    await axios.patch(
      `/api/scaffolds/${scaffoldId}/card-status`,
      { card_status: newStatus },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    toast.success(`Tarjeta cambiada a ${newStatus === 'green' ? 'verde' : 'roja'} correctamente`);
    window.location.reload();
  } catch (error) {
    toast.error('Error al cambiar el estado de la tarjeta');
  }
};
```

**Corrección Crítica:**
- Antes: `axios.put(...)` → Error 404
- Después: `axios.patch(...)` → Funcional
- Razón: Backend usa método PATCH

---

### 11.5 ProjectScaffoldsPage (Supervisor)

**Ubicación:** `frontend/src/pages/supervisor/ProjectScaffoldsPage.tsx`

**Estado de Desarme:**
```typescript
const [scaffoldToDisassemble, setScaffoldToDisassemble] = useState<Scaffold | null>(null);
const [disassembleImage, setDisassembleImage] = useState<File | null>(null);
const [disassembleNotes, setDisassembleNotes] = useState('');
const [isDisassembling, setIsDisassembling] = useState(false);
```

**handleDisassemble:**
```typescript
const handleDisassemble = (scaffold: Scaffold) => {
  setScaffoldToDisassemble(scaffold);
  setDisassembleImage(null);
  setDisassembleNotes('');
};
```

**handleConfirmDisassemble:**
```typescript
const handleConfirmDisassemble = async () => {
  if (!scaffoldToDisassemble) return;
  
  setIsDisassembling(true);
  try {
    const token = localStorage.getItem('accessToken');
    const formData = new FormData();
    
    if (disassembleImage) {
      const compressed = await imageCompression(disassembleImage, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920
      });
      formData.append('image', compressed);
    }
    
    formData.append('notes', disassembleNotes);
    
    await axios.post(
      `/api/scaffolds/${scaffoldToDisassemble.id}/disassemble`,
      formData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    toast.success('Andamio desarmado correctamente');
    setScaffoldToDisassemble(null);
    window.location.reload();
  } catch (error) {
    toast.error('Error al desarmar el andamio');
  } finally {
    setIsDisassembling(false);
  }
};
```

**Reconstrucción Completa:**
- Archivo estaba corrupto con 100+ errores TypeScript
- Reescritura completa del componente
- Todos los handlers reimplementados
- Estados correctamente tipados

---

### 11.6 Indicadores Visuales en Cards

**Badge de Tarjeta:**
```tsx
<span className={`px-2 py-1 text-xs font-medium rounded ${
  scaffold.card_status === 'green'
    ? 'bg-green-100 text-green-800'
    : 'bg-red-100 text-red-800'
}`}>
  Tarjeta {scaffold.card_status === 'green' ? 'Verde' : 'Roja'}
</span>
```

**Badge de Estado de Armado:**
```tsx
<span className={`px-2 py-1 text-xs font-medium rounded ${
  scaffold.assembly_percentage === 100
    ? 'bg-green-100 text-green-800'
    : scaffold.assembly_percentage > 0
    ? 'bg-yellow-100 text-yellow-800'
    : 'bg-gray-100 text-gray-800'
}`}>
  {scaffold.assembly_percentage}% Armado
</span>
```

---

### 11.7 Regla de Negocio Backend

**Ubicación:** `backend/src/routes/scaffolds.js`

**Creación de Andamio:**
```javascript
// Si assembly_percentage es 100, card_status debe ser 'red' por defecto
if (assembly_percentage === 100) {
  card_status = 'red';
} else {
  card_status = 'green';
}
```

**Actualización de Tarjeta:**
```javascript
router.patch('/:id/card-status', async (req, res) => {
  const { id } = req.params;
  const { card_status } = req.body;
  
  // Validación
  if (!['green', 'red'].includes(card_status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  
  // Permisos: admin o supervisor del proyecto
  // ...
  
  await pool.query(
    'UPDATE scaffolds SET card_status = $1 WHERE id = $2',
    [card_status, id]
  );
  
  res.json({ message: 'Estado actualizado' });
});
```

---

## 12. FUTURAS MEJORAS

### 12.1 Optimizaciones Pendientes

- [ ] Implementar skeleton loading para cards
- [ ] Añadir animaciones de transición entre layouts
- [ ] Lazy loading de imágenes en ScaffoldGrid
- [ ] Virtual scrolling para listas largas
- [ ] PWA optimizations (offline cards)
- [ ] Mejorar transición de sidebar con framer-motion

### 12.2 Nuevas Páginas a Responsive

- [x] ProfilePage (formularios responsive) - **Completado Enero 7, 2026**
- [x] Sidebar Colapsable - **Completado Enero 2026**
- [x] ProjectCard Mejorada - **Completado Enero 2026**
- [x] Sistema de Tarjetas de Andamios - **Completado Enero 2026**
- [ ] CreateScaffoldPage (formularios)
- [ ] ScaffoldDetailsModal (modal fullscreen en mobile)
- [ ] AssignmentModal (selector de usuarios)
- [ ] ReportsPage (gráficos responsive)

---

## 13. RECURSOS Y REFERENCIAS

### 13.1 Documentación

- **Tailwind CSS Responsive Design:** https://tailwindcss.com/docs/responsive-design
- **React Hook Form:** https://react-hook-form.com/
- **React Query:** https://tanstack.com/query/latest
- **Heroicons:** https://heroicons.com/

### 13.2 Herramientas

- **Chrome DevTools:** Device mode para testing
- **Responsively App:** Multi-device preview
- **Lighthouse:** Auditoría de performance y accesibilidad

### 13.3 Patrones Implementados

- **Clases Condicionales Tailwind:** `lg:hidden`, `sm:grid-cols-2`
- **Estados con localStorage:** Persistencia de preferencias
- **Responsive States:** `useBreakpoints()` hook
- **Touch-Friendly Design:** Mínimo 44px para elementos interactivos
- **Mobile-First Approach:** Diseño base para móvil, mejoras en desktop

---

**Última Actualización:** Enero 2026  
**Autor:** Sistema de IA + Equipo de Desarrollo  
**Estado:** Implementado y en Producción  
**Páginas Afectadas:** UsersPage, ClientsPage, ProjectsPage, ScaffoldsPage, ProfilePage, AppLayout (Sidebar), SupervisorDashboard (ProjectCard), ScaffoldGrid (Tarjetas)
