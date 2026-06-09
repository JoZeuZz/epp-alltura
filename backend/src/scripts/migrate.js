'use strict';

/**
 * Migration runner for EPP/Alltura.
 *
 * Migration files live in db/migrations/ with the naming convention:
 *   YYYYMMDD-description.sql
 *
 * Each file must contain:
 *   -- UP
 *   <SQL to apply>
 *
 *   -- DOWN
 *   <SQL to revert>
 *
 * Commands:
 *   node migrate.js up          Apply all pending migrations (default)
 *   node migrate.js down [N]    Revert last N migrations (default 1)
 *   node migrate.js status      Show applied / pending state
 *
 * npm scripts (package.json):
 *   npm run migrate              → up
 *   npm run migrate:status       → status
 *   npm run migrate:down         → down 1
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { getPoolConfig } = require('../db/poolConfig');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR
  || path.resolve(__dirname, '../../../db/migrations');

// Unique advisory lock key for this app — prevents concurrent migration runs.
// Change if you ever run two separate EPP apps against the same DB.
const ADVISORY_LOCK_KEY = 8_675_309; // arbitrary stable integer

const MIGRATIONS_TABLE = 'schema_migrations';

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
    filename    TEXT        PRIMARY KEY,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns sorted list of .sql migration filenames. */
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // YYYYMMDD prefix → chronological order
}

/**
 * Parses a migration file and extracts the UP or DOWN SQL block.
 *
 * Convention: file contains `-- UP` and `-- DOWN` section markers.
 * Everything between them (or after the last marker) is the SQL for that direction.
 *
 * Returns null if the section is empty (e.g. intentionally irreversible migration).
 */
function parseSQL(content, direction) {
  // Normalise line endings
  const text = content.replace(/\r\n/g, '\n');
  const upper = text.toUpperCase();

  const upIdx  = upper.search(/^-- UP\s*$/m);
  const downIdx = upper.search(/^-- DOWN\s*$/m);

  let block;

  if (direction === 'up') {
    if (upIdx === -1) {
      // No markers — treat entire file as UP (legacy / simple files)
      block = text;
    } else {
      const start = upIdx + text.slice(upIdx).indexOf('\n') + 1;
      const end   = downIdx !== -1 ? downIdx : text.length;
      block = text.slice(start, end);
    }
  } else {
    if (downIdx === -1) return null;
    const start = downIdx + text.slice(downIdx).indexOf('\n') + 1;
    block = text.slice(start);
  }

  const trimmed = block
    .split('\n')
    .filter((line) => line.trim() !== '' && !line.trim().startsWith('--'))
    .join('\n')
    .trim();

  return trimmed || null;
}

/** Acquire a session-level advisory lock. Returns false if already locked. */
async function acquireLock(client) {
  const { rows } = await client.query(
    'SELECT pg_try_advisory_lock($1) AS acquired',
    [ADVISORY_LOCK_KEY]
  );
  return rows[0].acquired === true;
}

async function releaseLock(client) {
  await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
}

async function ensureTable(client) {
  await client.query(CREATE_TABLE_SQL);
}

