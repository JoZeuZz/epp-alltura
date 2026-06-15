'use strict';

// Test contra Postgres real. Activar con RUN_INTEGRATION_DB_TESTS=true.
// Requisitos del esquema: BD con `db/init/001-init.sql` + la migracion
// `2026-06-15-001-renumber-codigos-y-reuso.sql` aplicada (deja `articulo_codigo_key`
// DEFERRABLE, necesario para el caso de renumber). Solo apto para ejecucion aislada
// via el script `test:integration-db` (afterAll cierra el pool compartido del modulo db).
const RUN = process.env.RUN_INTEGRATION_DB_TESTS === 'true';
const d = RUN ? describe : describe.skip;

const db = require('../../db');
const { generateCodigo } = require('../../services/articulos.service');

// Inserta un articulo de fixture con codigo explicito.
async function seed(client, tipo, codigo, nroSerie, creadoEn) {
  await client.query(
    `INSERT INTO articulo (tipo, nombre, nro_serie, codigo, creado_en)
     VALUES ($1, $2, $3, $4, $5)`,
    [tipo, `fix-${codigo}`, nroSerie, codigo, creadoEn]
  );
}

d('codigo reuso de huecos (DB real)', () => {
  let client;
  beforeEach(async () => {
    client = await db.pool.connect();
    await client.query('BEGIN');
  });
  afterEach(async () => {
    await client.query('ROLLBACK');
    client.release();
  });
  afterAll(async () => {
    await db.pool.end();
  });

  it('sin huecos toma MAX+1 por familia', async () => {
    await seed(client, 'epp', 'EPP-00001', 'NS-E1', '2026-01-01');
    await seed(client, 'epp', 'EPP-00002', 'NS-E2', '2026-01-02');
    const codigo = await generateCodigo(client, 'epp');
    expect(codigo).toBe('EPP-00003');
  });

  it('rellena el hueco mas bajo tras eliminar un intermedio', async () => {
    await seed(client, 'epp', 'EPP-00001', 'NS-E1', '2026-01-01');
    await seed(client, 'epp', 'EPP-00002', 'NS-E2', '2026-01-02');
    await seed(client, 'epp', 'EPP-00003', 'NS-E3', '2026-01-03');
    await client.query(`DELETE FROM articulo WHERE codigo = 'EPP-00002'`);
    const codigo = await generateCodigo(client, 'epp');
    expect(codigo).toBe('EPP-00002');
  });

  it('las familias son independientes', async () => {
    await seed(client, 'epp', 'EPP-00001', 'NS-E1', '2026-01-01');
    await seed(client, 'herramienta', 'HRR-00001', 'NS-H1', '2026-01-01');
    // Borrar EPP no afecta numeracion de HRR.
    await client.query(`DELETE FROM articulo WHERE codigo = 'EPP-00001'`);
    expect(await generateCodigo(client, 'herramienta')).toBe('HRR-00002');
    expect(await generateCodigo(client, 'epp')).toBe('EPP-00001');
  });

  it('asigna huecos contiguos en inserciones sucesivas dentro de la txn (bulk)', async () => {
    const c1 = await generateCodigo(client, 'equipo');
    await seed(client, 'equipo', c1, 'NS-Q1', '2026-01-01');
    const c2 = await generateCodigo(client, 'equipo');
    await seed(client, 'equipo', c2, 'NS-Q2', '2026-01-02');
    expect([c1, c2]).toEqual(['EQP-00001', 'EQP-00002']);
  });

  it('renumera 1..N por creado_en respetando el orden (logica de migracion)', async () => {
    await seed(client, 'epp', 'EPP-00050', 'NS-A', '2026-03-01');
    await seed(client, 'epp', 'EPP-00010', 'NS-B', '2026-01-01');
    await seed(client, 'epp', 'EPP-00030', 'NS-C', '2026-02-01');
    // Difiere la unicidad al fin de la txn para permitir codigos transitoriamente
    // duplicados durante el renombrado. Requiere la migracion 2026-06-15-001
    // (constraint DEFERRABLE); si no esta aplicada el UPDATE falla por colision.
    await client.query('SET CONSTRAINTS ALL DEFERRED');
    await client.query(`
      UPDATE articulo a SET codigo = m.nuevo
        FROM (
          SELECT id, 'EPP-' || LPAD(ROW_NUMBER() OVER (
            PARTITION BY tipo ORDER BY creado_en, id
          )::text, 5, '0') AS nuevo
            FROM articulo WHERE tipo = 'epp'
        ) m
       WHERE a.id = m.id`);
    const { rows } = await client.query(
      `SELECT nro_serie, codigo FROM articulo WHERE tipo = 'epp' ORDER BY codigo`
    );
    expect(rows).toEqual([
      { nro_serie: 'NS-B', codigo: 'EPP-00001' },
      { nro_serie: 'NS-C', codigo: 'EPP-00002' },
      { nro_serie: 'NS-A', codigo: 'EPP-00003' },
    ]);
  });
});
