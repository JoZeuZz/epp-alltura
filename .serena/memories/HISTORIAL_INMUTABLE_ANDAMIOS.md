# Sistema de Historial Inmutable de Andamios

## Fecha de Implementación
Enero 6, 2026

## Problema Resuelto
El historial de cambios de andamios se eliminaba cuando se borraba el andamio debido a `ON DELETE CASCADE`, violando principios de auditoría. El usuario reportó: "al borrar cualquier cosa, esto borra consigo el historial de cambios de ese mismo objeto".

## Solución Implementada

### Denormalización + FK SET NULL
Separar el historial como entidad independiente que sobrevive a la eliminación de andamios mediante:
1. Cambio de constraint `ON DELETE CASCADE` → `ON DELETE SET NULL`
2. Columna `scaffold_id` ahora nullable
3. Campos denormalizados para preservar contexto tras eliminación

## Schema de Base de Datos

### Tabla `scaffold_history` (Actualizada)

```sql
CREATE TABLE IF NOT EXISTS scaffold_history (
    id SERIAL PRIMARY KEY,
    scaffold_id INTEGER REFERENCES scaffolds(id) ON DELETE SET NULL,  -- ← NULLABLE
    user_id INTEGER NOT NULL REFERENCES users(id),
    change_type VARCHAR(100) NOT NULL,
    previous_data JSONB,
    new_data JSONB,
    description TEXT,
    -- Campos denormalizados (NUEVOS)
    scaffold_number VARCHAR(255),
    project_name VARCHAR(255),
    area VARCHAR(255),
    tag VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para optimizar consultas por usuario
CREATE INDEX IF NOT EXISTS idx_scaffold_history_user 
ON scaffold_history(user_id, created_at DESC);
```

### Cambios vs Schema Anterior

| Campo | Antes | Ahora |
|-------|-------|-------|
| `scaffold_id` | `NOT NULL ... ON DELETE CASCADE` | `nullable ... ON DELETE SET NULL` |
| `scaffold_number` | - | `VARCHAR(255)` denormalizado |
| `project_name` | - | `VARCHAR(255)` denormalizado |
| `area` | - | `VARCHAR(255)` denormalizado |
| `tag` | - | `VARCHAR(255)` denormalizado |

## Modelo ScaffoldHistory

### Método `create()` - Actualizado

```javascript
async create(historyData) {
  const {
    scaffold_id,
    user_id,
    change_type,
    previous_data,
    new_data,
    description,
    // Campos denormalizados
    scaffold_number,
    project_name,
    area,
    tag,
  } = historyData;

  const query = `
    INSERT INTO scaffold_history 
      (scaffold_id, user_id, change_type, previous_data, new_data, description, 
       scaffold_number, project_name, area, tag)
    VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;

  const values = [
    scaffold_id,
    user_id,
    change_type,
    JSON.stringify(previous_data || {}),
    JSON.stringify(new_data || {}),
    description,
    scaffold_number,
    project_name,
    area,
    tag,
  ];

  const { rows } = await db.query(query, values);
  return rows[0];
}
```

### Método `getByUser()` - Actualizado con COALESCE

```javascript
async getByUser(userId) {
  const query = `
    SELECT 
      sh.*,
      COALESCE(s.scaffold_number, sh.scaffold_number) as scaffold_number,
      COALESCE(s.area::VARCHAR, sh.area) as area,
      COALESCE(s.tag::VARCHAR, sh.tag) as tag,
      COALESCE(p.name, sh.project_name) as project_name,
      CASE 
        WHEN sh.scaffold_id IS NULL THEN true 
        ELSE false 
      END as scaffold_deleted
    FROM scaffold_history sh
    LEFT JOIN scaffolds s ON sh.scaffold_id = s.id
    LEFT JOIN projects p ON s.project_id = p.id
    WHERE sh.user_id = $1
    ORDER BY sh.created_at DESC
  `;

  const { rows } = await db.query(query, [userId]);
  
  return rows.map(row => ({
    ...row,
    previous_data: typeof row.previous_data === 'string' 
      ? JSON.parse(row.previous_data) 
      : row.previous_data,
    new_data: typeof row.new_data === 'string' 
      ? JSON.parse(row.new_data) 
      : row.new_data,
  }));
}
```

**Lógica COALESCE:**
- Si `scaffold_id IS NOT NULL` → Usar datos actuales del andamio (JOINs)
- Si `scaffold_id IS NULL` → Usar datos denormalizados (andamio eliminado)

### Método `createFromChanges()` - Actualizado

```javascript
async createFromChanges(scaffoldId, userId, previousData, newData, denormalizedData = {}) {
  const changes = [];
  const changeType = [];

  // Detectar cambios...
  // (lógica existente)

  return this.create({
    scaffold_id: scaffoldId,
    user_id: userId,
    change_type: type,
    previous_data: previousData,
    new_data: newData,
    description,
    // Campos denormalizados
    scaffold_number: denormalizedData.scaffold_number || previousData.scaffold_number,
    project_name: denormalizedData.project_name,
    area: denormalizedData.area || previousData.area,
    tag: denormalizedData.tag || previousData.tag,
  });
}
```

## Actualización de Endpoints

### POST /api/scaffolds (Crear andamio)

```javascript
await ScaffoldHistory.create({
  scaffold_id: scaffold.id,
  user_id: req.user.id,
  change_type: 'create',
  previous_data: {},
  new_data: scaffold,
  description: 'Andamio creado',
  // Datos denormalizados
  scaffold_number: scaffold.scaffold_number,
  project_name: project.name,
  area: scaffold.area,
  tag: scaffold.tag,
});
```

### PATCH /api/scaffolds/:id/card-status

```javascript
const project = await Project.getById(scaffold.project_id);

