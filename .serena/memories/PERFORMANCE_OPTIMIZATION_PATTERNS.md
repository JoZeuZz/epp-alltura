# Optimización de Rendimiento - Best Practices

**Estado:** Actual

## Lazy Loading y Code Splitting

### Patrón de Lazy Loading en Router
```typescript
import { lazy } from 'react';

// ✅ CORRECTO - Lazy load todas las páginas
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const ClientsPage = lazy(() => import('../pages/admin/ClientsPage'));
const ProjectsPage = lazy(() => import('../pages/admin/ProjectsPage'));
// ... etc

// ❌ INCORRECTO - Import síncrono
import AdminDashboard from '../pages/admin/AdminDashboard';
```

### Suspense Boundary
```typescript
// Siempre envolver Outlet con Suspense
<Suspense fallback={
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
  </div>
}>
  <Outlet />
</Suspense>
```

### Beneficios
- Bundle inicial más pequeño (reducción ~29%)
- Mejor cache (cambios en una página no invalidan todo)
- Carga bajo demanda por rol (admin/supervisor/client)

## React.memo

### Cuándo Usar
✅ **SÍ usar React.memo para:**
- Componentes pequeños que se renderizan frecuentemente
- Componentes en listas/grids
- Componentes con props que cambian poco
- Iconos y badges

❌ **NO usar React.memo para:**
- Componentes que siempre reciben props nuevas
- Componentes que ya renderizan rápido
- Páginas completas (lazy loading es mejor)

### Ejemplos

#### Componentes Pequeños
```typescript
// ErrorMessage - se renderiza en cada campo de formulario
const ErrorMessage = React.memo(({ message, className = '' }) => {
  if (!message) return null;
  return <p className={`text-red-600 text-sm mt-1 ${className}`}>{message}</p>;
});
ErrorMessage.displayName = 'ErrorMessage';
```

#### Badges en Listas
```typescript
// ScaffoldStatusBadge - se renderiza en cada item de grid
export const ScaffoldStatusBadge = React.memo(({ scaffold, showDetails }) => {
  return (
    <div className="flex items-center space-x-2">
      {/* badges */}
    </div>
  );
});
ScaffoldStatusBadge.displayName = 'ScaffoldStatusBadge';
```

#### Componentes de UI Reutilizables
```typescript
const LoadingOverlay = React.memo(({ isOpen, message, subMessage }) => {
  if (!isOpen) return null;
  return (/* spinner */);
});
LoadingOverlay.displayName = 'LoadingOverlay';
```

#### Sub-componentes
```typescript
// PasswordStrength y todos sus sub-componentes
const CheckIcon = React.memo(() => (/* svg */));
CheckIcon.displayName = 'CheckIcon';

const XIcon = React.memo(() => (/* svg */));
XIcon.displayName = 'XIcon';

const PasswordRequirement = React.memo(({ isValid, text }) => (/* li */));
PasswordRequirement.displayName = 'PasswordRequirement';

const PasswordStrength = React.memo(({ password }) => {
  const hasMinLength = password.length >= 8;
  return (/* validaciones */);
});
PasswordStrength.displayName = 'PasswordStrength';
```

### Regla: Siempre agregar displayName
```typescript
// ✅ CORRECTO
MyComponent.displayName = 'MyComponent';

// ❌ INCORRECTO (dificulta debugging)
// Sin displayName
```

## useMemo

### Cuándo Usar
✅ **SÍ usar useMemo para:**
- Filtrados de arrays grandes
- Cálculos costosos
- Mapeos/transformaciones complejas
- Valores derivados que se usan múltiples veces

❌ **NO usar useMemo para:**
- Cálculos triviales (suma de 2 números)
- Valores que cambian en cada render
- Over-optimization prematura

### Ejemplos

#### Filtrado de Arrays
```typescript
// ✅ CORRECTO - Memoizar filtros
const supervisors = useMemo(() => 
  users?.filter(u => u.role === 'supervisor') || [], 
  [users]
);

const clientUsers = useMemo(() => 
  users?.filter(u => u.role === 'client') || [], 
  [users]
);

// ❌ INCORRECTO - Se recalcula en cada render
const supervisors = users?.filter(u => u.role === 'supervisor') || [];
```

#### Filtrado con Estado
```typescript
const filteredUsers = useMemo(() => 
  users?.filter(user => 
    roleFilter === 'all' ? true : user.role === roleFilter
  ) || [], 
  [users, roleFilter] // Dependencias claras
);
```

#### Cálculos Agregados
```typescript
const userCounts = useMemo(() => ({
  admin: users?.filter(u => u.role === 'admin').length || 0,
  supervisor: users?.filter(u => u.role === 'supervisor').length || 0,
  client: users?.filter(u => u.role === 'client').length || 0,
}), [users]);

// Usar en JSX
<span>Administradores ({userCounts.admin})</span>
```

#### Búsqueda/Filtrado de Texto
```typescript
const filteredHistory = useMemo(() => {
  if (!history) return [];
  const search = searchTerm.toLowerCase();
  return history.filter(item =>
    item.project_name?.toLowerCase().includes(search) ||
    item.scaffold_number?.toLowerCase().includes(search)
  );
}, [history, searchTerm]);
```

#### Cálculos Derivados
```typescript
const { watch } = useForm();
const height = watch('height');
const width = watch('width');
const length = watch('length');

const cubicMeters = useMemo(() => {
  return (height * width * length).toFixed(2);
}, [height, width, length]);
```

## useCallback

### Cuándo Usar
✅ **SÍ usar useCallback para:**
- Callbacks pasados a componentes memoizados
- Handlers en Context Providers
- Callbacks en dependencias de useEffect
- Event handlers que se pasan como props

