const { query } = require('../../config/database');

// Recipients for job_type = CLIENT_BIRTHDAY.
// A client is notified when today matches their birthday's month and day.
class ClientBirthdayStrategy {
  async getRecipients(realEstateId) {
    const result = await query(
      `SELECT DISTINCT c.id AS client_id, u.id AS user_id, u.email, u.phone,
              u.first_name, u.last_name, u.birthday
       FROM clients c
       JOIN users u ON c.user_id = u.id
       WHERE u.birthday IS NOT NULL
         AND EXTRACT(MONTH FROM u.birthday) = EXTRACT(MONTH FROM CURRENT_DATE)
         AND EXTRACT(DAY FROM u.birthday) = EXTRACT(DAY FROM CURRENT_DATE)
         AND (
           EXISTS (SELECT 1 FROM property_purchases pp WHERE pp.client_id = c.id AND pp.real_estate_id = $1)
           OR EXISTS (SELECT 1 FROM purchase_groups pg WHERE pg.client_id = c.id AND pg.real_estate_id = $1)
         )`,
      [realEstateId]
    );

    return result.rows.map((row) => ({
      clientId: row.client_id,
      userId: row.user_id,
      email: row.email,
      phone: row.phone,
      fullName: `${row.first_name} ${row.last_name}`,
      reason: 'CLIENT_BIRTHDAY',
      context: {
        birthday: row.birthday,
      },
    }));
  }
}

module.exports = new ClientBirthdayStrategy();