await ScaffoldHistory.create({
  scaffold_id: id,
  user_id: req.user.id,
  change_type: 'card_status',
  previous_data: { card_status: scaffold.card_status },
  new_data: { card_status },
  description: `Tarjeta cambiada de ${scaffold.card_status} a ${card_status}`,
  // Datos denormalizados
  scaffold_number: scaffold.scaffold_number,
  project_name: project?.name,
  area: scaffold.area,
  tag: scaffold.tag,
});
```

### PATCH /api/scaffolds/:id/assembly-status

```javascript
const project = await Project.getById(scaffold.project_id);

await ScaffoldHistory.create({
  // ... campos anteriores
  // Datos denormalizados
  scaffold_number: scaffold.scaffold_number,
  project_name: project?.name,
  area: scaffold.area,
  tag: scaffold.tag,
});
```

### PUT /api/scaffolds/:id/disassemble

```javascript
// 'project' ya está cargado para validación de proyecto activo
await ScaffoldHistory.create({
  // ... campos anteriores
  // Datos denormalizados
  scaffold_number: scaffold.scaffold_number,
  project_name: project.name,
  area: scaffold.area,
  tag: scaffold.tag,
});
```

### PUT /api/scaffolds/:id (Actualización general)

```javascript
const project = await Project.getById(scaffold.project_id);

await ScaffoldHistory.createFromChanges(id, req.user.id, scaffold, updated, {
  scaffold_number: scaffold.scaffold_number,
  project_name: project?.name,
  area: scaffold.area,
  tag: scaffold.tag,
});
```

### DELETE /api/scaffolds/:id - CRÍTICO: Registrar ANTES de borrar

```javascript
// Obtener andamio completo
const scaffold = await Scaffold.getById(id);
const project = await Project.getById(scaffold.project_id);

// *** REGISTRAR ELIMINACIÓN ANTES DE BORRAR ***
await ScaffoldHistory.create({
  scaffold_id: id,
  user_id: req.user.id,
  change_type: 'delete',
  previous_data: scaffold,
  new_data: {},
  description: 'Andamio eliminado del sistema',
  // Datos denormalizados
  scaffold_number: scaffold.scaffold_number,
  project_name: project?.name,
  area: scaffold.area,
  tag: scaffold.tag,
});

