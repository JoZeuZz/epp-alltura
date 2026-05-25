# Frontend — Alltura Control Operativo

SPA React para gestión de inventario, custodia de activos, entregas, devoluciones y firma digital.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Vitest](https://img.shields.io/badge/Tests-Vitest-6E9F18?logo=vitest&logoColor=white)

---

## Stack

| Tecnología | Uso |
|---|---|
| React 19 | UI |
| TypeScript 5 | Tipado estático |
| Vite 6 | Bundler, dev server, HMR |
| TanStack Query 5 | Server state, caché, invalidación |
| React Hook Form + Zod | Formularios y validación |
| Tailwind CSS | Estilos utilitarios |
| `@jozeuzz/alltura-ui` | Design system interno |
| React Router DOM | Enrutamiento |
| Axios | Cliente HTTP |
| Lucide React | Iconografía |
| `react-hot-toast` | Notificaciones toast |
| `xlsx` + `file-saver` | Exportación Excel |
| `qrcode.react` | Generación de QR |
| `@fdograph/rut-utilities` | Validación RUT chileno |

---

## Rutas

### Públicas

| Ruta | Componente | Descripción |
|---|---|---|
| `/login` | `LoginPage` | Autenticación |
| `/firma/:token` | `PublicSignPage` | Firma digital via QR (sin sesión) |

### Admin

| Ruta | Componente | Descripción |
|---|---|---|
| `/admin/dashboard` | `AdminDashboard` | Métricas e indicadores operativos |
| `/admin/trabajadores` | `AdminTrabajadoresPage` | Gestión de trabajadores |
| `/admin/users` | `UsersPage` | Gestión de usuarios del sistema |
| `/admin/ubicacion/bodegas` | `AdminBodegasPage` | CRUD de bodegas |
| `/admin/ubicacion/proyectos` | `AdminProyectosPage` | CRUD de proyectos |
| `/admin/inventario/epp` | `AdminInventoryEppPage` | Inventario EPP |
| `/admin/inventario/equipos` | `AdminInventoryEquiposPage` | Inventario equipos |
| `/admin/inventario/herramientas` | `AdminInventoryHerramientasPage` | Inventario herramientas |
| `/admin/inventario/articulos` | `AdminInventoryScopedAssetPage` | Vista unificada de activos |

### Supervisor

| Ruta | Componente | Descripción |
|---|---|---|
| `/supervisor/dashboard` | `SupervisorDashboard` | Dashboard operativo |

### Compartidas

| Ruta | Descripción |
|---|---|
| `/perfil` | Perfil del usuario autenticado |
| `/notificaciones` | Centro de notificaciones push |

---

## Flujo operativo principal

Entregas y devoluciones se ejecutan desde el perfil del activo (modal), no desde páginas dedicadas:

```
Inventario (scope: epp / equipos / herramientas)
  └─► ActivoProfileModal
        ├─► [Entrega]
        │     EntregaCreateModal (borrador)
        │       └─► EntregaFirmaModal (firma QR o dispositivo)
        │             └─► Confirmar entrega → custodia abierta
        │
        └─► [Devolución]
              DevolucionActivoModal (borrador + disposición)
                └─► DevolucionFirmaModal (firma QR o dispositivo)
                      └─► Confirmar devolución → custodia cerrada
```

**Sincronización de firma en tiempo real:**

```
useDeliverySignatureEvents (SSE)
  └─► escucha: delivery-signed, return-signed
  └─► actualiza estado de UI sin polling
```

---

## Estructura de componentes

```
src/
├── components/
│   ├── forms/          # Modales operativos (EntregaCreateModal, DevolucionActivoModal, etc.)
│   ├── dashboard/      # MetricCard, StatsCard, InventoryLocationPieChart
│   ├── cards/          # EntityCard genérica
│   ├── layout/         # Container, ResponsiveGrid, ResponsiveTable
│   ├── tools/          # ToolCard, ToolGrid
│   └── icons/          # Iconos SVG propios
├── hooks/
│   ├── useAuth          # Sesión, roles, logout
│   ├── useGet / useMutate  # Wrappers TanStack Query sobre axios
│   ├── useDeliverySignatureEvents  # SSE de firmas
│   ├── usePdfDownload   # Descarga de PDF bufferizado
│   ├── useExcelExport   # Exportación xlsx
│   ├── useNotifications # Web push
│   └── useTour          # Tour guiado interactivo
├── pages/
│   ├── admin/           # Dashboard, inventario, usuarios, ubicaciones
│   ├── supervisor/      # Dashboard supervisor
│   └── *.tsx            # Login, firma pública, perfil, notificaciones
├── layouts/
│   └── AppLayout        # Navegación, sidebar, outlet
└── config/
    ├── imageLimits.ts   # Límites de compresión/upload de imágenes
    └── notificationItemCompat.ts
```

---

## Clasificación de artículos

| `grupo_principal` | `subclasificacion` | `tracking_mode` |
|---|---|---|
| `epp` | `epp` | `lote` |
| `equipo` | `medicion_ensayos` | `serial` |
| `herramienta` | `manual` | `serial` |
| `herramienta` | `electrica_cable` | `serial` |
| `herramienta` | `inalambrica_bateria` | `serial` |

`tracking_mode` es calculado en el backend — nunca se envía en el payload.

---

## Comunicación con backend

La app consume rutas relativas `/api/*` — sin hosts hardcodeados.  
En producción, Nginx proxea `/api` al backend en el mismo origin.

```ts
// Correcto
axios.get('/api/articulos')

// Incorrecto — nunca hardcodear host
axios.get('http://backend:5000/api/articulos')
```

---

## Tests

```bash
npm test          # Vitest (unitarios)
npm run test:smoke:real  # Playwright E2E contra instancia real
```

**Cobertura:**

| Tipo | Herramienta |
|---|---|
| Unitarios (hooks, componentes) | Vitest + Testing Library |
| Smoke E2E | Playwright |

---

## Scripts

```bash
npm run dev        # Dev server (HMR)
npm run build      # Build de producción
npm run preview    # Preview del build
npm run lint       # ESLint + Prettier
npm test           # Vitest
```

---

## Convenciones de desarrollo

- Mantener same-origin `/api` — sin hosts hardcodeados.
- Toda mutación de datos vía `useMutate` + invalidación de queries TanStack Query.
- Formularios con React Hook Form + esquema Zod — nunca validación manual ad-hoc.
- Imágenes comprimidas con `browser-image-compression` antes del upload.
- Validar sincronía entre router, `apiService` y contratos del backend al agregar rutas nuevas.
