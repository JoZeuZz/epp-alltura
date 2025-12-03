# Migración: Agregar Campos de Solicitante, Usuario y Supervisor

## Descripción
Esta migración agrega tres nuevos campos a la tabla `scaffolds`:
- `requestor` (VARCHAR 255): Solicitante del andamio
- `end_user` (VARCHAR 255): Usuario que utilizará el andamio  
- `supervisor` (VARCHAR 255): Supervisor asignado

## Archivos Modificados

### Backend
- ✅ `backend/src/db/setup.js` - Actualizado schema de base de datos
- ✅ `backend/src/routes/scaffolds.js` - Agregada validación y manejo de nuevos campos
- ✅ `backend/src/lib/pdfGenerator.js` - Actualizado para incluir nuevos campos en reportes PDF
- ✅ `backend/src/lib/excelGenerator.js` - Actualizado para incluir nuevos campos en reportes Excel

### Frontend
- ✅ `frontend/src/types/api.d.ts` - Agregados nuevos campos a interface Scaffold
- ✅ `frontend/src/pages/technician/NewScaffoldPage.tsx` - Agregados campos al formulario
- ✅ `frontend/src/pages/technician/ProjectScaffoldsPage.tsx` - Actualizada vista para mostrar nuevos campos
- ✅ `frontend/src/pages/technician/HistoryPage.tsx` - Actualizada vista de historial
- ✅ `frontend/src/pages/admin/ScaffoldsPage.tsx` - Actualizado modal de detalles

### Base de Datos
- ✅ `backend/src/db/migrate_add_scaffold_fields.js` - Script de migración creado

## Pasos para Aplicar la Migración

### Opción 1: Para bases de datos existentes (Producción/Desarrollo)
```bash
# Ejecutar el script de migración
cd /root/apps/reportabilidad
node backend/src/db/migrate_add_scaffold_fields.js
```

### Opción 2: Para instalaciones nuevas
```bash
# El script setup.js ya incluye las nuevas columnas
npm run setup:db
```

### Opción 3: Usando docker-compose (reiniciar desde cero)
```bash
# ADVERTENCIA: Esto eliminará todos los datos existentes
docker-compose down -v
docker-compose up -d
npm run setup:db
```

## Instalación y Ejecución

```bash
# 1. Instalar dependencias (si es necesario)
npm run install:all

# 2. Ejecutar migración (para BD existentes)
node backend/src/db/migrate_add_scaffold_fields.js

# 3. Reiniciar backend
npm run start:backend

# 4. En otra terminal, iniciar frontend
npm run start:frontend
```

## Verificación

Después de aplicar la migración:

1. **Verificar columnas en la base de datos:**
   ```sql
   \d scaffolds
   ```

2. **Crear un nuevo reporte de andamio:**
   - Ir a `/tech/project/:projectId/new-scaffold`
   - Llenar los nuevos campos: Solicitante, Usuario, Supervisor
   - Enviar el formulario

3. **Verificar que los datos se guardan correctamente:**
   - Ver el andamio en la lista de andamios del proyecto
   - Ver en el historial del técnico
   - Ver en el visualizador de andamios (admin)
   - Exportar a PDF y Excel para verificar que incluyen los nuevos campos

## Compatibilidad

- ✅ Los nuevos campos son **opcionales** (permiten NULL)
- ✅ Los andamios existentes seguirán funcionando sin problemas
- ✅ No se requiere modificación de datos existentes
- ✅ Compatible con versiones anteriores del frontend

## Rollback (en caso de problemas)

Si necesitas revertir los cambios:

```sql
ALTER TABLE scaffolds 
DROP COLUMN IF EXISTS requestor,
DROP COLUMN IF EXISTS end_user,
DROP COLUMN IF EXISTS supervisor;
```

## Notas Adicionales

- Los campos están diseñados para almacenar texto libre (VARCHAR 255)
- En el futuro se podría normalizar estos campos creando tablas separadas para solicitantes, usuarios y supervisores
- Los reportes PDF y Excel ahora incluyen automáticamente estos campos cuando están presentes