❌ **NO usar useCallback para:**
- Event handlers inline que no se pasan como props
- Callbacks que cambian frecuentemente
- Over-optimization sin medición

### Ejemplos

#### Handlers en Páginas
```typescript
const handleOpenModal = useCallback((user: User | null = null) => {
  setSelectedUser(user);
  setIsModalOpen(true);
}, []);

const handleCloseModal = useCallback(() => {
  setIsModalOpen(false);
  setSelectedUser(null);
}, []);

const handleDelete = useCallback((user: User) => {
  setUserToDelete(user);
  setIsDeleteModalOpen(true);
}, []);
```

#### Context Providers
```typescript
// AuthContext - CRÍTICO memoizar
const login = useCallback(async (email: string, password: string) => {
  // ... implementación
}, []);

const logout = useCallback(() => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  setUser(null);
  window.location.href = '/login';
}, []);

const refreshUserData = useCallback((newUserData: User, token?: string) => {
  // ... implementación
}, [logout]); // logout como dependencia

const value = useMemo(() => ({
  user,
  loading,
  login,
  logout,
  refreshUserData,
}), [user, loading, login, logout, refreshUserData]);
```

#### Callbacks con Dependencias
```typescript
// ✅ CORRECTO - Incluir todas las dependencias
const handleSubmit = useCallback(() => {
  if (userId) {
    updateUser(userId, formData);
  }
}, [userId, formData, updateUser]);

// ❌ INCORRECTO - Dependencias faltantes
const handleSubmit = useCallback(() => {
  if (userId) {
    updateUser(userId, formData);
  }
}, []); // ESLint warning!
```

## Context Optimization

### Patrón Completo
```typescript
import { createContext, useState, useCallback, useMemo } from 'react';

export const MyContext = createContext<MyContextType | null>(null);

export const MyProvider = ({ children }) => {
  const [state, setState] = useState(initialState);

  // Memoizar TODAS las funciones
  const action1 = useCallback(() => {
    // ...
  }, []);

  const action2 = useCallback((param) => {
    // ...
  }, []);

  // Memoizar el objeto de valor
  const value = useMemo(() => ({
    state,
    action1,
    action2,
  }), [state, action1, action2]);

  return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
};
```

### Por Qué Es Importante
```typescript
// ❌ SIN memoización - value cambia en cada render
const value = { user, login, logout }; // Nuevo objeto cada vez
return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;

// ✅ CON memoización - value solo cambia si dependencias cambian
const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
```

## Virtual Scrolling (Futuro)

### Para Listas Muy Grandes (>1000 items)
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: scaffolds.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 100, // altura estimada de cada row
  overscan: 5, // renderizar 5 extra arriba/abajo
});

return (
  <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
    <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
      {rowVirtualizer.getVirtualItems().map(virtualRow => (
        <div
          key={virtualRow.index}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start}px)`,
          }}
        >
          <ScaffoldRow scaffold={scaffolds[virtualRow.index]} />
        </div>
      ))}
    </div>
  </div>
);
```

## Métricas y Monitoring

### Web Vitals
```typescript
import {getCLS, getFID, getFCP, getLCP, getTTFB} from 'web-vitals';

function sendToAnalytics(metric) {
  console.log(metric);
  // Enviar a analytics
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### Bundle Analysis
```bash
# Instalar
npm install --save-dev rollup-plugin-visualizer

# En vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    react(),
    visualizer({ open: true })
  ]
}

# Analizar
npm run build
# Abre stats.html automáticamente
```

## Checklist de Optimización

### Antes de Implementar
- [ ] ¿El componente se renderiza frecuentemente?
- [ ] ¿El cálculo es realmente costoso?
- [ ] ¿Hay benchmark que justifique la optimización?
- [ ] ¿La memoización no complica el código innecesariamente?

### Durante Implementación
- [ ] Lazy loading para todas las páginas/rutas
- [ ] Suspense boundary en AppLayout
- [ ] React.memo en componentes pequeños reutilizables
- [ ] useMemo para filtros y cálculos de arrays
- [ ] useCallback para handlers en contexts
- [ ] displayName en todos los memo components

### Después de Implementar
- [ ] Verificar bundle size (npm run build)
- [ ] Revisar chunks generados
- [ ] Probar que lazy loading funciona
- [ ] Medir con React DevTools Profiler
- [ ] Verificar que no hay re-renders innecesarios

## Anti-Patterns

### ❌ Over-Memoization
```typescript
// NO memoizar todo sin razón
const sum = useMemo(() => a + b, [a, b]); // Trivial, no vale la pena
```

### ❌ Dependencias Incorrectas
```typescript
// Olvidar dependencias
const handler = useCallback(() => {
  console.log(data); // data debería estar en deps
}, []); // ⚠️ Warning de ESLint
```

### ❌ Memoizar Componentes Grandes
```typescript
// NO usar memo en páginas completas
const ProjectsPage = React.memo(() => {
  // 500 líneas de código
}); // Mejor usar lazy loading
```

### ✅ Memoización Efectiva
```typescript
// SÍ memoizar componentes pequeños en loops
{scaffolds.map(scaffold => (
  <ScaffoldCard key={scaffold.id} scaffold={scaffold} />
))}

// ScaffoldCard debe ser memo
const ScaffoldCard = React.memo(({ scaffold }) => {
  return (/* UI */);
});
```

## Resultados Esperados

### Métricas de Éxito
- Bundle inicial: < 200 kB gzipped
- Chunks lazy: 20+ archivos separados
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1
- TTI (Time to Interactive): < 3.8s

### Monitoreo Continuo
```bash
# En cada build
npm run build
ls -lh dist/assets/*.js | awk '{print $5, $9}'

# Alertar si bundle principal > 500kB
```


