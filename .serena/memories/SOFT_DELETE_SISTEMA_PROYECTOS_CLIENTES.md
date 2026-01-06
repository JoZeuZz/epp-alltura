# Sistema de Soft Delete - Proyectos y Clientes

## Fecha de Implementación
Enero 4-6, 2026

## Problema Resuelto
Prevenir eliminación accidental de proyectos/clientes con datos históricos asociados (andamios). El sistema original permitía DELETE que causaba pérdida de datos.

## Implementación

### 1. Schema de Base de Datos

#### Tabla `clients`
```sql
ALTER TABLE clients ADD COLUMN active BOOLEAN DEFAULT TRUE;
```

#### Tabla `projects`
```sql
ALTER TABLE projects ADD COLUMN active BOOLEAN DEFAULT TRUE;
```

### 2. Modelos Backend

#### Client Model (`backend/src/models/client.js`)

**Métodos nuevos:**

```javascript
async deactivate(id) {
  // Desactivar cliente
  await db.query('UPDATE clients SET active = FALSE WHERE id = $1', [id]);
  
  // Desactivar proyectos en cascada
  await db.query('UPDATE projects SET active = FALSE WHERE client_id = $1', [id]);
  
  return { deactivated: true };
}

async reactivate(id) {
  // Reactivar cliente
  await db.query('UPDATE clients SET active = TRUE WHERE id = $1', [id]);
  
  // Reactivar proyectos
  await db.query('UPDATE projects SET active = TRUE WHERE client_id = $1', [id]);
  
  return { reactivated: true };
}

async getAllIncludingInactive() {
  // Retorna todos los clientes, incluyendo desactivados
  return db.query('SELECT * FROM clients ORDER BY name');
}

async getProjectCount(id) {
  // Cuenta proyectos del cliente
  const { rows } = await db.query(
    'SELECT COUNT(*) FROM projects WHERE client_id = $1',
    [id]
  );
  return parseInt(rows[0].count);
}
```

#### Project Model (`backend/src/models/project.js`)

**Métodos nuevos:**

```javascript
async deactivate(id) {
  const { rows } = await db.query(
    'UPDATE projects SET active = FALSE WHERE id = $1 RETURNING *',
    [id]
  );
  return { ...rows[0], deactivated: true };
}

async reactivate(id) {
  const { rows } = await db.query(
    'UPDATE projects SET active = TRUE WHERE id = $1 RETURNING *',
    [id]
  );
  return { ...rows[0], reactivated: true };
}

async getAllIncludingInactive() {
  const query = `
    SELECT p.*, 
           c.name as client_name,
           c.active as client_active,
           u1.first_name || ' ' || u1.last_name as assigned_supervisor_name,
           u2.first_name || ' ' || u2.last_name as assigned_client_name
    FROM projects p
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN users u1 ON p.assigned_supervisor_id = u1.id
    LEFT JOIN users u2 ON p.assigned_client_id = u2.id
    ORDER BY p.created_at DESC
  `;
  return (await db.query(query)).rows;
}

async getScaffoldCount(id) {
  const { rows } = await db.query(
    'SELECT COUNT(*) FROM scaffolds WHERE project_id = $1',
    [id]
  );
  return parseInt(rows[0].count);
}
```

**Método `getAll()` actualizado:**
```javascript
async getAll() {
  const query = `
    SELECT p.*, 
           c.name as client_name,
           c.active as client_active  // ← Campo agregado
    FROM projects p
    LEFT JOIN clients c ON p.client_id = c.id
    WHERE p.active = TRUE AND c.active = TRUE  // ← Filtro dual
    ORDER BY p.created_at DESC
  `;
  return (await db.query(query)).rows;
}
```

### 3. Endpoints Backend

#### DELETE /api/projects/:id
```javascript
// Lógica condicional
const scaffoldCount = await Project.getScaffoldCount(id);

if (scaffoldCount > 0) {
  // Desactivar si tiene andamios
  await Project.deactivate(id);
  return res.json({ 
    message: 'Proyecto desactivado (tiene andamios asociados)',
    deactivated: true 
  });
} else {
  // Eliminar si no tiene andamios
  await Project.delete(id);
  return res.json({ 
    message: 'Proyecto eliminado' 
  });
}
```