// Eliminar imágenes...
// DELETE FROM scaffolds WHERE id = $1
```

## Script de Migración

### Archivo: `backend/src/scripts/migrate_scaffold_history.js`

```javascript
async function migrateScaffoldHistory() {
  // 1. Agregar columnas denormalizadas
  await client.query(`
    ALTER TABLE scaffold_history 
    ADD COLUMN IF NOT EXISTS scaffold_number VARCHAR(255),
    ADD COLUMN IF NOT EXISTS project_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS area VARCHAR(255),
    ADD COLUMN IF NOT EXISTS tag VARCHAR(255);
  `);
  
  // 2. Poblar datos desde registros existentes
  await client.query(`
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
  `);
  
  // 3. Cambiar constraint
  // Encontrar constraint actual
  // DROP CONSTRAINT <nombre>
  // ALTER COLUMN scaffold_id DROP NOT NULL
  // ADD CONSTRAINT ... ON DELETE SET NULL
  
  // 4. Crear índice
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_scaffold_history_user 
    ON scaffold_history(user_id, created_at DESC);
  `);
}
```

**Resultado de ejecución:**
```
✅ 1 registros de historial actualizados con datos denormalizados
✅ Constraint cambiado de CASCADE a SET NULL
✅ Índice creado para optimizar consultas
```

## Comportamiento Final

### ANTES (Problema)
```
Admin crea andamio #34   → Historial: 1 registro
Admin edita andamio #34  → Historial: 2 registros
Admin borra andamio #34  → Historial: 0 registros ❌ (CASCADE DELETE)
```

### AHORA (Solución)
```
Admin crea andamio #34   → Historial: 1 registro
                           scaffold_id: 34
                           scaffold_number: "34"
                           project_name: "Proyecto A"

Admin edita andamio #34  → Historial: 2 registros

Admin borra andamio #34  → Historial: 3 registros ✅
                           - Registro 1: scaffold_id=NULL, scaffold_number="34" (creación)
                           - Registro 2: scaffold_id=NULL, scaffold_number="34" (edición)
                           - Registro 3: scaffold_id=NULL, scaffold_number="34" (eliminación)
```

## Ventajas del Sistema

1. **Auditoría completa**: Todo cambio permanece para siempre
2. **Cumplimiento normativo**: Historial inmutable para auditorías
3. **Trazabilidad**: Quién hizo qué y cuándo, incluso años después
4. **Performance**: Índice optimizado `(user_id, created_at DESC)`
5. **Datos contextuales**: Información del andamio preservada tras eliminación
6. **Migración segura**: Script con transacciones para evitar corrupción

## Tipos de Cambios Registrados

- `create`: Creación de andamio
- `update`: Actualización general
- `card_status`: Cambio de tarjeta verde/roja
- `assembly_status`: Cambio de estado armado/desarmado
- `progress`: Cambio de porcentaje de avance
- `dimensions`: Cambio de dimensiones
- `disassemble`: Desarmado con foto
- `delete`: Eliminación del sistema ← **NUEVO**

## Frontend

### HistoryPage.tsx
- Muestra registros con `scaffold_deleted: true`
- Badge visual "Andamio eliminado" cuando `scaffold_id IS NULL`
- Tooltip: "Este andamio ya no existe en el sistema"

## Reglas de Negocio

1. **El historial pertenece al usuario**, no al andamio
2. **Los registros de historial NUNCA se eliminan**
3. **scaffold_id puede ser NULL** (andamio eliminado)
4. **Datos denormalizados SIEMPRE se guardan** en cada insert
5. **La query usa COALESCE** para mostrar datos actuales o denormalizados

## Consultas Optimizadas

### Historial de usuario (con andamios eliminados)
```sql
SELECT 
  sh.*,
  COALESCE(s.scaffold_number, sh.scaffold_number) as scaffold_number,
  CASE WHEN sh.scaffold_id IS NULL THEN true ELSE false END as scaffold_deleted
FROM scaffold_history sh
LEFT JOIN scaffolds s ON sh.scaffold_id = s.id
WHERE sh.user_id = $1
ORDER BY sh.created_at DESC
```

**Performance:** Índice `idx_scaffold_history_user` optimiza esta query crítica.

## Mejoras Futuras Sugeridas
- Agregar columna `deleted_at TIMESTAMP` en tabla `scaffolds` para soft delete completo
- Considerar tabla `audit_log` genérica para otros modelos (projects, clients, users)
- Política de retención: archivar historial >2 años en tabla `scaffold_history_archive`
- Dashboard de auditoría para admins: "Cambios por usuario en últimos 30 días"
