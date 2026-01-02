# Sistema de Desactivación de Clientes y Proyectos

## 📋 Resumen de Implementación

Se ha implementado un sistema de **soft delete** (desactivación) para Clientes Empresa y sus Proyectos asociados, que previene la pérdida accidental de datos.

## 🎯 Funcionalidad Implementada

### 1. Lógica de Eliminación Inteligente

**Clientes SIN proyectos vinculados:**
- ✅ Se ELIMINAN permanentemente de la base de datos
- ✅ No dejan rastro en el sistema

**Clientes CON proyectos vinculados:**
- ⚠️ Se DESACTIVAN (campo `active = FALSE`)
- ⚠️ Todos sus proyectos se desactivan automáticamente en cascada
- ⚠️ Los datos permanecen en la base de datos para consultas históricas

### 2. Restricciones de Acceso por Rol

#### 👨‍💼 Administrador
- ✅ Ve TODOS los clientes (activos y desactivados)
- ✅ Ve TODOS los proyectos (activos y desactivados)
- ✅ Puede REACTIVAR clientes y proyectos desactivados
- ⚠️ NO puede crear ni editar andamios en proyectos desactivados
- ✅ Puede VER andamios históricos de proyectos desactivados

#### 👷 Supervisor
- ✅ Ve SOLO proyectos ACTIVOS con clientes ACTIVOS
- ❌ NO ve proyectos desactivados en su dashboard
- ⚠️ NO puede crear andamios en proyectos desactivados
- ⚠️ Si intenta acceder directamente a un proyecto desactivado, ve advertencia

#### 👤 Usuario Cliente
- ✅ Ve SOLO proyectos ACTIVOS
- ❌ NO ve proyectos desactivados

## 🗄️ Cambios en Base de Datos

### Migración Ejecutada
```sql
-- Archivo: backend/src/db/migration_add_active_status.sql
ALTER TABLE clients ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE projects ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX idx_clients_active ON clients(active);
CREATE INDEX idx_projects_active ON projects(active);
```

**Estado:** ✅ Ejecutada exitosamente

### Todos los registros existentes
- Clientes: `active = TRUE` (por defecto)
- Proyectos: `active = TRUE` (por defecto)

## 🔧 Archivos Modificados

### Backend

1. **backend/src/models/client.js**
   - `getAll()` - Filtra solo activos
   - `getAllIncludingInactive()` - Incluye inactivos (para admin)
   - `delete(id)` - Lógica condicional: elimina o desactiva
   - `deactivate(id)` - Desactiva cliente y proyectos en cascada
   - `reactivate(id)` - Reactiva cliente y proyectos

2. **backend/src/routes/clients.js**
   - GET `/` - Usa `getAllIncludingInactive()` para admin
   - DELETE `/:id` - Retorna si fue eliminado o desactivado
   - POST `/:id/reactivate` - Nuevo endpoint para reactivar

3. **backend/src/models/project.js**
   - `getAll()` - Filtra proyectos activos con clientes activos
   - `getAllIncludingInactive()` - Para admin
   - `getById()` - Incluye `client_active`
   - `getForUser()` - Filtra solo activos (supervisor/cliente)

### Frontend

4. **frontend/src/types/api.d.ts**
   - `Client` interface - Agregado `active: boolean`
   - `Project` interface - Agregado `active: boolean` y `client_active: boolean`

5. **frontend/src/pages/admin/ClientsPage.tsx**
   - Columna visual de estado (Activo/Desactivado)
   - Badge de color verde/gris según estado
   - Fondo gris para clientes desactivados
   - Botón "Eliminar" → "Reactivar" si está desactivado
   - Mensaje diferenciado al eliminar/desactivar

6. **frontend/src/pages/admin/ScaffoldsPage.tsx**
   - Guarda proyecto completo al seleccionar
   - Alerta visual amarilla si proyecto/cliente desactivado
   - Botón "Crear Andamio" deshabilitado si desactivado
   - Validación antes de navegar a creación

7. **frontend/src/pages/supervisor/SupervisorDashboard.tsx**
   - Filtra automáticamente proyectos desactivados
   - Solo muestra proyectos activos con clientes activos

8. **frontend/src/pages/supervisor/CreateScaffoldPage.tsx**
   - Verificación al cargar: bloquea si proyecto desactivado
   - Pantalla de advertencia amarilla con botón "Volver"
   - Previene creación de andamios en proyectos desactivados

## 🎨 Interfaz de Usuario

### Indicadores Visuales

**Clientes Desactivados:**
```
┌─────────────────────────────────────────┐
│ Estado    │ Nombre        │ Acciones   │
├─────────────────────────────────────────┤
│ 🔴 Desact │ CMPC S.A.     │ Reactivar  │ ← Fondo gris
│ 🟢 Activo │ Arauco S.A.   │ Eliminar   │
└─────────────────────────────────────────┘
```

