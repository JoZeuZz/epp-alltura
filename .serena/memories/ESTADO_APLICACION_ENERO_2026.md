# Estado Actualizado de la Aplicación Alltura - Enero 6, 2026

## Resumen Ejecutivo

Aplicación de gestión de andamios industriales con tres mejoras críticas implementadas recientemente:
1. **Sistema soft delete de proyectos y clientes** (2-3 días atrás)
2. **Validaciones de andamios en proyectos inactivos** (hace 1 día)
3. **Sistema de historial inmutable** (enero 6, 2026)

---

## 1. MODELO DE DATOS ACTUALIZADO

### 1.1 Tabla `clients` (Empresas Mandantes)

**Columnas:**
```sql
id                SERIAL PRIMARY KEY
name              VARCHAR(255) UNIQUE NOT NULL
email             VARCHAR(255)
phone             VARCHAR(50)
address           TEXT
specialty         VARCHAR(255)
created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
active            BOOLEAN NOT NULL DEFAULT true  -- ⭐ NUEVA
```

**Índices:**
- `clients_pkey`: PRIMARY KEY (id)
- `clients_name_key`: UNIQUE (name)
- `idx_clients_active`: btree (active) -- ⭐ NUEVO

**Foreign Keys Referenciadas:**
- `projects.client_id` → `clients.id` ON DELETE CASCADE

**Cambio Reciente:**
- Agregada columna `active` para soft delete
- Índice agregado para optimizar consultas de clientes activos

---

### 1.2 Tabla `projects`

**Columnas:**
```sql
id                      SERIAL PRIMARY KEY
client_id               INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE
name                    VARCHAR(255) NOT NULL
status                  VARCHAR(50) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed'))
assigned_client_id      INTEGER REFERENCES users(id) ON DELETE SET NULL
assigned_supervisor_id  INTEGER REFERENCES users(id) ON DELETE SET NULL
created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
active                  BOOLEAN NOT NULL DEFAULT true  -- ⭐ NUEVA
```

**Índices:**
- `projects_pkey`: PRIMARY KEY (id)
- `idx_projects_active`: btree (active) -- ⭐ NUEVO

**Foreign Keys:**
- `client_id` → `clients(id)` ON DELETE CASCADE
- `assigned_client_id` → `users(id)` ON DELETE SET NULL
- `assigned_supervisor_id` → `users(id)` ON DELETE SET NULL

**Foreign Keys Referenciadas:**
- `project_users.project_id` → `projects.id` ON DELETE CASCADE
- `scaffolds.project_id` → `projects.id` ON DELETE CASCADE

**Cambios Recientes:**
- Agregada columna `active` para soft delete (agregada en `backend/src/db/setup.js` línea 99)
- Índice agregado para optimizar consultas de proyectos activos

---

### 1.3 Tabla `scaffold_history` (Historial Inmutable)

**Columnas:**
```sql
id               SERIAL PRIMARY KEY
scaffold_id      INTEGER REFERENCES scaffolds(id) ON DELETE SET NULL  -- ⚠️ CAMBIADO de CASCADE
user_id          INTEGER NOT NULL REFERENCES users(id)
change_type      VARCHAR(100) NOT NULL
previous_data    JSONB
new_data         JSONB
description      TEXT
created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- 🆕 CAMPOS DENORMALIZADOS (agregados enero 6, 2026)
scaffold_number  VARCHAR(255)
project_name     VARCHAR(255)
area             VARCHAR(255)
tag              VARCHAR(255)
```

**Índices:**
- `scaffold_history_pkey`: PRIMARY KEY (id)
- `idx_scaffold_history_user`: btree (user_id, created_at DESC) -- ⭐ NUEVO

**Foreign Keys:**
- `scaffold_id` → `scaffolds(id)` **ON DELETE SET NULL** (⚠️ antes era CASCADE)
- `user_id` → `users(id)`

**Cambios Críticos (enero 6, 2026):**
1. **Constraint cambiado**: `ON DELETE CASCADE` → `ON DELETE SET NULL`
2. **Columnas denormalizadas agregadas**: `scaffold_number`, `project_name`, `area`, `tag`
3. **Índice optimizado**: Para consultas por usuario y fecha
4. **Migración ejecutada**: Script `migrate_scaffold_history.js` completado

**Propósito:**
- Preservar historial de cambios incluso después de eliminar andamios
- Campos denormalizados permiten mostrar información del andamio aunque ya no exista
- Permite auditoría completa y trazabilidad

---

### 1.4 Foreign Keys - Comportamientos CASCADE vs SET NULL

**ON DELETE CASCADE (eliminación en cascada):**
- `clients` → `projects`: Si se elimina cliente, sus proyectos también
- `projects` → `scaffolds`: Si se elimina proyecto, sus andamios también
- `projects` → `project_users`: Si se elimina proyecto, sus asignaciones también
- `users` → `project_users`: Si se elimina usuario, sus asignaciones también

**ON DELETE SET NULL (preservar registro, nullificar FK):**
- `scaffolds` → `scaffold_history.scaffold_id`: Historial sobrevive a eliminación de andamios ⭐
- `users` → `projects.assigned_client_id`: Proyecto sobrevive a eliminación de cliente asignado
- `users` → `projects.assigned_supervisor_id`: Proyecto sobrevive a eliminación de supervisor asignado