async function getApplied(client) {
  const { rows } = await client.query(
    `SELECT filename FROM ${MIGRATIONS_TABLE} ORDER BY filename ASC`
  );
  return new Set(rows.map((r) => r.filename));
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function runUp(pool) {
  const files  = getMigrationFiles();
  const client = await pool.connect();

  try {
    await ensureTable(client);

    const locked = await acquireLock(client);
    if (!locked) {
      console.error('❌  Another migration process is already running. Aborting.');
      process.exit(1);
    }

    const applied  = await getApplied(client);
    const pending  = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log('✅  All migrations already applied — nothing to do.');
      return;
    }

    console.log(`\n▶  Applying ${pending.length} pending migration(s):\n`);

    let count = 0;
    for (const filename of pending) {
      const filepath = path.join(MIGRATIONS_DIR, filename);
      const content  = fs.readFileSync(filepath, 'utf8');
      const sql      = parseSQL(content, 'up');

      if (!sql) {
        console.warn(`  ⚠  ${filename}: no UP SQL found, skipping.`);
        continue;
      }

      process.stdout.write(`  → ${filename} … `);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1)`,
          [filename]
        );
        await client.query('COMMIT');
        console.log('✅');
        count++;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.log('❌');
        throw new Error(`Migration "${filename}" failed:\n  ${err.message}`);
      }
    }

    console.log(`\n✅  Applied ${count} migration(s) successfully.\n`);
  } finally {
    await releaseLock(client).catch(() => {});
    client.release();
  }
}

async function runDown(pool, steps) {
  if (process.env.NODE_ENV === 'production') {
    const confirmed = process.env.ALLOW_MIGRATE_DOWN_IN_PRODUCTION === 'true';
    if (!confirmed) {
      console.error(
        '❌  Refusing to run DOWN migration in production.\n' +
        '   Set ALLOW_MIGRATE_DOWN_IN_PRODUCTION=true to override.'
      );
      process.exit(1);
    }
    console.warn('⚠  ALLOW_MIGRATE_DOWN_IN_PRODUCTION is set — proceeding with rollback.\n');
  }

  const client = await pool.connect();

  try {
    await ensureTable(client);

    const locked = await acquireLock(client);
    if (!locked) {
      console.error('❌  Another migration process is already running. Aborting.');
      process.exit(1);
    }

    const { rows } = await client.query(
      `SELECT filename FROM ${MIGRATIONS_TABLE} ORDER BY filename DESC LIMIT $1`,
      [steps]
    );

    if (rows.length === 0) {
      console.log('No applied migrations to revert.');
      return;
    }

    console.log(`\n◀  Reverting ${rows.length} migration(s):\n`);

    for (const { filename } of rows) {
      const filepath = path.join(MIGRATIONS_DIR, filename);

      if (!fs.existsSync(filepath)) {
        throw new Error(
          `Migration file not found: ${filepath}\n` +
          '  Cannot roll back a migration whose file is missing.'
        );
      }

      const content = fs.readFileSync(filepath, 'utf8');
      const sql     = parseSQL(content, 'down');

      if (!sql) {
        throw new Error(
          `Migration "${filename}" has no DOWN SQL.\n` +
          '  This migration is intentionally irreversible. Rollback aborted.'
        );
      }

      process.stdout.write(`  ← ${filename} … `);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          `DELETE FROM ${MIGRATIONS_TABLE} WHERE filename = $1`,
          [filename]
        );
        await client.query('COMMIT');
        console.log('✅');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.log('❌');
        throw new Error(`Rollback of "${filename}" failed:\n  ${err.message}`);
      }
    }

    console.log('\n✅  Rollback complete.\n');
  } finally {
    await releaseLock(client).catch(() => {});
    client.release();
  }
}

async function runStatus(pool) {
  const files  = getMigrationFiles();
  const client = await pool.connect();

  try {
    await ensureTable(client);
    const applied = await getApplied(client);

    const SEP = '─'.repeat(64);
    console.log(`\n${SEP}`);
    console.log('  Migration status');
    console.log(SEP);

    if (files.length === 0) {
      console.log('  (no migration files found in db/migrations/)');
    }

    for (const f of files) {
      const tag = applied.has(f) ? '✅ applied ' : '⏳ pending ';
      console.log(`  ${tag}  ${f}`);
    }

    // Orphaned entries: applied in DB but file no longer exists
    const orphans = [...applied].filter((f) => !files.includes(f));
    if (orphans.length > 0) {
      console.log('');
      for (const f of orphans) {
        console.log(`  ⚠ orphan   ${f}  ← file missing on disk`);
      }
    }

    const pendingCount = files.filter((f) => !applied.has(f)).length;
    console.log(SEP);
    console.log(`  ${applied.size} applied  ·  ${pendingCount} pending  ·  ${orphans.length} orphan(s)`);
    console.log(`${SEP}\n`);
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  const [,, command = 'up', arg] = process.argv;
  const pool = new Pool(getPoolConfig());

  try {
    switch (command) {
      case 'up':
        await runUp(pool);
        break;

      case 'down': {
        const steps = Math.max(1, parseInt(arg || '1', 10));
        if (Number.isNaN(steps)) {
          console.error('Usage: migrate.js down [N]  — N must be a positive integer');
          process.exit(1);
        }
        await runDown(pool, steps);
        break;
      }

      case 'status':
        await runStatus(pool);
        break;

      default:
        console.error(`Unknown command: "${command}"\nUsage: migrate.js [up|down [N]|status]`);
        process.exit(1);
    }
  } catch (err) {
    console.error(`\n❌  ${err.message}\n`);
    process.exit(1);
  } finally {
    await pool.end().catch(() => {});
  }
}

if (require.main === module) {
  main();
}

module.exports = { runUp, runDown, runStatus };