**Proyectos Desactivados (Admin):**
```
┌──────────────────────────────────────────────────┐
│ ⚠️ Proyecto Desactivado                          │
│ El cliente empresa está desactivado.             │
│ No se pueden crear ni editar andamios.           │
└──────────────────────────────────────────────────┘
```

**Vista Supervisor:**
```
No muestra proyectos desactivados en absoluto
```

## 🧪 Casos de Prueba

### Prueba 1: Eliminar Cliente SIN Proyectos
1. Crear cliente nuevo sin proyectos
2. Hacer clic en "Eliminar"
3. ✅ Confirmar
4. **Resultado:** Cliente eliminado permanentemente

### Prueba 2: Eliminar Cliente CON Proyectos
1. Cliente con proyectos asociados
2. Hacer clic en "Eliminar"
3. ✅ Confirmar
4. **Resultado:** 
   - Toast: "Cliente desactivado correctamente (tiene proyectos vinculados)"
   - Estado cambia a "Desactivado"
   - Botón cambia a "Reactivar"
   - Fondo se vuelve gris

### Prueba 3: Reactivar Cliente
1. Cliente desactivado
2. Hacer clic en "Reactivar"
3. ✅ Confirmar
4. **Resultado:**
   - Cliente reactivado
   - Proyectos reactivados
   - Vuelve a estado normal

### Prueba 4: Intentar Crear Andamio en Proyecto Desactivado (Admin)
1. Desactivar cliente con proyectos
2. Ir a "Visualizador de Andamios"
3. Seleccionar proyecto desactivado
4. **Resultado:**
   - Alerta amarilla visible
   - Botón "Crear Andamio" deshabilitado

### Prueba 5: Supervisor con Proyecto Desactivado
1. Supervisor asignado a proyecto
2. Admin desactiva el cliente
3. Supervisor recarga dashboard
4. **Resultado:**
   - Proyecto NO aparece en lista
   - Si intenta acceso directo URL, ve advertencia

## 🔄 Flujo de Desactivación en Cascada

```
Cliente Desactivado (active = FALSE)
    ↓
    ├─ Proyecto 1 (active = FALSE)
    │   ├─ Andamio 1 (visible, no editable)
    │   └─ Andamio 2 (visible, no editable)
    │
    ├─ Proyecto 2 (active = FALSE)
    │   └─ Andamio 3 (visible, no editable)
    │
    └─ Proyecto 3 (active = FALSE)
```

## 📊 Queries SQL Afectadas

### Antes de la Migración
```sql
SELECT * FROM clients ORDER BY name;
SELECT * FROM projects ORDER BY created_at DESC;
```

### Después de la Migración

**Admin:**
```sql
-- Ve todos
SELECT * FROM clients ORDER BY name;
SELECT * FROM projects ORDER BY created_at DESC;
```

**Supervisor/Cliente:**
```sql
-- Solo activos
SELECT * FROM clients WHERE active = TRUE;
SELECT * FROM projects WHERE active = TRUE AND client_id IN (
  SELECT id FROM clients WHERE active = TRUE
);
```

## 🚀 Endpoints API

### Nuevos/Modificados

**DELETE /api/clients/:id**
- Respuesta cuando elimina:
  ```json
  {
    "message": "Cliente eliminado correctamente",
    "deleted": true
  }
  ```
- Respuesta cuando desactiva:
  ```json
  {
    "message": "Cliente desactivado correctamente",
    "deactivated": true,
    "client": { ...clientData }
  }
  ```

**POST /api/clients/:id/reactivate** (Nuevo)
- Reactiva cliente y todos sus proyectos
- Respuesta:
  ```json
  {
    "message": "Cliente reactivado correctamente",
    "client": { ...clientData }
  }
  ```

## ⚙️ Configuración de Índices

Para optimizar performance en filtros por `active`:
```sql
CREATE INDEX idx_clients_active ON clients(active);
CREATE INDEX idx_projects_active ON projects(active);
```

## 📝 Notas Importantes

1. **Datos históricos preservados:** Los andamios de proyectos desactivados permanecen intactos
2. **Auditoría completa:** Tabla `scaffold_history` mantiene todos los cambios
3. **Reversible:** Cualquier desactivación se puede revertir con "Reactivar"
4. **Sin pérdida de datos:** Solo se eliminan clientes sin proyectos
5. **Cascada automática:** Al desactivar cliente, todos sus proyectos se desactivan

## 🎯 Próximos Pasos Recomendados

- [ ] Probar manualmente todos los casos de uso
- [ ] Verificar que supervisor no ve proyectos desactivados
- [ ] Probar reactivación de clientes
- [ ] Generar reportes PDF de proyectos desactivados (debe funcionar)
- [ ] Documentar en manual de usuario
