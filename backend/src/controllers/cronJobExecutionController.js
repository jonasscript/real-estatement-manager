const { validationResult } = require('express-validator');
const cronJobFacade = require('../facades/cronJobFacade');

class CronJobExecutionController {
  async execute(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { jobType, notificationChannels, realEstateId, cronConfigId, cronConfigName } = req.body;
      const result = await cronJobFacade.execute({
        jobType,
        notificationChannels,
        realEstateId,
        cronConfigId,
        cronConfigName,
      });

      res.json({
        message: 'Cron job processed successfully',
        data: { recipientsCount: result.recipientsCount },
      });
    } catch (error) {
      console.error('Cron job execution error:', error);
      res.status(500).json({ error: error.message || 'Failed to process cron job' });
    }
  }
}

module.exports = new CronJobExecutionController();