---

## 2. MODELOS BACKEND - MÉTODOS NUEVOS

### 2.1 Model: `Project` (`backend/src/models/project.js`)

**Métodos Agregados:**

```javascript
// Desactivar proyecto (soft delete)
async deactivate(id)
  → Retorna: { ...project, active: false, deactivated: true }
  → Ubicación: línea 217-224

// Reactivar proyecto desactivado
async reactivate(id)
  → Retorna: { ...project, active: true }
  → Ubicación: línea 226-232

// Obtener todos incluyendo inactivos
async getAllIncludingInactive()
  → Retorna: Array de proyectos (activos + inactivos)
  → Ubicación: línea 64-79
  → Sin filtro WHERE active = TRUE

// Contar andamios de un proyecto
async getScaffoldCount(id)
  → Retorna: número entero
  → Ubicación: línea 234-239
  → SQL: SELECT COUNT(*) FROM scaffolds WHERE project_id = $1
```

**Métodos Sin Cambios:**
- `getAll()`: Ya filtraba por `active = TRUE` y `c.active = TRUE`

---

### 2.2 Model: `Client` (`backend/src/models/client.js`)

**Métodos Agregados:**

```javascript
// Desactivar cliente (soft delete)
async deactivate(id)
  → Desactiva cliente Y todos sus proyectos en cascada
  → Ubicación: línea 57-70
  → SQL: 
    1. UPDATE clients SET active = FALSE WHERE id = $1
    2. UPDATE projects SET active = FALSE WHERE client_id = $1

// Reactivar cliente
async reactivate(id)
  → Reactiva cliente Y todos sus proyectos en cascada
  → Ubicación: línea 72-82
  → SQL:
    1. UPDATE clients SET active = TRUE WHERE id = $1
    2. UPDATE projects SET active = TRUE WHERE client_id = $1

// Obtener todos incluyendo inactivos
async getAllIncludingInactive()
  → Ubicación: línea 19-22
```

**Método Modificado:**

```javascript
async delete(id)
  → NUEVO COMPORTAMIENTO:
    1. Verificar si tiene proyectos (SELECT COUNT(*))
    2. Si tiene proyectos → await this.deactivate(id)
    3. Si NO tiene proyectos → DELETE permanente
  → Ubicación: línea 36-55
```

**Método `getProjectCount(id)` - NO EXISTE**
⚠️ El modelo Client NO tiene método getProjectCount, pero la lógica está inline en el método `delete()`

---

### 2.3 Model: `ScaffoldHistory` (`backend/src/models/scaffoldHistory.js`)

**Métodos Modificados:**

```javascript
// Crear entrada de historial (ahora con campos denormalizados)
async create(historyData)
  → NUEVOS PARÁMETROS REQUERIDOS:
    - scaffold_number (antes no existía)
    - project_name (antes no existía)
    - area (antes no existía)
    - tag (antes no existía)
  → Ubicación: línea 10-50
  → SQL: INSERT con 10 campos (antes eran 6)

// Obtener historial por usuario (ahora maneja andamios eliminados)
async getByUser(userId)
  → NUEVO COMPORTAMIENTO:
    - COALESCE entre scaffolds y campos denormalizados
    - Campo adicional: scaffold_deleted (boolean)
    - Muestra datos aunque scaffold_id sea NULL
  → Ubicación: línea 178-217
  → SQL: LEFT JOIN scaffolds (antes era INNER JOIN)

// Crear historial desde cambios detectados
async createFromChanges(scaffoldId, userId, previousData, newData, denormalizedData)
  → NUEVO PARÁMETRO: denormalizedData = { scaffold_number, project_name, area, tag }
  → Ubicación: línea 99-175
```

---

## 3. ENDPOINTS CRÍTICOS - VALIDACIONES AGREGADAS

### 3.1 `POST /api/scaffolds` (Crear Andamio)

**Ubicación:** `backend/src/routes/scaffolds.js` líneas 526-627

**Validación Agregada (líneas 530-545):**

```javascript
// Verificar que el proyecto esté activo
const project = await Project.getById(validatedData.project_id);
if (!project) {
  return res.status(404).json({ message: 'Proyecto no encontrado.' });
}
if (!project.active || !project.client_active) {
  return res.status(400).json({ 
    message: 'No se pueden crear andamios en un proyecto o cliente desactivado. Los datos históricos están protegidos.' 
  });
}
```

**Registro en Historial (líneas 609-621):**

```javascript
// Registrar creación con campos denormalizados
await ScaffoldHistory.create({
  scaffold_id: scaffold.id,
  user_id: req.user.id,
  change_type: 'create',
  previous_data: {},
  new_data: scaffold,
  description: 'Andamio creado',
  scaffold_number: scaffold.scaffold_number,
  project_name: project.name,  // ⭐ DENORMALIZADO
  area: scaffold.area,
  tag: scaffold.tag,
});
```

---

### 3.2 `PUT /api/scaffolds/:id` (Actualizar Andamio)

**Ubicación:** `backend/src/routes/scaffolds.js` líneas 633-800

