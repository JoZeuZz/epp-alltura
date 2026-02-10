const { initializeDatabase, pool } = require('./initialize');

const run = async () => {
  try {
    await initializeDatabase();
    console.log('Schema initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize schema:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();
