# Patrón: Tab Navigation en Páginas Gestoras

## Qué es
Las páginas gestoras (EPP, Herramientas, Equipos) usan dos sub-páginas via tabs con línea inferior:
- **Dashboard** tab (default): KPI cards globales del tipo de activo
- **Inventario** tab: filtros (búsqueda + estado) + grid de cards de artículos

## Componente en alltura-ui
`PageTabs` exportado desde `@jozeuZz/alltura-ui`. Standalone — no integrado en AppLayout ni PageHeader. Solo las páginas que lo necesiten lo importan.

```tsx
import { PageTabs } from '@jozeuZz/alltura-ui';

const TABS = [
  { key: 'dashboard' as const, label: 'Dashboard' },
  { key: 'inventario' as const, label: 'Inventario' },
];

const [activeTab, setActiveTab] = useState<'dashboard' | 'inventario'>('dashboard');

<PageTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
```

## Decisiones de implementación
- Tab state: `useState` local, sin cambio de URL (no sub-rutas)
- Default tab: `'dashboard'`
- KPIs calculados sobre TODOS los items del tipo (sin aplicar filtros del tab Inventario)
- Botón `+ Nuevo` siempre visible en ambos tabs (en el header, no dentro del tab)
- Tour auto-switch: `useLayoutEffect` en el page component para cambiar a `'inventario'` cuando el demo step `open-activo-demo` está activo en scope `epp`
- Error state en tab Dashboard: muestra `copy.errorMessage` + Reintentar cuando `isError`

## Archivos relevantes
- Componente alltura-ui: `alltura-ui/src/components/PageTabs.tsx`
- Implementación de referencia: `frontend/src/pages/admin/inventory/AdminInventoryScopedAssetPage.tsx`
- KPIs viven en el page component; `AdminInventoryScopedAssetCards` solo maneja filtros + grid

## Por qué
Separar métricas de resumen (dashboard) del listado operativo (inventario) reduce carga cognitiva. El tab dashboard es el punto de entrada natural — visión global antes de operar.
