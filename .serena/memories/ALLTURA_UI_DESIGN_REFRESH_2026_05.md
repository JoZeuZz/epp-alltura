# alltura-ui Design Refresh — Mayo 2026

**Paquete:** `@jozeuZz/alltura-ui`
**Versión post-refresh:** 1.1.2 (mobile responsiveness — 2026-05-18)
**Repo:** `/home/proyectos/alltura-ui/`

---

## Decisiones de diseño aprobadas

| Aspecto | Decisión |
|---|---|
| Dirección visual | Profesional Refinado (Direction B) |
| Tipografía | Plus Jakarta Sans, pesos 400–700 |
| Color primario | Azul clásico `#2A64A4` (`primary-blue`) |
| Border radius | 8px |
| Densidad | Confortable |
| Header | Azul (`bg-primary`) — mismo que sidebar, efecto "marco" |

## Tokens semánticos usados en componentes

Los componentes de alltura-ui usan **solo clases semánticas** (nunca hex inline). El consumer app es responsable de definir las CSS vars en su `tailwind.config.js`.

Tokens activos: `bg-surface`, `bg-surface-overlay`, `bg-surface-muted`, `text-content-primary`, `text-content-secondary`, `text-content-muted`, `text-content-disabled`, `border-edge`, `bg-primary`, `bg-primary-hover`, `bg-primary-light`, `bg-danger`, `bg-danger-subtle`, `text-danger`, `text-danger-text`, `bg-success`, `bg-success-subtle`, `text-success-text`, `bg-warning`, `bg-warning-subtle`, `bg-info`, `bg-info-subtle`.

## AppLayout — decisiones específicas

- **Header:** `bg-primary text-white border-b border-white/10` — NO `bg-surface`, NO `shadow-sm`, NO `border-edge`
- **darkFocusRing:** `focus-visible:ring-2 focus-visible:ring-white ring-offset-[#1E2A4A]` — para elementos sobre fondo azul oscuro (sidebar + header)
- **lightFocusRing:** eliminado (ya no existe — header es siempre oscuro)
- **NotificationBell wrapper en header:** `hover:bg-white/10`
- **Profile button:** `hover:bg-white/10 + darkFocusRing`; avatar ring: `ring-white/20`
- **Profile dropdown:** `bg-[#1a2235]` — siempre oscuro, independiente del header
- **Logo en header:** `logo-alltura-white.png` (blanco, visible sobre azul)

## Componentes nuevos (v1.1.0)

### Button (`src/components/Button.tsx`)
- Variantes: `primary` | `ghost` | `danger` | `secondary`
- Tamaños: `sm` | `md` | `lg`
- Props extra: `loading` (spinner interno), `forwardRef`

### StatusBadge (`src/components/StatusBadge.tsx`)
- Variantes EPP: `active` | `inactive` | `pending` | `expiring` | `expired` | `in-stock`
- Tamaños: `sm` | `md`
- Formato: dot + label

### PageHeader (`src/components/PageHeader.tsx`)
- Slots: `title`, `subtitle`, `actions`, navegación atrás (`backHref` | `onBack`)
- Layout responsivo

### EmptyState (`src/components/EmptyState.tsx`)
- Slots: icon, title, description, action
- Prop: `compact`
- Icono SVG de inbox por defecto

## Consumo en herramientas/frontend

- **`package.json` SIEMPRE debe usar versión de registro:** `"@jozeuZz/alltura-ui": "1.1.2"` (nunca `file:../../alltura-ui` en código committeado)
  - Razón: `file:` rompe el build Docker de Coolify — la ruta `../../alltura-ui` no existe dentro del build context del contenedor
  - Fix original: commit `74d3046` en `epp/main` (2026-05-15)
  - **⚠️ PENDIENTE 2026-05-18:** sesión de mobile responsiveness volvió a commitear `file:` (commit `e884338`) porque `NODE_AUTH_TOKEN` no estaba seteado en el entorno. Necesita fix: con token activo, ejecutar `npm install @jozeuZz/alltura-ui@1.1.2` y commitear el package-lock.json resultante.
- **Para tests:** `vite.config.ts → test.alias` apunta a `../../alltura-ui/src/index.ts` → funciona aunque `package.json` use registro
- **Para hot-reload local sobre alltura-ui:** usar `npm link` temporalmente, NUNCA commitear `file:` en `package.json`
- `tailwind.config.js` incluye `./node_modules/@jozeuZz/alltura-ui/src/**/*.{js,jsx,ts,tsx}` en `content`
- `NotificationBell` se pasa con `variant="dark"` en `router/index.tsx:286`
- `index.css` importa Plus Jakarta Sans desde Google Fonts (pesos 400;500;600;700)

## Cambios v1.1.2 — Mobile Responsiveness (2026-05-18)

### ResponsiveTable: prop `mobileKebab`

```tsx
mobileKebab?: (row: T, index: number) => KebabAction[]
interface KebabAction { label: string; onClick: () => void; variant?: 'default' | 'danger' | 'primary'; }
```

- Mobile `< md`: columna ⋮ al final, dropdown con acciones. Cierra con click fuera / Escape.
- Desktop `≥ md`: no renderiza la columna ⋮.
- Touch target trigger: `min-w-[44px] min-h-[44px]`. Items: `min-h-[44px]`.
- ARIA: `role="menu"` / `role="menuitem"` / `aria-label="Opciones de fila N"`.
- Exportado en index.ts: `export type { ..., KebabAction } from './layout/ResponsiveTable'`
- Reset automático: si `data` cambia, dropdown cierra.

### Modal: prop `mobileFullscreen`

```tsx
mobileFullscreen?: boolean  // default: false
```

- Mobile `< sm`: `h-[100dvh] rounded-none`, header pinned `flex-shrink-0`, contenido scrollea independientemente con `env(safe-area-inset-bottom)` en padding.
- Desktop `≥ sm`: comportamiento normal sin cambio.

### AppLayout: safe-area-inset-bottom en `<main>`

`<main>` usa `pb-[calc(Xrem+env(safe-area-inset-bottom,0px))]` responsive (1rem mobile, 1.5rem sm, 2.5rem lg). Evita que iPhone home indicator tape contenido.

Ver detalle completo en `mem:RESPONSIVE_DESIGN`.

---

## Spec y plan de implementación

- Spec: `alltura-ui/docs/specs/2026-05-14-alltura-ui-design.md`
- Plan: `alltura-ui/docs/superpowers/plans/2026-05-14-alltura-ui-design-refresh.md`