**Validación Agregada (líneas 643-655):**

```javascript
// Verificar que el proyecto esté activo
const project = await Project.getById(scaffold.project_id);
if (!project) {
  return res.status(404).json({ message: 'Proyecto no encontrado.' });
}
if (!project.active || !project.client_active) {
  return res.status(400).json({ 
    message: 'No se pueden editar andamios de un proyecto o cliente desactivado. Los datos históricos están protegidos.' 
  });
}
```

**Validación Crítica - Andamios Desarmados Inmutables (líneas 690-699):**

```javascript
// VALIDACIÓN CRÍTICA: No permitir modificar andamios desarmados
if (scaffold.assembly_status === 'disassembled') {
  if (validatedData.assembly_status && validatedData.assembly_status !== 'disassembled') {
    return res.status(400).json({
      error: 'No puedes rearmar un andamio que ya fue desarmado. Los andamios desarmados son registros históricos y no pueden volver a armarse. Si necesitas un nuevo andamio en la misma ubicación, crea uno nuevo.'
    });
  }
}
```

---

### 3.3 `PUT /api/scaffolds/:id/disassemble` (Desarmar Andamio)

**Ubicación:** `backend/src/routes/scaffolds.js` líneas 289-410

**Validación Agregada (líneas 305-320):**

```javascript
// Verificar que el proyecto esté activo
const project = await Project.getById(scaffold.project_id);
if (!project) {
  return res.status(404).json({ message: 'Proyecto no encontrado.' });
}
if (!project.active || !project.client_active) {
  return res.status(400).json({ 
    message: 'No se pueden desarmar andamios de un proyecto o cliente desactivado. Los datos históricos están protegidos.' 
  });
}
```

---

### 3.4 `DELETE /api/scaffolds/:id` (Eliminar Andamio - SOLO ADMIN)

**Ubicación:** `backend/src/routes/scaffolds.js` líneas 822-922

**CAMBIO CRÍTICO - Registro en Historial ANTES de Eliminar (líneas 849-862):**

```javascript
// Obtener información del proyecto para registrar en historial
const project = await Project.getById(scaffold.project_id);

// Registrar eliminación en historial ANTES de eliminar
await ScaffoldHistory.create({
  scaffold_id: id,
  user_id: req.user.id,
  change_type: 'delete',
  previous_data: scaffold,
  new_data: {},
  description: 'Andamio eliminado del sistema',
  scaffold_number: scaffold.scaffold_number,  // ⭐ DENORMALIZADO
  project_name: project?.name,                // ⭐ DENORMALIZADO
  area: scaffold.area,                        // ⭐ DENORMALIZADO
  tag: scaffold.tag,                          // ⭐ DENORMALIZADO
});
```

**Después del registro:**
1. Se eliminan las imágenes del servidor (líneas 864-907)
2. Se ejecuta `DELETE FROM scaffolds WHERE id = $1` (línea 909)
3. La FK `scaffold_history.scaffold_id` se pone en NULL automáticamente (constraint SET NULL)

---

## 4. FRONTEND - PÁGINAS PRINCIPALES

### 4.1 `ProjectsPage.tsx` (Administración de Proyectos)

**Ubicación:** `frontend/src/pages/admin/ProjectsPage.tsx`

**Estados Agregados:**
```tsx
const [scaffoldCount, setScaffoldCount] = useState<number>(0);  // línea 22
const [showInactive, setShowInactive] = useState(false);        // línea 22
```

**Flujo DELETE Modificado (líneas 105-127):**

```tsx
const handleDeleteClick = async (projectId: number) => {
  // 1. Obtener conteo de andamios ANTES de mostrar modal
  const response = await fetch(`/api/projects/${projectId}/scaffolds/count`);
  const data = await response.json();
  setScaffoldCount(data.count);
  
  // 2. Mostrar modal
  setProjectToDelete(projectId);
  setIsConfirmDeleteOpen(true);
};
```

**Modal Dinámico (líneas 273-290):**

```tsx
<ConfirmationModal
  title={scaffoldCount > 0 ? "Desactivar Proyecto" : "Eliminar Proyecto"}
  message={
    scaffoldCount > 0
      ? `Este proyecto tiene ${scaffoldCount} andamio${scaffoldCount === 1 ? '' : 's'} asociado${scaffoldCount === 1 ? '' : 's'}. Por seguridad, el proyecto será desactivado en lugar de eliminado. Podrá reactivarlo más adelante si lo necesita.`
      : "¿Está seguro de que desea eliminar este proyecto permanentemente? Esta acción no se puede deshacer."
  }
  confirmText={scaffoldCount > 0 ? "Desactivar" : "Eliminar"}
  variant={scaffoldCount > 0 ? "warning" : "danger"}
/>
```

**Botón Reactivar (líneas 200-230):**

```tsx
{!project.active && project.client_active ? (
  <button onClick={() => reactivateProject(project.id)}>
    Reactivar
  </button>
) : (
  // Botones normales (Asignar, Editar, Eliminar)
)}
```

**Filtro de Inactivos (líneas 146-159):**

