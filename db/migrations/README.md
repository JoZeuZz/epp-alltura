# Migraciones de esquema

## Convención de nombres

```
YYYY-MM-DD-NNN-descripcion-kebab.sql
```

Ejemplos:
- `2026-06-10-001-add-column-foo.sql`
- `2026-06-15-002-create-table-bar.sql`

Los archivos se aplican en orden lexicográfico. El nombre debe ser único y descriptivo.

## Cómo crear una migración

1. Crea el archivo SQL en esta carpeta.
2. Escribe SQL idempotente cuando sea posible (usa `IF NOT EXISTS`, `IF EXISTS`, `DO $$ ... $$`).
3. **No uses DROP TABLE, TRUNCATE ni borrado masivo.** Preferir `ALTER TABLE`, `ADD COLUMN`, `ADD CONSTRAINT`.
4. Prueba localmente antes de aplicar en producción.

## Cómo aplicar migraciones

```bash
# Desde la raíz del proyecto:
node scripts/run-migrations.js
```

El runner:
- Lee `db/migrations/*.sql` en orden lexicográfico.
- Filtra las ya aplicadas consultando `schema_migrations`.
- Aplica cada migración nueva dentro de una transacción.
- Registra el resultado en `schema_migrations`.

## Tabla de control

`schema_migrations` se crea automáticamente al arrancar el backend (vía `initialize.js`):

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id          SERIAL PRIMARY KEY,
  filename    TEXT NOT NULL UNIQUE,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Reglas críticas

- Una migración aplicada **nunca se edita**. Si cometiste un error, crea una migración nueva que lo corrija.
- Las migraciones son **irreversibles por diseño** (no hay rollback automático).
- Si una migración falla, la transacción se revierte y el error se loguea. El runner termina con código 1.
- Nunca borra ni trunca datos de producción sin aprobación explícita.
