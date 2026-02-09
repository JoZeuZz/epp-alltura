# Estados de Armado de Andamios

## Lógica de Estados

Los andamios tienen tres estados posibles según su `progress_percentage`:

### 1. Desarmado (0%)
- **assembly_status**: `'disassembled'`
- **progress_percentage**: `0`
- **Descripción**: Andamio completamente desarmado
- **Controles disponibles**: Ninguno (solo ver detalles)

### 2. En Proceso (1-99%)
- **assembly_status**: `'in_progress'`
- **progress_percentage**: `1-99`
- **Descripción**: Andamio en proceso de armado
- **Controles disponibles**: 
  - Ver porcentaje de avance
  - Editar progreso (supervisores)
  - **NO** se puede cambiar tarjeta verde/roja
  - **NO** se puede desarmar (no está completamente armado)

### 3. Armado (100%)
- **assembly_status**: `'assembled'`
- **progress_percentage**: `100`
- **card_status**: `'red'` por defecto
- **Descripción**: Andamio completamente armado
- **Controles disponibles**:
  - ✅ Cambiar tarjeta verde/roja (supervisor)
  - ✅ Desarmar andamio (requiere foto y notas)

## Tarjetas Verde/Roja

### Regla Importante
**Las tarjetas SOLO se pueden asignar cuando el andamio está al 100% de armado.**

### Estados de Tarjeta
- **Roja** (por defecto): Andamio armado pero aún no verificado como seguro
- **Verde**: Supervisor ha verificado que el andamio es seguro para usar

### Flujo de Trabajo
1. Andamio creado con X% → Estado: "En Proceso X%"
2. Supervisor actualiza a 100% → Estado: "Armado 100%" + Tarjeta Roja (por defecto)
3. Supervisor verifica seguridad → Cambia tarjeta a Verde
4. Trabajadores pueden usar el andamio con tarjeta verde

## Botón de Desarmar

### Regla
**Solo se puede desarmar un andamio que esté al 100% de armado.**

### Razón
No tiene sentido "desarmar" algo que aún no está completamente armado. Si está en proceso (1-99%), simplemente se puede editar el porcentaje o eliminarlo.

### Requisitos
- progress_percentage === 100
- assembly_status === 'assembled'
- Foto de desarmado (obligatoria)
- Notas de desarmado (opcional)

## Implementación Backend

### Función determineAssemblyState()
```javascript
static determineAssemblyState(progressPercentage) {
  let assembly_status;
  let card_status = 'red'; // Siempre por defecto rojo

  if (progressPercentage === 100) {
    assembly_status = 'assembled';
  } else if (progressPercentage > 0 && progressPercentage < 100) {
    assembly_status = 'in_progress';
  } else {
    assembly_status = 'disassembled';
  }

  return { assembly_status, card_status };
}
```

### CHECK Constraint
```sql
assembly_status VARCHAR(50) NOT NULL DEFAULT 'assembled' 
CHECK(assembly_status IN ('assembled', 'disassembled', 'in_progress'))
```

## Implementación Frontend

### Mostrar Controles en Cards
```tsx
{scaffold.assembly_status === 'assembled' && 
 scaffold.progress_percentage === 100 && 
 (permissions.canToggleCard || permissions.canDisassemble) && (
  // Mostrar botones de tarjeta y desarmar
)}
```

### Mostrar Estado en Card
```tsx
{scaffold.assembly_status === 'assembled' ? `Armado ${scaffold.progress_percentage}%` : 
 scaffold.assembly_status === 'in_progress' ? `En Proceso ${scaffold.progress_percentage}%` : 
 'Desarmado 0%'}
```

### Modal de Control de Estados
- Botón "Desarmar": Solo visible cuando `assemblyStatus === 'assembled' && progressPercentage === 100`
- Switch de Tarjeta: Solo habilitado cuando `assemblyStatus === 'assembled' && progressPercentage === 100`

## Casos de Uso

### Caso 1: Crear andamio con 25%
- Input: progress_percentage = 25
- Resultado: assembly_status = 'in_progress', card_status = 'red'
- UI: "En Proceso 25%" (sin botones de tarjeta/desarmar)

### Caso 2: Actualizar a 100%
- Input: progress_percentage = 100
- Resultado: assembly_status = 'assembled', card_status = 'red'
- UI: "Armado 100%" con Tarjeta Roja (botones disponibles)

### Caso 3: Supervisor activa tarjeta verde
- Requisito: assembly_status = 'assembled' && progress_percentage = 100
- Acción: Cambiar card_status de 'red' a 'green'
- UI: Switch verde activado

### Caso 4: Desarmar andamio
- Requisito: assembly_status = 'assembled' && progress_percentage = 100
- Acción: Subir foto, agregar notas, cambiar a 'disassembled'
- Resultado: assembly_status = 'disassembled', progress_percentage = 0

## Validación de Usuarios por Proyecto

### Filtrado de Usuarios Cliente en Asignación
Cuando se asignan usuarios a un proyecto, solo se deben mostrar los usuarios cliente que pertenecen a la misma empresa (client_id) del proyecto.

**Implementación (AssignSupervisorsForm.tsx):**
```tsx
// Filtrar usuarios cliente por empresa del proyecto
const filteredClientUsers = clientUsers?.filter(
  user => user.client_id === project?.client_id
) || [];

// Usar filteredClientUsers en el renderizado
{filteredClientUsers.map((client) => (
  <label key={client.id}>
    <input type="checkbox" ... />
    {client.first_name} {client.last_name}
  </label>
))}
```

**Razón:** Evitar que se asignen usuarios de otras empresas a un proyecto, lo cual causaría confusión y errores. Por ejemplo, si el proyecto es de "Bunker Ingeniería", solo deben aparecer usuarios de Bunker, no de "CMPC S.A.".

**Archivos:** `/frontend/src/components/AssignSupervisorsForm.tsx`

