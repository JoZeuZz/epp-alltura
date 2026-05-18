# Mobile Responsiveness — Patrones y Estado Actual

**Implementado:** 2026-05-18  
**alltura-ui versión:** 1.1.2  
**Estrategia:** Mobile-first, Tailwind breakpoints. Breakpoints activos: `md` (768px) para tablas, `sm` (640px) para modales.

---

## 1. PATRÓN: Kebab Menu en Tablas (mobileKebab)

### Prop nueva en `ResponsiveTable` (alltura-ui 1.1.2)

```tsx
mobileKebab?: (row: T, index: number) => KebabAction[]
```

```tsx
interface KebabAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'primary';
}
```

**Comportamiento:**
- Mobile (`< md`): columna ⋮ al final de cada fila. Click abre dropdown con acciones.
- Desktop (`≥ md`): columna ⋮ no renderiza. Columna de acciones normal visible.
- Dropdown cierra: click fuera (mousedown) + tecla Escape.
- Touch target: `min-h-[44px]` en cada ítem del dropdown. Trigger botón: `min-w-[44px] min-h-[44px]`.
- ARIA: `role="menu"`, `role="menuitem"`, `aria-haspopup="menu"`, `aria-expanded`, `aria-label="Opciones de fila N"`.

**Patron de migración (caller):**
1. Añadir `hideOnMobile: true` en la columna de acciones existente.
2. Pasar `mobileKebab` con los mismos callbacks en array.

```tsx
// Ejemplo
<ResponsiveTable
  columns={columns}  // actions column tiene hideOnMobile: true
  data={filtered}
  getRowKey={(t) => t.id}
  mobileKebab={(t) => [
    { label: 'Ver perfil', onClick: () => setProfileId(t.id) },
    { label: 'Editar', onClick: () => handleEdit(t), variant: 'primary' },
    { label: t.estado === 'activo' ? 'Desactivar' : 'Activar',
      onClick: () => handleToggle(t),
      variant: t.estado === 'activo' ? 'danger' : 'default' },
  ]}
/>
```

### Páginas que usan mobileKebab (herramientas)

| Página | Acciones en kebab |
|---|---|
| `AdminTrabajadoresPage.tsx` | Ver perfil / Editar / Activar-Desactivar |
| `AdminBodegasPage.tsx` | Editar / Activar-Desactivar |
| `AdminProyectosPage.tsx` | Editar / Activar-Desactivar (solo si no `finalizado`) |
| `UsersPage.tsx` | Editar / Eliminar (skip Eliminar si es el usuario actual) |

**Columnas también ocultas en mobile (hideOnMobile ya existente o añadida):**
- AdminBodegasPage: `dirección`, `descripción` (preexistente)
- AdminProyectosPage: `presupuesto`, `período` (preexistente)
- UsersPage: `email` (añadida 2026-05-18)
- SupervisorDashboard: `fecha`, `destino` (añadida 2026-05-18)

---

## 2. PATRÓN: Modal Fullscreen en Mobile (mobileFullscreen)

### Prop nueva en `Modal` (alltura-ui 1.1.2)

```tsx
mobileFullscreen?: boolean  // default: false
```

**Comportamiento en mobile (`< sm`):**
- Panel: `h-[100dvh] rounded-none w-full flex flex-col overflow-hidden`
- Header (título + botón cerrar): `flex-shrink-0`, padding propio (`px-4 pt-4 pb-3`)
- Contenido: `flex-1 overflow-y-auto`, safe-area inset bottom en padding
- Backdrop: `p-0` (sin padding, dialog edge-to-edge)

**Comportamiento en desktop (`≥ sm`):** igual que Modal normal (`max-w-4xl max-h-[85vh] rounded-2xl shadow-modal`).

**Modales que usan mobileFullscreen:**
- `EntregaCreateModal.tsx`
- `DevolucionActivoModal.tsx`
- `EditarActivoModal.tsx`
- `ReubicarActivoModal.tsx`
- `ActivoProfileModal.tsx`
- `TrabajadorProfileModal.tsx`

**NO usar en:** `ConfirmationModal` ni modales simples de confirmación.

---

## 3. PATRÓN: Safe Area Inset (AppLayout)

`<main>` en AppLayout usa clases separadas para no perder padding responsivo al añadir `env(safe-area-inset-bottom)`:

```tsx
className="flex-1 w-full pt-4 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]
  sm:pt-6 sm:px-6 sm:pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]
  lg:pt-10 lg:px-10 lg:pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]
  overflow-y-auto"
```

Evita que el contenido quede tapado por el home indicator de iPhone.

---

## 4. PATRÓN: Botón CTA Full-Width en Mobile

Toolbars con un solo botón CTA: `w-full sm:w-auto min-h-[44px]`.

- `AdminInventoryScopedAssetPage.tsx`: botón `+ Nuevo` ahora ocupa ancho completo en mobile.

---

## 5. SupervisorDashboard — Tabla de Trazabilidad

Reemplazada tabla `<table>` raw por `<ResponsiveTable>` (2026-05-18):

```tsx
const movimientoColumns: TableColumn[] = [
  { key: 'fecha_movimiento', header: 'Fecha', hideOnMobile: true, render: ... },
  { key: 'activo_codigo', header: 'Activo' },
  { key: 'tipo', header: 'Tipo' },
  { key: 'ubicacion_destino_nombre', header: 'Destino', hideOnMobile: true },
];
```

`mobileKebab` no aplica (tabla de solo lectura / trazabilidad).

---

## 6. Imports y Exports

**alltura-ui exports (1.1.2):**
```ts
export { default as ResponsiveTable } from './layout/ResponsiveTable';
export type { ResponsiveTableProps, TableColumn, KebabAction } from './layout/ResponsiveTable';
export { default as Modal } from './components/Modal';
```

**herramientas re-exports locales:**
- `frontend/src/components/layout/ResponsiveTable.tsx` → re-export de `@jozeuZz/alltura-ui`
- `frontend/src/components/Modal.tsx` → re-export de `@jozeuZz/alltura-ui`

`KebabAction` disponible vía `@jozeuZz/alltura-ui` directo (no re-exportado por barrel local).

---

## 7. Tests

- `frontend/src/tests/responsive-table-kebab.test.tsx` — 4 tests: render, click, Escape, onClick
- `frontend/src/tests/modal-mobile-fullscreen.test.tsx` — 2 tests: fullscreen classes, normal classes
- Query correcta para el trigger: `getByRole('button', { name: /Opciones de fila/ })`