#### PATCH /api/projects/:id/reactivate
```javascript
const project = await Project.reactivate(id);
res.json({ message: 'Proyecto reactivado', project });
```

#### DELETE /api/clients/:id
```javascript
const projectCount = await Client.getProjectCount(id);

if (projectCount > 0) {
  await Client.deactivate(id);
  return res.json({ 
    message: 'Cliente desactivado (tiene proyectos)',
    deactivated: true 
  });
} else {
  await Client.delete(id);
  return res.json({ message: 'Cliente eliminado' });
}
```

#### POST /api/clients/:id/reactivate
```javascript
await Client.reactivate(id);
res.json({ message: 'Cliente reactivado' });
```

### 4. Frontend UI

#### ProjectsPage.tsx
- **Modal dinámico de eliminación**: Detecta si el proyecto tiene andamios y muestra mensaje apropiado
- **Botón "Reactivar"**: Aparece en proyectos desactivados
- **Checkbox**: "Mostrar proyectos desactivados" para filtrar vista
- **Badge visual**: Etiqueta "Desactivado" en proyectos inactivos

#### ClientsPage.tsx
- **Modal dinámico de eliminación**: Similar a proyectos
- **Botón "Reactivar"**: Para clientes desactivados
- **Badge visual**: Indicador de estado

### 5. Cascada de Desactivación

```
Cliente desactivado → Todos sus proyectos desactivados
                    → Andamios inmutables (no crear/editar)

Proyecto desactivado → Andamios inmutables
```

### 6. Validaciones de Integridad

#### En creación/edición de andamios:
```javascript
// POST /api/scaffolds
const project = await Project.getById(validatedData.project_id);
if (!project.active || !project.client_active) {
  return res.status(400).json({ 
    message: 'No se pueden crear andamios en un proyecto o cliente desactivado'
  });
}

// PUT /api/scaffolds/:id  
if (!project.active || !project.client_active) {
  return res.status(400).json({ 
    message: 'No se pueden editar andamios de un proyecto o cliente desactivado'
  });
}

// PUT /api/scaffolds/:id/disassemble
if (!project.active || !project.client_active) {
  return res.status(400).json({ 
    message: 'No se pueden desarmar andamios de un proyecto o cliente desactivado'
  });
}
```

#### En frontend:
- **Banner amarillo**: Muestra advertencia en ScaffoldsPage y ProjectScaffoldsPage
- **Botones deshabilitados**: "Reportar Montaje" disabled cuando proyecto/cliente inactivo

## Reglas de Negocio

1. **Proyecto con andamios → Desactivar** (no eliminar)
2. **Cliente con proyectos → Desactivar** (no eliminar)
3. **Cliente desactivado → Proyectos desactivados en cascada**
4. **Proyecto desactivado → Andamios en modo solo lectura**
5. **Solo admin puede reactivar** proyectos y clientes

## Protección de Datos Históricos

- Los andamios permanecen en la base de datos aunque el proyecto esté desactivado
- El historial de cambios se preserva intacto
- Los reportes PDF/Excel pueden generarse de proyectos desactivados
- Cumplimiento de auditoría y trazabilidad regulatoria

## Estados Posibles

### Proyecto
- `active: true` - Normal, operativo
- `active: false` - Desactivado, solo lectura

### Cliente
- `active: true` - Normal, operativo  
- `active: false` - Desactivado, proyectos en cascada desactivados

## Queries Actualizadas

### Listar solo activos
```sql
SELECT p.*, c.active as client_active
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
WHERE p.active = TRUE AND c.active = TRUE
```

### Listar todos (incluyendo inactivos)
```sql
SELECT p.*, c.active as client_active
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
ORDER BY p.created_at DESC
```

## Mejoras Futuras Sugeridas
- Agregar `deactivated_at TIMESTAMP` para auditoría temporal
- Logs de quién desactivó/reactivó (actualmente en scaffold_history pero no en project_history)
- Auto-reactivación de proyectos cuando cliente se reactiva (opcional)
