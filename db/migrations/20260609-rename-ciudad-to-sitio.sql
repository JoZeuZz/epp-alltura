-- UP
ALTER TABLE proyectos RENAME COLUMN ciudad TO sitio;

-- DOWN
ALTER TABLE proyectos RENAME COLUMN sitio TO ciudad;