```tsx
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={showInactive}
    onChange={(e) => setShowInactive(e.target.checked)}
  />
  Mostrar desactivados
</label>
```

**Lógica de Filtrado (líneas 130-139):**

```tsx
const filteredProjects = projects?.filter(project => {
  if (showInactive) {
    return true; // Mostrar todos
  }
  return project.active && project.client_active; // Solo activos
}) || [];
```

**Renderizado Visual (líneas 188-198):**

```tsx
<tr className={!project.active || !project.client_active ? 'bg-gray-50 opacity-60' : ''}>
  {/* ... */}
  {!project.active || !project.client_active ? (
    <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">
      {!project.client_active ? 'Cliente desact.' : 'Desactivado'}
    </span>
  ) : (
    {/* Estado normal */}
  )}
</tr>
```

---

### 4.2 `ScaffoldsPage.tsx` (Vista Admin de Andamios)

**Ubicación:** `frontend/src/pages/admin/ScaffoldsPage.tsx`

**Banner Amarillo - Proyecto Desactivado (líneas 273-293):**

```tsx
{selectedProject && (!selectedProject.active || !selectedProject.client_active) && (
  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-md">
    <div className="flex">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
          {/* Ícono de advertencia */}
        </svg>
      </div>
      <div className="ml-3">
        <p className="text-sm font-medium text-yellow-800">Proyecto Desactivado</p>
        <p className="mt-1 text-sm text-yellow-700">
          {!selectedProject.client_active 
            ? 'El cliente empresa está desactivado. No se pueden crear ni editar andamios.' 
            : 'Este proyecto está desactivado. No se pueden crear ni editar andamios.'}
        </p>
      </div>
    </div>
  </div>
)}
```

**Validación en Botón "Crear Andamio" (líneas 107-115):**

```tsx
const handleCreateScaffold = () => {
  if (!selectedProjectId) {
    toast.error('Por favor, selecciona un proyecto primero');
    return;
  }
  
  if (selectedProject && (!selectedProject.active || !selectedProject.client_active)) {
    toast.error('No se pueden crear andamios para un proyecto o cliente desactivado');
    return;
  }
  
  navigate(`/admin/project/${selectedProjectId}/create-scaffold`);
};
```

---

### 4.3 `ProjectScaffoldsPage.tsx` (Vista Supervisor - Andamios de un Proyecto)

**Ubicación:** `frontend/src/pages/supervisor/ProjectScaffoldsPage.tsx`

**Banner Amarillo (líneas 55-77):**

```tsx
{project && (!project.active || !project.client_active) && (
  <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
          {/* Ícono de advertencia */}
        </svg>
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-yellow-800">Proyecto en modo solo lectura</h3>
        <p className="mt-1 text-sm text-yellow-700">
          {!project.client_active 
            ? 'El cliente empresa está desactivado. No se pueden crear ni editar andamios.' 
            : 'Este proyecto está desactivado. No se pueden crear ni editar andamios.'}
        </p>
      </div>
    </div>
  </div>
)}
```

**Botón "Reportar Montaje" Deshabilitado (líneas 86-92):**

```tsx
<button
  onClick={() => navigate(`/supervisor/project/${projectId}/create-scaffold`)}
  disabled={!project?.active || !project?.client_active}
  className="... disabled:opacity-50 disabled:cursor-not-allowed"
>
  + Reportar Montaje
</button>
```

---

### 4.4 `HistoryPage.tsx` (Historial de Cambios del Usuario)

**Ubicación:** `frontend/src/pages/supervisor/HistoryPage.tsx`

**Carga de Datos (línea 18):**

```tsx
const { history: initialHistory } = useLoaderData() as { history: HistoryEntry[] };
```

**Backend Endpoint:** `GET /api/scaffolds/my-history`
- Retorna historial con campos denormalizados
- Campo `scaffold_deleted: boolean` indica si el andamio fue eliminado
- Muestra `scaffold_number`, `project_name`, `area`, `tag` de campos denormalizados si el andamio ya no existe

**Renderizado de Registro (líneas 63-91):**

```tsx
<div className="flex-1">
  <div className="flex items-center gap-2 mb-1">
    <span className="inline-block px-2 py-1 bg-primary-blue text-white text-xs font-semibold rounded">
      {getChangeTypeLabel(item.change_type)}
    </span>
    <p className="font-bold text-dark-blue">
      {item.scaffold_number && `N° ${item.scaffold_number}`}
      {item.project_name && ` - ${item.project_name}`}
    </p>
  </div>
  {item.area && <p className="text-sm text-neutral-gray">Área: {item.area}</p>}
  {item.tag && <p className="text-sm text-neutral-gray">TAG: {item.tag}</p>}
  {item.description && <p className="text-sm text-gray-700 mt-2">{item.description}</p>}
</div>
```

**Manejo de Andamios Eliminados:**
- Los registros se muestran normalmente usando campos denormalizados
- NO hay indicador visual de que el andamio fue eliminado (no se requirió en las specs)
- La información es completa gracias a los campos `scaffold_number`, `project_name`, `area`, `tag`

---

## 5. REGLAS DE NEGOCIO ACTUALIZADAS

### 5.1 Proyectos

