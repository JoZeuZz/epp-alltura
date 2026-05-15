# alltura-ui Design Refresh — Mayo 2026

**Paquete:** `@jozeuZz/alltura-ui`
**Versión post-refresh:** 1.1.1
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

- **`package.json` SIEMPRE debe usar versión de registro:** `"@jozeuZz/alltura-ui": "1.1.1"` (nunca `file:../../alltura-ui` en código committeado)
  - Razón: `file:` rompe el build Docker de Coolify — la ruta `../../alltura-ui` no existe dentro del build context del contenedor
  - Fix aplicado 2026-05-15: commit `74d3046` en `epp/main`
- **Para tests:** `vite.config.ts → test.alias` apunta a `../../alltura-ui/src/index.ts` → funciona aunque `package.json` use registro
- **Para hot-reload local sobre alltura-ui:** usar `npm link` temporalmente, NUNCA commitear `file:` en `package.json`
- `tailwind.config.js` incluye `./node_modules/@jozeuZz/alltura-ui/src/**/*.{js,jsx,ts,tsx}` en `content`
- `NotificationBell` se pasa con `variant="dark"` en `router/index.tsx:286`
- `index.css` importa Plus Jakarta Sans desde Google Fonts (pesos 400;500;600;700)

## Spec y plan de implementación

- Spec: `alltura-ui/docs/specs/2026-05-14-alltura-ui-design.md`
- Plan: `alltura-ui/docs/superpowers/plans/2026-05-14-alltura-ui-design-refresh.md`
