-- Migración: Agregar estado "in_progress" a assembly_status
-- Fecha: 2026-01-02
-- Descripción: Agrega el estado intermedio "in_progress" (en proceso) para andamios

-- 1. Modificar constraint para incluir 'in_progress'
ALTER TABLE scaffolds 
DROP CONSTRAINT IF EXISTS scaffolds_assembly_status_check;

ALTER TABLE scaffolds 
ADD CONSTRAINT scaffolds_assembly_status_check 
CHECK (assembly_status IN ('disassembled', 'in_progress', 'assembled'));

-- 2. Actualizar andamios existentes según su porcentaje de avance
-- Si está en 0% -> desarmado
-- Si está entre 1-99% -> en proceso
-- Si está en 100% -> armado

UPDATE scaffolds 
SET assembly_status = CASE 
  WHEN progress_percentage = 0 THEN 'disassembled'
  WHEN progress_percentage = 100 THEN 'assembled'
  ELSE 'in_progress'
END
WHERE assembly_status IN ('assembled', 'disassembled');

-- 3. Crear índice para mejorar búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_scaffolds_assembly_status ON scaffolds(assembly_status);

-- Verificación
SELECT 
  assembly_status, 
  COUNT(*) as total,
  AVG(progress_percentage) as avg_progress
FROM scaffolds 
GROUP BY assembly_status
ORDER BY 
  CASE assembly_status
    WHEN 'disassembled' THEN 1
    WHEN 'in_progress' THEN 2
    WHEN 'assembled' THEN 3
  END;