**Regla 1: Soft Delete si tiene Andamios**
- Proyecto con andamios → `deactivate()` (active = false)
- Proyecto sin andamios → `delete()` permanente
- Implementación: `backend/src/routes/projects.js` líneas 185-217

**Regla 2: Cascada de Desactivación por Cliente**
- Cliente desactivado → todos sus proyectos se desactivan
- Implementación: `backend/src/models/client.js` línea 64-66

**Regla 3: Proyectos Inactivos son Solo Lectura**
- No se pueden crear andamios en proyecto inactivo
- No se pueden editar andamios de proyecto inactivo
- No se pueden desarmar andamios de proyecto inactivo
- Validaciones: `backend/src/routes/scaffolds.js` múltiples ubicaciones

**Regla 4: Reactivación Permitida**
- Proyectos desactivados pueden reactivarse en cualquier momento
- Endpoint: `PATCH /api/projects/:id/reactivate`

---

### 5.2 Clientes (Empresas Mandantes)

**Regla 1: Soft Delete si tiene Proyectos**
- Cliente con proyectos → `deactivate()` + desactivar proyectos
- Cliente sin proyectos → `delete()` permanente
- Implementación: `backend/src/models/client.js` líneas 36-55

**Regla 2: Cascada de Desactivación a Proyectos**
```javascript
async deactivate(id) {
  // 1. Desactivar cliente
  await db.query('UPDATE clients SET active = FALSE WHERE id = $1', [id]);
  
  // 2. Desactivar todos sus proyectos en cascada
  await db.query('UPDATE projects SET active = FALSE WHERE client_id = $1', [id]);
  
  return { ...client, deactivated: true };
}
```

**Regla 3: Reactivación en Cascada**
```javascript
async reactivate(id) {
  // 1. Reactivar cliente
  await db.query('UPDATE clients SET active = TRUE WHERE id = $1', [id]);
  
  // 2. Reactivar todos sus proyectos en cascada
  await db.query('UPDATE projects SET active = TRUE WHERE client_id = $1', [id]);
}
```

---

### 5.3 Andamios

**Regla 1: Inmutabilidad en Proyectos Inactivos**
- NO se pueden crear andamios en proyecto/cliente inactivo
- NO se pueden editar andamios de proyecto/cliente inactivo
- NO se pueden desarmar andamios de proyecto/cliente inactivo
- Mensaje: "Los datos históricos están protegidos"

**Regla 2: Andamios Desarmados son Inmutables**
```javascript
if (scaffold.assembly_status === 'disassembled') {
  // No se puede cambiar a 'assembled' o 'in_progress'
  // Error: "Los andamios desarmados son registros históricos"
}
```

**Regla 3: Historial Sobrevive a Eliminación**
- Al eliminar andamio, se crea registro en `scaffold_history` con `change_type = 'delete'`
- FK `scaffold_id` se pone en NULL (constraint SET NULL)
- Campos denormalizados preservan la información del andamio

**Regla 4: Eliminación Solo para Admins**
- Solo usuarios con rol `admin` pueden eliminar andamios
- Middleware: `isAdmin` en `DELETE /api/scaffolds/:id`

---

### 5.4 Historial de Cambios

**Regla 1: Campos Denormalizados Obligatorios**
- Al crear registro de historial, SIEMPRE se deben proporcionar:
  - `scaffold_number`
  - `project_name`
  - `area`
  - `tag`

**Regla 2: Registro Antes de Eliminación**
- Al eliminar andamio, primero se crea registro con `change_type = 'delete'`
- Luego se elimina el andamio
- FK automáticamente se pone en NULL

**Regla 3: Inmutabilidad del Historial**
- NO hay endpoint para editar registros de historial
- NO hay endpoint para eliminar registros de historial (excepto método interno `delete(id)` que no se usa)

---

## 6. FLUJOS ACTUALIZADOS

### 6.1 Flujo: DELETE Proyecto

```
Usuario hace clic en "Eliminar"
  ↓
Frontend: GET /api/projects/:id/scaffolds/count
  ↓
Frontend: Muestra modal dinámico
  ├─ Si scaffoldCount > 0:
  │   ├─ Título: "Desactivar Proyecto"
  │   ├─ Mensaje: "Tiene X andamios asociados..."
  │   ├─ Botón: "Desactivar" (warning, amarillo)
  │   └─ Al confirmar:
  │       ├─ Backend: await Project.deactivate(id)
  │       ├─ SQL: UPDATE projects SET active = FALSE WHERE id = $1
  │       ├─ Response: { deactivated: true, scaffoldCount: X }
  │       └─ Toast: "Proyecto desactivado correctamente"
  │
  └─ Si scaffoldCount === 0:
      ├─ Título: "Eliminar Proyecto"
      ├─ Mensaje: "Esta acción no se puede deshacer"
      ├─ Botón: "Eliminar" (danger, rojo)
      └─ Al confirmar:
          ├─ Backend: await Project.delete(id)
          ├─ SQL: DELETE FROM projects WHERE id = $1
          ├─ Response: { deleted: true }
          └─ Toast: "Proyecto eliminado permanentemente"
```

---

### 6.2 Flujo: DELETE Cliente

