const { query } = require('../../config/database');

// Recipients for job_type = PAYMENT_REMINDER.
// A client is notified when they have a pending installment due within
// DAYS_REST_FOR_PAY days from today (e.g. pays on the 15th, today is the
// 10th -> 5 days left -> notified; more than DAYS_REST_FOR_PAY days away -> skipped).
class PaymentReminderStrategy {
  async getRecipients(realEstateId) {
    const daysRestForPay = Number(process.env.DAYS_REST_FOR_PAY) || 5;

    const result = await query(
      `SELECT DISTINCT ON (c.id)
              c.id AS client_id, u.id AS user_id, u.email, u.phone,
              u.first_name, u.last_name, i.id AS installment_id,
              i.due_date, i.amount
       FROM installments i
       JOIN clients c ON i.client_id = c.id
       JOIN users u ON c.user_id = u.id
       LEFT JOIN purchase_groups pg ON i.purchase_group_id = pg.id
       LEFT JOIN property_purchases pp ON i.property_purchase_id = pp.id
       WHERE i.status = 'pending'
         AND i.due_date >= CURRENT_DATE
         AND i.due_date <= CURRENT_DATE + $1::integer
         AND COALESCE(pg.real_estate_id, pp.real_estate_id) = $2
       ORDER BY c.id, i.due_date ASC`,
      [daysRestForPay, realEstateId]
    );

    return result.rows.map((row) => ({
      clientId: row.client_id,
      userId: row.user_id,
      email: row.email,
      phone: row.phone,
      fullName: `${row.first_name} ${row.last_name}`,
      reason: 'PAYMENT_REMINDER',
      context: {
        installmentId: row.installment_id,
        dueDate: row.due_date,
        amount: row.amount,
        daysUntilDue: Math.round((new Date(row.due_date) - new Date(new Date().toDateString())) / 86400000),
      },
    }));
  }
}

module.exports = new PaymentReminderStrategy();
