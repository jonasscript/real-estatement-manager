const paymentReminderStrategy = require('./recipientStrategies/paymentReminderStrategy');
const overduePaymentStrategy = require('./recipientStrategies/overduePaymentStrategy');
const clientBirthdayStrategy = require('./recipientStrategies/clientBirthdayStrategy');
const notificationDispatcher = require('./notificationDispatcher');

// jobType -> strategy exposing getRecipients(realEstateId). Adding a new
// cron job type only requires registering a new strategy here (Open/Closed:
// this facade never needs to change to support a new job type).
const RECIPIENT_STRATEGIES = {
  PAYMENT_REMINDER: paymentReminderStrategy,
  OVERDUE_PAYMENT: overduePaymentStrategy,
  CLIENT_BIRTHDAY: clientBirthdayStrategy,
};

// Single entry point for "a cron job is due, figure out who to notify and
// notify them" (Facade pattern). Recipient selection lives in the
// strategies above; delivery lives in notificationDispatcher — each with a
// single responsibility.
class CronJobFacade {
  async execute({ jobType, notificationChannels, realEstateId, cronConfigId, cronConfigName }) {
    const strategy = RECIPIENT_STRATEGIES[jobType];
    if (!strategy) {
      throw new Error(`No recipient strategy registered for job type "${jobType}"`);
    }
    if (!realEstateId) {
      throw new Error('realEstateId is required');
    }

    const recipients = await strategy.getRecipients(realEstateId);

    notificationDispatcher.dispatch({
      jobType,
      cronConfigId,
      cronConfigName,
      realEstateId,
      notificationChannels,
      recipients,
    });

    return { recipientsCount: recipients.length, recipients };
  }
}

module.exports = new CronJobFacade();
