const { query } = require('../src/config/database');
const { computeNextExecutionAt } = require('../src/utils/cronSchedule');
const { executeCronJob } = require('./executeCronJob');

async function markRunning(id) {
  await query(
    `UPDATE cron_configurations SET status = 'RUNNING', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [id]
  );
}

async function markFinished(id, { success, message, nextExecutionAt }) {
  await query(
    `UPDATE cron_configurations
     SET status = 'WAITING',
         last_execution_at = NOW(),
         next_execution_at = $1,
         last_result = $2,
         last_error = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [nextExecutionAt, success ? message : null, success ? null : message, id]
  );
}

async function runJob(job) {
  await markRunning(job.id);

  const nextExecutionAt = computeNextExecutionAt({
    frequency: job.frequency,
    dayOfWeek: job.day_of_week,
    dayOfMonth: job.day_of_month,
    timeOfDay: job.time_of_day,
    from: job.next_execution_at,
  });

  try {
    const outcome = await executeCronJob(job);
    await markFinished(job.id, { success: true, message: outcome.message, nextExecutionAt });
    console.log(`[cron-schedule] Job "${job.name}" (id ${job.id}) completado. Próxima ejecución: ${nextExecutionAt.toISOString()}`);
  } catch (error) {
    await markFinished(job.id, { success: false, message: error.message, nextExecutionAt });
    console.error(`[cron-schedule] Job "${job.name}" (id ${job.id}) falló:`, error.message);
  }
}

// Finds cron_configurations rows that are due to run right now, executes
// each one, and updates status/last_execution_at/next_execution_at/last_result/last_error.
async function checkDueCronJobs() {
  const result = await query(
    `SELECT *
     FROM cron_configurations
     WHERE is_active = true
       AND next_execution_at <= NOW()
       AND status = 'WAITING'`
  );

  if (result.rows.length === 0) {
    console.log('[cron-schedule] No hay jobs pendientes de ejecución.');
    return result.rows;
  }

  console.log(`[cron-schedule] ${result.rows.length} job(s) pendiente(s) de ejecución.`);

  for (const job of result.rows) {
    await runJob(job);
  }

  return result.rows;
}

module.exports = { checkDueCronJobs };
