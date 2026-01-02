-- Migración: Agregar campo 'active' a clients y projects
-- Fecha: 2026-01-02
-- Descripción: Implementa soft delete para clientes y proyectos

-- Agregar columna 'active' a la tabla clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- Agregar columna 'active' a la tabla projects
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- Crear índices para mejorar performance en queries filtradas por active
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(active);
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(active);

-- Comentarios para documentación
COMMENT ON COLUMN clients.active IS 'Indica si el cliente está activo. FALSE = desactivado (soft delete)';
COMMENT ON COLUMN projects.active IS 'Indica si el proyecto está activo. FALSE = desactivado en cascada cuando el cliente se desactiva';