```
Usuario hace clic en "Eliminar"
  ↓
Frontend: Muestra modal con advertencia
  "Si tiene proyectos asociados, será desactivado en lugar de eliminado"
  ↓
Backend: DELETE /api/clients/:id
  ├─ Model: Client.delete(id)
  ├─ SQL: SELECT COUNT(*) FROM projects WHERE client_id = $1
  │
  ├─ Si hasProjects:
  │   ├─ return await this.deactivate(id)
  │   ├─ SQL 1: UPDATE clients SET active = FALSE WHERE id = $1
  │   ├─ SQL 2: UPDATE projects SET active = FALSE WHERE client_id = $1
  │   └─ Response: { ...client, deactivated: true }
  │
  └─ Si NO hasProjects:
      ├─ SQL: DELETE FROM clients WHERE id = $1
      └─ Response: { ...deletedClient }
```

---

### 6.3 Flujo: DELETE Andamio (Solo Admin)

```
Admin hace clic en "Eliminar"
  ↓
Backend: DELETE /api/scaffolds/:id
  ├─ 1. Verificar que andamio existe
  │    const scaffold = await Scaffold.getById(id)
  │
  ├─ 2. Obtener información del proyecto
  │    const project = await Project.getById(scaffold.project_id)
  │
  ├─ 3. ⭐ REGISTRAR EN HISTORIAL ANTES DE ELIMINAR
  │    await ScaffoldHistory.create({
  │      scaffold_id: id,
  │      user_id: req.user.id,
  │      change_type: 'delete',
  │      previous_data: scaffold,
  │      new_data: {},
  │      description: 'Andamio eliminado del sistema',
  │      scaffold_number: scaffold.scaffold_number,  // denormalizado
  │      project_name: project?.name,                // denormalizado
  │      area: scaffold.area,                        // denormalizado
  │      tag: scaffold.tag                           // denormalizado
  │    })
  │
  ├─ 4. Eliminar imágenes del servidor
  │    await deleteImageFile(scaffold.assembly_image_url)
  │    await deleteImageFile(scaffold.disassembly_image_url)
  │
  ├─ 5. Eliminar andamio de la base de datos
  │    DELETE FROM scaffolds WHERE id = $1
  │    ↓
  │    Trigger automático: scaffold_history.scaffold_id → NULL (constraint SET NULL)
  │
  └─ Response: { message: 'Reporte de andamio e imágenes eliminadas correctamente' }
```

**Resultado:**
- Andamio eliminado de tabla `scaffolds`
- Imágenes eliminadas del servidor
- Registro en `scaffold_history` con `scaffold_id = NULL`
- Campos denormalizados preservan toda la información del andamio

---

### 6.4 Flujo: CREATE Andamio

```
Usuario llena formulario y hace submit
  ↓
Backend: POST /api/scaffolds
  ├─ 1. Validar esquema Joi
  │
  ├─ 2. ⭐ VALIDAR QUE PROYECTO ESTÉ ACTIVO
  │    const project = await Project.getById(project_id)
  │    if (!project.active || !project.client_active) {
  │      return 400: "No se pueden crear andamios en un proyecto o cliente desactivado"
  │    }
  │
  ├─ 3. Subir imagen a Google Cloud Storage
  │    const assemblyImageUrl = await uploadFile(req.file)
  │
  ├─ 4. Crear andamio
  │    const scaffold = await Scaffold.create({ ... })
  │
  ├─ 5. ⭐ REGISTRAR EN HISTORIAL CON DATOS DENORMALIZADOS
  │    await ScaffoldHistory.create({
  │      scaffold_id: scaffold.id,
  │      user_id: req.user.id,
  │      change_type: 'create',
  │      previous_data: {},
  │      new_data: scaffold,
  │      description: 'Andamio creado',
  │      scaffold_number: scaffold.scaffold_number,  // denormalizado
  │      project_name: project.name,                 // denormalizado
  │      area: scaffold.area,                        // denormalizado
  │      tag: scaffold.tag                           // denormalizado
  │    })
  │
  └─ Response: 201 { ...scaffold }
```

---

### 6.5 Flujo: EDITAR/DESARMAR Andamio en Proyecto Inactivo

```
Usuario intenta editar/desarmar andamio
  ↓
Backend: PUT /api/scaffolds/:id (o PUT .../disassemble)
  ├─ 1. Obtener andamio
  │    const scaffold = await Scaffold.getById(id)
  │
  ├─ 2. ⭐ VALIDAR QUE PROYECTO ESTÉ ACTIVO
  │    const project = await Project.getById(scaffold.project_id)
  │    if (!project.active || !project.client_active) {
  │      return 400: "No se pueden editar/desarmar andamios de un proyecto o cliente desactivado"
  │    }
  │
  └─ (Continúa con la operación normal)
```

**Frontend:**
- Banner amarillo visible en `ScaffoldsPage`, `ProjectScaffoldsPage`
- Botones de crear/editar/desarmar deshabilitados
- Toast de error si intenta crear desde selector de proyecto

---

## 7. SCRIPTS Y MIGRACIONES

### 7.1 Script: `migrate_scaffold_history.js`

**Ubicación:** `backend/src/scripts/migrate_scaffold_history.js`

