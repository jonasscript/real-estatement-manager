const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node scripts/runMigration.js <migration-file.sql>');
  process.exit(1);
}

const migrationPath = path.resolve(__dirname, '../src/models', migrationFile);

if (!fs.existsSync(migrationPath)) {
  console.error(`Migration file not found: ${migrationPath}`);
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

async function main() {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`Migration applied: ${migrationFile}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Migration failed: ${migrationFile}`);
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
