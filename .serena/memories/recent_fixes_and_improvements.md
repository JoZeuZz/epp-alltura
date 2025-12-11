# Correcciones y Mejoras Recientes - Alltura Reports PWA

## Fecha: 9-10 de diciembre de 2025

### 1. Sistema de Imágenes - Normalización de URLs

**Problema:** Las imágenes no se mostraban correctamente en varias vistas porque las URLs no incluían el prefijo del servidor.

**Solución Implementada:**
- Agregada función helper `getImageUrl()` en todos los componentes que muestran imágenes
- Agregada función `handleImageError()` para placeholder SVG cuando falla la carga
- Pattern aplicado:
```typescript
const getImageUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `http://localhost:5000${url}`;
};
```

**Archivos modificados:**
- `frontend/src/pages/technician/ProjectScaffoldsPage.tsx`
- `frontend/src/pages/technician/HistoryPage.tsx`
- `frontend/src/pages/ReportViewerPage.tsx`
- `frontend/src/components/ScaffoldGrid.tsx`
- `frontend/src/components/ScaffoldDetailsModal.tsx`

---

### 2. Función de Eliminación de Reportes (Admin)

**Mejoras implementadas:**

#### Backend (`backend/src/routes/scaffolds.js`):
- Agregadas importaciones: `fs.promises` y `path`
- Modificado DELETE route para:
  - Obtener URLs de imágenes antes de eliminar el registro
  - Eliminar archivos físicos de `uploads/` directory
  - Manejar errores gracefully si las imágenes no existen
  - Eliminar tanto `assembly_image_url` como `disassembly_image_url`
  - Logger todas las operaciones

#### Frontend:
- Reemplazado `window.confirm()` por `ConfirmationModal` component
- Modal de confirmación con mensaje detallado sobre eliminación permanente
- Estado local para controlar el modal de confirmación
- Props: `isOpen`, `onClose`, `onConfirm`, `title`, `message`

**Archivos modificados:**
- `backend/src/routes/scaffolds.js`
- `frontend/src/components/ScaffoldDetailsModal.tsx`

---

### 3. Responsive Design - ProjectScaffoldsPage (Móvil)

**Problema:** En vista móvil, la información se veía desorganizada y poco legible.

**Solución:**
- Header responsive: `flex-col` en móvil, `flex-row` en desktop
- Cards adaptativas: layout vertical en móvil, horizontal en desktop
- Imagen más grande en móvil: `h-20 w-20` (móvil) vs `h-16 w-16` (desktop)
- Textos responsivos: `text-xs` en móvil, `text-sm` en desktop
- Sección de acciones mantiene horizontal en ambas vistas
- Uso de `truncate` para textos largos
- `whitespace-nowrap` para evitar que botones se partan

**Breakpoints utilizados:**
- Sin prefijo: móvil (< 640px)
- `sm:`: tablet y desktop (≥ 640px)

**Archivo modificado:**
- `frontend/src/pages/technician/ProjectScaffoldsPage.tsx`

---

### 4. Dashboard Admin - Corrección de Fechas

**Problema:** El dashboard mostraba "Invalid Date" en la columna de fecha.

**Causa:** El backend renombraba `assembly_created_at` a `created_at`, pero el frontend esperaba `assembly_created_at`.

**Solución:**
- Modificado query SQL para devolver `assembly_created_at` directamente sin renombrar
- El campo tiene DEFAULT NOW() en PostgreSQL, se asigna automáticamente

**Archivo modificado:**
- `backend/src/routes/dashboard.js`

---

### 5. Botón "Ver" en Dashboard (En progreso)

**Problema:** El botón "Ver" en la tabla de últimos reportes no abre el modal de detalles.

**Solución intentada:**
- Agregado `useSearchParams` para leer parámetros de URL
- Implementados dos `useEffect` separados:
  1. Lee `projectId` de URL y lo establece
  2. Espera que `allScaffolds` se cargue y busca el `reportId`
- Flag `urlParamsProcessed` para evitar procesamiento múltiple
- Console.logs agregados para debugging

**Estado:** Necesita más depuración. El componente parpadea pero no abre el modal.

**Archivo modificado:**
- `frontend/src/pages/admin/ScaffoldsPage.tsx`

---

### 6. Rate Limiting - Ajustes para Desarrollo

**Problema:** La app se bloqueaba fácilmente con "Too Many Requests" durante pruebas.

**Causa:**
- Rate limit global: 100 requests / 15 min (muy restrictivo)
- Métricas de performance enviando datos cada 30 segundos
- Múltiples requests por cada acción del usuario

**Soluciones implementadas:**

#### Rate Limiting Global (`backend/src/index.js`):
```javascript
max: process.env.NODE_ENV === 'production' ? 200 : 1000
// Desarrollo: 1000 requests / 15 min
// Producción: 200 requests / 15 min
```

#### Rate Limiting Auth (`backend/src/routes/auth.js`):
```javascript
max: process.env.NODE_ENV === 'production' ? 10 : 100
skipSuccessfulRequests: true // No contar logins exitosos
```

#### Métricas de Performance (`frontend/src/services/performanceService.ts`):
```javascript
const interval = isDevelopment ? 300000 : 30000;
// Desarrollo: enviar cada 5 minutos
// Producción: enviar cada 30 segundos
```

**Beneficios:**
- 16x más requests permitidos en desarrollo (1000 vs 100)
- 90% menos requests de métricas en desarrollo
- Logins exitosos no cuentan para el límite
- Producción mantiene seguridad adecuada

**Archivos modificados:**
- `backend/src/index.js`
- `backend/src/routes/auth.js`
- `frontend/src/services/performanceService.ts`

---

## Notas Importantes

### Estructura de Andamios (Scaffolds)
- Cada scaffold tiene dos imágenes: `assembly_image_url` y `disassembly_image_url`
- Las imágenes se almacenan en `backend/uploads/`
- URLs relativas en DB: `/uploads/filename.jpg`
- Frontend debe normalizar agregando `http://localhost:5000` prefix

### Modal de Confirmación
- Componente reusable: `frontend/src/components/ConfirmationModal.tsx`
- Props: `isOpen`, `onClose`, `onConfirm`, `title`, `message`
- Styling con TailwindCSS responsive

### Rate Limiting
- El entorno se detecta automáticamente con `process.env.NODE_ENV`
- En desarrollo, los límites son 5-10x más permisivos
- Producción mantiene límites estrictos para seguridad

### Responsive Design Pattern
- Mobile-first approach (sin prefijo = móvil)
- Breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Usar `flex-col` en móvil, `flex-row` en desktop para layouts
- Tamaños de texto: `text-xs/sm` móvil, `text-sm/base` desktop
