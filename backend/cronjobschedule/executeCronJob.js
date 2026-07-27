// Runs the actual work for a due cron_configurations row.
// No per-job_type business logic exists yet — extend the switch below
// (e.g. case 'payment_reminder': ...) when a job type gets real behavior.
async function executeCronJob(job) {
  switch (job.job_type) {
    default:
      console.log(`[cron-schedule] Ejecutando job "${job.name}" (id ${job.id}, tipo "${job.job_type}") para la ciudadela ${job.real_estate_id}`);
      return {
        success: true,
        message: `Job "${job.name}" ejecutado correctamente (sin lógica de negocio definida para el tipo "${job.job_type}").`,
      };
  }
}

module.exports = { executeCronJob };
