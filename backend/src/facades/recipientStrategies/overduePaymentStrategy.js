const { query } = require('../../config/database');

// Recipients for job_type = OVERDUE_PAYMENT ("mora").
// A client is notified when they have an unpaid installment whose due_date
// has already passed relative to today.
class OverduePaymentStrategy {
  async getRecipients(realEstateId) {
    const result = await query(
      `SELECT DISTINCT ON (c.id)
              c.id AS client_id, u.id AS user_id, u.email, u.phone,
              u.first_name, u.last_name, i.id AS installment_id,
              i.due_date, i.amount, i.status
       FROM installments i
       JOIN clients c ON i.client_id = c.id
       JOIN users u ON c.user_id = u.id
       LEFT JOIN purchase_groups pg ON i.purchase_group_id = pg.id
       LEFT JOIN property_purchases pp ON i.property_purchase_id = pp.id
       WHERE i.status != 'paid'
         AND i.due_date < CURRENT_DATE
         AND COALESCE(pg.real_estate_id, pp.real_estate_id) = $1
       ORDER BY c.id, i.due_date ASC`,
      [realEstateId]
    );

    return result.rows.map((row) => ({
      clientId: row.client_id,
      userId: row.user_id,
      email: row.email,
      phone: row.phone,
      fullName: `${row.first_name} ${row.last_name}`,
      reason: 'OVERDUE_PAYMENT',
      context: {
        installmentId: row.installment_id,
        dueDate: row.due_date,
        amount: row.amount,
        daysOverdue: Math.round((new Date(new Date().toDateString()) - new Date(row.due_date)) / 86400000),
      },
    }));
  }
}

module.exports = new OverduePaymentStrategy();
