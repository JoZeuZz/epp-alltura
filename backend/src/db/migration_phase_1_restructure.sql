-- =====================================================
-- MIGRACIÓN: Reestructuración del Modelo de Datos
-- Cambio de paradigma: Reportes → Andamios Persistentes
-- FASE 1: Actualización de modelos y tipos de usuario
-- =====================================================
-- IMPORTANTE: NO EJECUTAR AUTOMÁTICAMENTE
-- Este script debe ser revisado y ejecutado manualmente
-- =====================================================

-- 1. ACTUALIZAR ROLES DE USUARIOS
-- Cambiar 'technician' a 'supervisor' y agregar 'client'
-- =====================================================

-- Primero, actualizar el constraint de roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN ('admin', 'supervisor', 'client'));

-- Actualizar usuarios existentes con rol 'technician' a 'supervisor'
UPDATE users SET role = 'supervisor' WHERE role = 'technician';

-- Agregar índice para mejorar búsquedas por rol
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. ACTUALIZAR TABLA SCAFFOLDS
-- Agregar nuevos campos para el modelo de andamio persistente
-- NOTA: Se eliminan company_id, supervisor_id, end_user_id
-- Ahora todo se maneja a través de users con roles
-- =====================================================

-- Eliminar campos obsoletos si existen (company, supervisor, end_user)
ALTER TABLE scaffolds DROP COLUMN IF EXISTS company_id CASCADE;
ALTER TABLE scaffolds DROP COLUMN IF EXISTS supervisor_id CASCADE;
ALTER TABLE scaffolds DROP COLUMN IF EXISTS end_user_id CASCADE;

-- Agregar campo created_by (referencia al supervisor que lo creó)
ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Agregar campos location y observations
ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS observations TEXT;

-- Agregar campo length (largo) que faltaba
ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS length DECIMAL(10,2);

-- Migrar depth a length si es necesario
UPDATE scaffolds SET length = depth WHERE length IS NULL AND depth IS NOT NULL;

-- Agregar campo card_status (estado de tarjeta: green/red)
ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS card_status VARCHAR(10) DEFAULT 'red' CHECK(card_status IN ('green', 'red'));

-- Agregar campo assembly_status (estado de armado: assembled/disassembled)
ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS assembly_status VARCHAR(20) DEFAULT 'disassembled' CHECK(assembly_status IN ('assembled', 'disassembled'));

-- Agregar campo initial_image (imagen inicial obligatoria)
ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS initial_image VARCHAR(255);

-- Renombrar campo disassembly_image_url a disassembly_image si existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='scaffolds' AND column_name='disassembly_image_url'
    ) THEN
        ALTER TABLE scaffolds RENAME COLUMN disassembly_image_url TO disassembly_image;
    END IF;
END $$;

-- Agregar disassembly_image si no existe
ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS disassembly_image VARCHAR(255);

-- Agregar campos de timestamp
ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE scaffolds ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Migrar datos existentes
-- Copiar assembly_image_url a initial_image para registros existentes
UPDATE scaffolds SET initial_image = assembly_image_url WHERE initial_image IS NULL AND assembly_image_url IS NOT NULL;

-- Copiar status a assembly_status para registros existentes
UPDATE scaffolds SET assembly_status = status WHERE assembly_status = 'disassembled' AND status IS NOT NULL;

-- Establecer created_by como user_id para registros existentes
UPDATE scaffolds SET created_by = user_id WHERE created_by IS NULL;

-- Establecer created_at con assembly_created_at para registros existentes
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='scaffolds' AND column_name='assembly_created_at'
    ) THEN
        UPDATE scaffolds SET created_at = assembly_created_at WHERE created_at IS NULL OR created_at = NOW();
    END IF;
END $$;

-- Agregar índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_scaffolds_created_by ON scaffolds(created_by);
CREATE INDEX IF NOT EXISTS idx_scaffolds_card_status ON scaffolds(card_status);
CREATE INDEX IF NOT EXISTS idx_scaffolds_assembly_status ON scaffolds(assembly_status);
CREATE INDEX IF NOT EXISTS idx_scaffolds_project_id ON scaffolds(project_id);

-- 3. CREAR TABLA SCAFFOLD_HISTORY
-- Registrar todas las modificaciones de andamios
-- =====================================================

