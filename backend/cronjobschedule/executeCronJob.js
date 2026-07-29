const axios = require('axios');

// Runs the actual work for a due cron_configurations row by calling the
// app's own internal cron-job-executions service, which resolves recipients
// (per job_type business rules) and dispatches notifications.
async function executeCronJob(job) {
  const baseUrl = `http://localhost:${process.env.PORT || 3000}`;

  const { data } = await axios.post(
    `${baseUrl}/api/cron-job-executions`,
    {
      jobType: job.job_type,
      realEstateId: job.real_estate_id,
      notificationChannels: {
        email: job.notify_email,
        whatsapp: job.notify_whatsapp,
      },
      cronConfigId: job.id,
      cronConfigName: job.name,
    },
    {
      headers: { Authorization: `Bearer ${process.env.CRON_INTERNAL_TOKEN}` },
      timeout: 15000,
    }
  );

  const recipientsCount = data?.data?.recipientsCount ?? 0;
  return {
    success: true,
    message: `Job "${job.name}" ejecutado correctamente. Destinatarios encontrados: ${recipientsCount}.`,
  };
}

module.exports = { executeCronJob };
