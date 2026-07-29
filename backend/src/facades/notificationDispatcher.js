// Delivers notifications to the recipients a strategy selected.
// Placeholder: real email/WhatsApp sending is owned by another team, so for
// now this only logs what WOULD be sent, to validate the recipient logic.
class NotificationDispatcher {
  dispatch({ jobType, cronConfigId, cronConfigName, realEstateId, notificationChannels, recipients }) {
    const channels = this._channelsLabel(notificationChannels);

    console.log(
      `[cron-job-facade] Job "${cronConfigName}" (id ${cronConfigId}, tipo ${jobType}) para ciudadela ${realEstateId} - canales: ${channels}`
    );

    if (recipients.length === 0) {
      console.log('[cron-job-facade] No hay destinatarios que cumplan la condición.');
      return;
    }

    console.log(`[cron-job-facade] Destinatarios (${recipients.length}):`);
    recipients.forEach((recipient) => console.log(recipient));
  }

  _channelsLabel(channels) {
    const list = [];
    if (channels?.email) list.push('email');
    if (channels?.whatsapp) list.push('whatsapp');
    return list.length ? list.join(', ') : 'ninguno';
  }
}

module.exports = new NotificationDispatcher();
