
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const checkUser = async () => {
  console.log('Connecting to database to check for admin user...');
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, name, email, role, password_hash FROM users WHERE email = $1', ['admin@alltura.cl']);
    if (res.rows.length > 0) {
      console.log('SUCCESS: User admin@alltura.cl found in database:');
      console.log(res.rows[0]);
    } else {
      console.log('ERROR: User admin@alltura.cl NOT found in database.');
    }
  } catch (err) {
    console.error('ERROR connecting or querying database:', err);
  } finally {
    client.release();
    pool.end();
    console.log('Database connection closed.');
  }
};

checkUser();
