-- ============================================
-- Migración 003: Sistema de Notas de Clientes
-- ============================================
-- Fecha: 2026-01-14
-- Descripción: Sistema completo de notas de clientes en andamios/proyectos
--              con notificaciones in-app persistentes
-- ============================================

-- Tabla de notas de clientes (polimórfica)
CREATE TABLE IF NOT EXISTS client_notes (
    id SERIAL PRIMARY KEY,
    
    -- Usuario que crea la nota (debe ser role='client')
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Referencia polimórfica: scaffold O project (no ambos)
    target_type VARCHAR(20) NOT NULL CHECK(target_type IN ('scaffold', 'project')),
    scaffold_id INTEGER REFERENCES scaffolds(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Contenido de la nota
    note_text TEXT NOT NULL CHECK(length(note_text) >= 1 AND length(note_text) <= 5000),
    
    -- Estado de resolución
    is_resolved BOOLEAN DEFAULT false NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraint: Exactamente uno de scaffold_id o project_id debe estar presente
    CONSTRAINT valid_target CHECK (
        (target_type = 'scaffold' AND scaffold_id IS NOT NULL AND project_id IS NULL) OR
        (target_type = 'project' AND project_id IS NOT NULL AND scaffold_id IS NULL)
    )
);

-- Comentarios para documentación
COMMENT ON TABLE client_notes IS 'Notas/comentarios de clientes en andamios o proyectos';
COMMENT ON COLUMN client_notes.target_type IS 'Tipo de entidad: scaffold o project';
COMMENT ON COLUMN client_notes.note_text IS 'Contenido de la nota (máximo 5000 caracteres)';
COMMENT ON COLUMN client_notes.is_resolved IS 'Indica si la nota fue resuelta por supervisor/admin';
COMMENT ON COLUMN client_notes.resolved_by IS 'Usuario (supervisor/admin) que resolvió la nota';

-- Índices para optimizar queries
CREATE INDEX idx_client_notes_user ON client_notes(user_id, created_at DESC);
CREATE INDEX idx_client_notes_scaffold ON client_notes(scaffold_id, is_resolved) WHERE scaffold_id IS NOT NULL;
CREATE INDEX idx_client_notes_project ON client_notes(project_id, is_resolved) WHERE project_id IS NOT NULL;
CREATE INDEX idx_client_notes_unresolved ON client_notes(is_resolved, created_at DESC) WHERE is_resolved = false;
CREATE INDEX idx_client_notes_target_type ON client_notes(target_type, created_at DESC);

-- ============================================
-- Tabla de notificaciones in-app
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    
    -- Usuario destinatario
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Tipo de notificación
    type VARCHAR(50) NOT NULL CHECK(type IN (
        'new_client_note',
        'note_resolved',
        'scaffold_updated',
        'project_assigned',
        'note_urgent'
    )),
    
    -- Contenido
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Referencias relacionadas (opcionales, pueden ser NULL si el recurso fue eliminado)
    related_note_id INTEGER REFERENCES client_notes(id) ON DELETE CASCADE,
    related_scaffold_id INTEGER REFERENCES scaffolds(id) ON DELETE SET NULL,
    related_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Estado de lectura
    is_read BOOLEAN DEFAULT false NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Comentarios
COMMENT ON TABLE notifications IS 'Notificaciones in-app persistentes para usuarios';
COMMENT ON COLUMN notifications.type IS 'Tipo de notificación para iconos y estilos';
COMMENT ON COLUMN notifications.related_note_id IS 'ID de nota relacionada (puede ser NULL si fue eliminada)';

-- Índices para performance
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_user_all ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read_status ON notifications(is_read) WHERE is_read = false;

-- ============================================
-- Función para actualizar updated_at automáticamente
-- ============================================

CREATE OR REPLACE FUNCTION update_client_notes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en client_notes
CREATE TRIGGER client_notes_updated_at
    BEFORE UPDATE ON client_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_client_notes_timestamp();

-- ============================================
-- Datos de prueba (opcional, comentado)
-- ============================================

/*
-- Nota de ejemplo en un andamio (descomentar si necesitas datos de prueba)
INSERT INTO client_notes (user_id, target_type, scaffold_id, note_text)
VALUES (
    (SELECT id FROM users WHERE role = 'client' LIMIT 1),
    'scaffold',
    (SELECT id FROM scaffolds LIMIT 1),
    'Por favor revisar la altura de este andamio, parece estar fuera de especificación.'
);

-- Notificación de ejemplo
INSERT INTO notifications (user_id, type, title, message, related_note_id)
VALUES (
    (SELECT id FROM users WHERE role = 'supervisor' LIMIT 1),
    'new_client_note',
    'Nueva nota de cliente',
    'El cliente ha dejado un comentario en el andamio AND-001',
    (SELECT id FROM client_notes ORDER BY created_at DESC LIMIT 1)
);
*/

-- ============================================
-- Verificación de la migración
-- ============================================

-- Verificar que las tablas se crearon correctamente
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_notes') THEN
        RAISE NOTICE '✅ Tabla client_notes creada exitosamente';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        RAISE NOTICE '✅ Tabla notifications creada exitosamente';
    END IF;
    
    RAISE NOTICE '✅ Migración 003_client_notes_system completada';
END $$;
