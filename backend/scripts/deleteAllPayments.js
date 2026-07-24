const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const confirmDelete = process.env.CONFIRM_DELETE_PAYMENTS === 'true';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function main() {
  if (!confirmDelete) {
    console.error('Operacion cancelada.');
    console.error('Para borrar unicamente los registros de payments ejecuta:');
    console.error('CONFIRM_DELETE_PAYMENTS=true npm run payments:delete-all');
    process.exitCode = 1;
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const before = await client.query(`
      SELECT payment_type, status, COUNT(*)::int AS count
      FROM payments
      GROUP BY payment_type, status
      ORDER BY payment_type, status
    `);

    const deleted = await client.query('DELETE FROM payments');

    await client.query('COMMIT');

    console.log('Pagos eliminados unicamente de la tabla payments:', deleted.rowCount);
    console.log('Resumen previo:', before.rows);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('No se pudieron eliminar los pagos:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
