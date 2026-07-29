const { checkDueCronJobs } = require('./checkDueCronJobs');

const INTERVAL_MS = 30 * 1000;
let intervalHandle = null;

function startCronJobScheduler() {
  if (intervalHandle) return intervalHandle;

  console.log(`[cron-schedule] Scheduler iniciado (cada ${INTERVAL_MS / 1000}s).`);

  intervalHandle = setInterval(() => {
    checkDueCronJobs().catch((error) => {
      console.error('[cron-schedule] Error al revisar cron jobs:', error);
    });
  }, INTERVAL_MS);

  return intervalHandle;
}

function stopCronJobScheduler() {
  if (!intervalHandle) return;
  clearInterval(intervalHandle);
  intervalHandle = null;
}

module.exports = { startCronJobScheduler, stopCronJobScheduler };