**Ejecutado:** Enero 6, 2026 (comando: `node backend/src/scripts/migrate_scaffold_history.js`)

**Propósito:**
Actualizar tabla `scaffold_history` para soportar historial inmutable que sobrevive a eliminación de andamios.

**Acciones Realizadas:**

```javascript
// Paso 1: Agregar columnas denormalizadas
ALTER TABLE scaffold_history 
  ADD COLUMN IF NOT EXISTS scaffold_number VARCHAR(255),
  ADD COLUMN IF NOT EXISTS project_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS area VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tag VARCHAR(255);

// Paso 2: Poblar datos denormalizados desde registros existentes
UPDATE scaffold_history sh
SET 
  scaffold_number = s.scaffold_number,
  project_name = p.name,
  area = s.area::VARCHAR,
  tag = s.tag::VARCHAR
FROM scaffolds s
LEFT JOIN projects p ON s.project_id = p.id
WHERE sh.scaffold_id = s.id
  AND sh.scaffold_number IS NULL;

// Paso 3: Cambiar constraint de FK
// 3.1. Eliminar constraint antigua (ON DELETE CASCADE)
ALTER TABLE scaffold_history 
  DROP CONSTRAINT scaffold_history_scaffold_id_fkey;

// 3.2. Hacer columna nullable
ALTER TABLE scaffold_history 
  ALTER COLUMN scaffold_id DROP NOT NULL;

// 3.3. Crear nueva constraint con SET NULL
ALTER TABLE scaffold_history 
  ADD CONSTRAINT scaffold_history_scaffold_id_fkey 
  FOREIGN KEY (scaffold_id) 
  REFERENCES scaffolds(id) 
  ON DELETE SET NULL;

// Paso 4: Crear índice para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_scaffold_history_user 
  ON scaffold_history(user_id, created_at DESC);
```

**Resultado:**
```
✅ Migración completada exitosamente
  ✓ Columnas denormalizadas agregadas (scaffold_number, project_name, area, tag)
  ✓ Datos históricos preservados en registros existentes
  ✓ Constraint cambiado de CASCADE a SET NULL
  ✓ Índice creado para optimizar consultas
🎯 Ahora el historial de cambios sobrevivirá a la eliminación de andamios
```

**Estado Final:**
- Tabla migrada exitosamente
- Datos históricos preservados
- Sistema de historial inmutable funcional

---

## 8. ARQUITECTURA DE SOFT DELETE

### 8.1 Patrón Implementado

```
CLIENTE (Empresa Mandante)
  ├─ active: boolean
  ├─ Soft delete si tiene proyectos
  ├─ Delete permanente si NO tiene proyectos
  └─ Cascada: deactivate() → desactiva todos sus proyectos

PROYECTO
  ├─ active: boolean
  ├─ client_active: boolean (denormalizado del cliente)
  ├─ Soft delete si tiene andamios
  ├─ Delete permanente si NO tiene andamios
  └─ Proyecto inactivo → andamios inmutables

ANDAMIO
  ├─ NO tiene columna active
  ├─ assembly_status: 'assembled' | 'disassembled'
  ├─ Desarmado = estado final inmutable
  ├─ Delete permanente (solo admin)
  └─ Al eliminar → registro en scaffold_history sobrevive
```

### 8.2 Niveles de Protección

**Nivel 1: Cliente Desactivado**
- Cliente: `active = false`
- Proyectos: `active = false` (cascada)
- Andamios: inmutables (no crear, no editar, no desarmar)

**Nivel 2: Proyecto Desactivado**
- Proyecto: `active = false`
- Cliente: puede estar activo
- Andamios: inmutables (no crear, no editar, no desarmar)

**Nivel 3: Andamio Desarmado**
- Andamio: `assembly_status = 'disassembled'`
- No se puede cambiar a `assembled` o `in_progress`
- Registro histórico inmutable

**Nivel 4: Andamio Eliminado**
- Andamio: registro eliminado de tabla `scaffolds`
- Historial: `scaffold_id = NULL`
- Datos preservados en campos denormalizados

---

## 9. RESUMEN DE CAMBIOS POR FECHA

### Enero 3-4, 2026: Sistema Soft Delete de Proyectos

**Backend:**
- ✅ Columna `active` agregada a tabla `projects`
- ✅ Índice `idx_projects_active` creado
- ✅ Métodos agregados: `deactivate()`, `reactivate()`, `getAllIncludingInactive()`, `getScaffoldCount()`
- ✅ Ruta modificada: `DELETE /api/projects/:id` con lógica condicional
- ✅ Rutas nuevas: `GET /projects/:id/scaffolds/count`, `PATCH /projects/:id/reactivate`

**Frontend:**
- ✅ Estado `scaffoldCount` y `showInactive` en ProjectsPage
- ✅ Modal dinámico (Desactivar vs Eliminar)
- ✅ Botón "Reactivar" para proyectos desactivados
- ✅ Checkbox "Mostrar desactivados"
- ✅ Estilo visual para proyectos inactivos (gris, opacity-60)

### Enero 4-5, 2026: Sistema Soft Delete de Clientes + Validaciones