CREATE TABLE IF NOT EXISTS scaffold_history (
    id SERIAL PRIMARY KEY,
    scaffold_id INTEGER NOT NULL REFERENCES scaffolds(id) ON DELETE CASCADE,
    modified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    change_type VARCHAR(100) NOT NULL,
    previous_data JSONB,
    new_data JSONB,
    description TEXT,
    CONSTRAINT fk_scaffold FOREIGN KEY (scaffold_id) REFERENCES scaffolds(id) ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY (modified_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Índices para scaffold_history
CREATE INDEX IF NOT EXISTS idx_scaffold_history_scaffold_id ON scaffold_history(scaffold_id);
CREATE INDEX IF NOT EXISTS idx_scaffold_history_modified_by ON scaffold_history(modified_by);
CREATE INDEX IF NOT EXISTS idx_scaffold_history_modified_at ON scaffold_history(modified_at);
CREATE INDEX IF NOT EXISTS idx_scaffold_history_change_type ON scaffold_history(change_type);

-- 4. ACTUALIZAR TABLA PROJECTS
-- Agregar asignación de cliente y supervisor
-- =====================================================

-- Agregar campo assigned_client_id (usuario tipo client asignado)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_client_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Agregar campo assigned_supervisor_id (usuario tipo supervisor asignado)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_supervisor_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Agregar constraints para verificar roles
-- Nota: Estos constraints se verificarán a nivel de aplicación, no de BD para flexibilidad

-- Índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_projects_assigned_client_id ON projects(assigned_client_id);
CREATE INDEX IF NOT EXISTS idx_projects_assigned_supervisor_id ON projects(assigned_supervisor_id);

-- 5. TRIGGER PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para scaffolds
DROP TRIGGER IF EXISTS update_scaffolds_updated_at ON scaffolds;
CREATE TRIGGER update_scaffolds_updated_at
    BEFORE UPDATE ON scaffolds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. VISTAS ÚTILES (OPCIONAL)
-- =====================================================

-- Vista para obtener andamios con toda la información relacionada
CREATE OR REPLACE VIEW v_scaffolds_full AS
SELECT 
    s.*,
    u.first_name || ' ' || u.last_name as user_name,
    creator.first_name || ' ' || creator.last_name as created_by_name,
    p.name as project_name,
    p.assigned_client_id,
    p.assigned_supervisor_id
FROM scaffolds s
JOIN users u ON s.user_id = u.id
LEFT JOIN users creator ON s.created_by = creator.id
LEFT JOIN projects p ON s.project_id = p.id;

-- Vista para estadísticas de metros cúbicos
CREATE OR REPLACE VIEW v_cubic_meters_stats AS
SELECT 
    SUM(CASE WHEN assembly_status = 'assembled' THEN cubic_meters ELSE 0 END) as assembled_cubic_meters,
    SUM(CASE WHEN assembly_status = 'disassembled' THEN cubic_meters ELSE 0 END) as disassembled_cubic_meters,
    SUM(cubic_meters) as total_cubic_meters,
    COUNT(*) FILTER (WHERE assembly_status = 'assembled') as assembled_count,
    COUNT(*) FILTER (WHERE assembly_status = 'disassembled') as disassembled_count,
    COUNT(*) as total_count
FROM scaffolds;

-- Vista para proyectos con información completa
CREATE OR REPLACE VIEW v_projects_full AS
SELECT 
    p.*,
    c.name as client_name,
    ac.first_name || ' ' || ac.last_name as assigned_client_name,
    ac.email as assigned_client_email,
    au.first_name || ' ' || au.last_name as assigned_supervisor_name,
    au.email as assigned_supervisor_email
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN users ac ON p.assigned_client_id = ac.id
LEFT JOIN users au ON p.assigned_supervisor_id = au.id;

-- =====================================================
-- VERIFICACIONES POST-MIGRACIÓN
-- =====================================================

-- Verificar que todos los roles sean válidos
SELECT role, COUNT(*) FROM users GROUP BY role;

-- Verificar que todos los scaffolds tengan initial_image
SELECT COUNT(*) FROM scaffolds WHERE initial_image IS NULL;

-- Verificar que todos los scaffolds tengan created_by
SELECT COUNT(*) FROM scaffolds WHERE created_by IS NULL;

-- Verificar estructura de scaffold_history
SELECT COUNT(*) FROM scaffold_history;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

-- 1. Hacer backup completo antes de ejecutar esta migración
-- 2. Ejecutar en un ambiente de desarrollo primero
-- 3. Verificar que no haya datos huérfanos o inconsistentes
-- 4. Los campos antiguos (status, assembly_image_url) se mantienen por compatibilidad
-- 5. La migración de datos existentes asume que assembly_created_at es válido
-- 6. Los triggers automáticos ayudarán a mantener updated_at sincronizado
-- 7. Las vistas facilitan las consultas pero son opcionales

-- =====================================================
-- FIN DE LA MIGRACIÓN FASE 1
-- =====================================================