**Backend:**
- ✅ Columna `active` agregada a tabla `clients`
- ✅ Índice `idx_clients_active` creado
- ✅ Métodos agregados en Client: `deactivate()`, `reactivate()`, `getAllIncludingInactive()`
- ✅ Método modificado: `Client.delete()` con lógica condicional
- ✅ Validaciones en scaffolds: NO crear/editar/desarmar en proyecto/cliente inactivo

**Frontend:**
- ✅ Banners amarillos en ScaffoldsPage, ProjectScaffoldsPage
- ✅ Botones deshabilitados en proyectos inactivos
- ✅ Validación UI antes de navegar a CreateScaffoldPage

### Enero 6, 2026: Sistema de Historial Inmutable

**Backend:**
- ✅ Migración ejecutada: `migrate_scaffold_history.js`
- ✅ Columnas denormalizadas agregadas: `scaffold_number`, `project_name`, `area`, `tag`
- ✅ Constraint cambiado: `ON DELETE CASCADE` → `ON DELETE SET NULL`
- ✅ Índice agregado: `idx_scaffold_history_user`
- ✅ Método modificado: `ScaffoldHistory.create()` con campos denormalizados
- ✅ Método modificado: `ScaffoldHistory.getByUser()` con LEFT JOIN y COALESCE
- ✅ Endpoint modificado: `DELETE /api/scaffolds/:id` registra en historial ANTES de eliminar

**Frontend:**
- ✅ HistoryPage muestra datos denormalizados
- ✅ Soporte para andamios eliminados (scaffold_deleted: true)

---

## 10. DOCUMENTACIÓN COMPLEMENTARIA

### 10.1 Archivo Markdown Existente

**Ubicación:** `/home/proyectos/reportes/SISTEMA_SOFT_DELETE_PROYECTOS.md`

**Contenido:**
- Documentación detallada del sistema soft delete de proyectos
- Ejemplos de código de todos los cambios
- Flujos de usuario paso a paso
- Testing y resultados del build

**Estado:** Actualizado, completo, válido

---

### 10.2 Memorias Serena Relacionadas

**Memorias Previas:**
- `ARQUITECTURA_SISTEMA_ACTUAL`: Arquitectura general del sistema
- `code_style_and_conventions`: Estándares de código
- `scaffold-status-validation-implementation`: Validaciones de estado de andamios

**Esta Memoria:**
- `ESTADO_APLICACION_ENERO_2026`: Estado completo actualizado (este documento)

---

## 11. COMANDOS ÚTILES

### Verificar Estado de Base de Datos

```bash
# Ver estructura de tabla clients
docker exec -i alltura_postgres psql -U alltura_user -d alltura_reports_db -c "\d clients"

# Ver estructura de tabla projects
docker exec -i alltura_postgres psql -U alltura_user -d alltura_reports_db -c "\d projects"

# Ver estructura de tabla scaffold_history
docker exec -i alltura_postgres psql -U alltura_user -d alltura_reports_db -c "\d scaffold_history"

# Contar proyectos activos vs inactivos
docker exec -i alltura_postgres psql -U alltura_user -d alltura_reports_db -c "SELECT active, COUNT(*) FROM projects GROUP BY active;"

# Ver registros de historial con scaffold eliminado
docker exec -i alltura_postgres psql -U alltura_user -d alltura_reports_db -c "SELECT COUNT(*) FROM scaffold_history WHERE scaffold_id IS NULL;"
```

### Ejecutar Migración (si es necesario)

```bash
cd /home/proyectos/reportes
node backend/src/scripts/migrate_scaffold_history.js
```

---

## 12. PUNTOS CRÍTICOS PARA FUTURAS IMPLEMENTACIONES

### ⚠️ Consideraciones Importantes

1. **Historial Inmutable**: Nunca eliminar registros de `scaffold_history`
2. **Campos Denormalizados**: Siempre proporcionar al crear registro de historial
3. **Validación de Proyecto Activo**: Verificar ANTES de crear/editar/desarmar andamios
4. **Andamios Desarmados**: NO permitir rearmar, son registros históricos
5. **Cascada de Desactivación**: Cliente desactivado → proyectos desactivados
6. **Soft Delete Condicional**: Verificar dependencias antes de eliminar (proyectos, clientes)

### 🔒 Reglas de Integridad

1. NO modificar constraint `scaffold_history.scaffold_id` (debe ser SET NULL)
2. NO eliminar columnas denormalizadas de `scaffold_history`
3. NO permitir crear andamios en proyectos/clientes inactivos
4. NO permitir editar andamios desarmados
5. Al eliminar andamio, SIEMPRE registrar en historial primero

---

**Última Actualización:** Enero 7, 2026 - 18:50  
**Estado:** Completo, Validado, Producción  
**Fuente:** Análisis exhaustivo del código fuente y base de datos  

### Nota Reciente (Enero 7, 2026):
- ✅ ProfilePage rediseñado con diseño responsive moderno
- ✅ Backend ya soportaba RUT y teléfono (validaciones Joi implementadas)
- ✅ Frontend actualizado con grid responsive (1 col mobile, 2 cols desktop)
- ✅ Sistema completo de gestión de perfil funcional (foto, datos personales, contraseña)
