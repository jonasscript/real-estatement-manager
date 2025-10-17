const { query } = require('../config/database');

class InstallmentService {
  // Get all installments with filtering
  async getAllInstallments(filters = {}) {
    try {
      let queryText = `
        SELECT i.*, c.user_id, u.first_name, u.last_name, u.email,
               p.title as property_title, re.name as real_estate_name,
               c.total_down_payment, c.remaining_balance
        FROM installments i
        JOIN clients c ON i.client_id = c.id
        JOIN users u ON c.user_id = u.id
        LEFT JOIN properties p ON c.property_id = p.id
        LEFT JOIN real_estates re ON c.real_estate_id = re.id
        WHERE 1=1
      `;
      const queryParams = [];
      let paramIndex = 1;

      // Add filters
      if (filters.clientId) {
        queryText += ` AND i.client_id = $${paramIndex}`;
        queryParams.push(filters.clientId);
        paramIndex++;
      }

      if (filters.status) {
        queryText += ` AND i.status = $${paramIndex}`;
        queryParams.push(filters.status);
        paramIndex++;
      }

      if (filters.realEstateId) {
        queryText += ` AND c.real_estate_id = $${paramIndex}`;
        queryParams.push(filters.realEstateId);
        paramIndex++;
      }

      if (filters.dueDateFrom) {
        queryText += ` AND i.due_date >= $${paramIndex}`;
        queryParams.push(filters.dueDateFrom);
        paramIndex++;
      }

      if (filters.dueDateTo) {
        queryText += ` AND i.due_date <= $${paramIndex}`;
        queryParams.push(filters.dueDateTo);
        paramIndex++;
      }

      queryText += ' ORDER BY i.due_date ASC, i.installment_number ASC';

      const result = await query(queryText, queryParams);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get installment by ID
  async getInstallmentById(installmentId) {
    try {
      const queryText = `
        SELECT i.*, c.user_id, u.first_name, u.last_name, u.email,
               p.title as property_title, re.name as real_estate_name,
               c.total_down_payment, c.remaining_balance
        FROM installments i
        JOIN clients c ON i.client_id = c.id
        JOIN users u ON c.user_id = u.id
        LEFT JOIN properties p ON c.property_id = p.id
        LEFT JOIN real_estates re ON c.real_estate_id = re.id
        WHERE i.id = $1
      `;
      const result = await query(queryText, [installmentId]);

      if (result.rows.length === 0) {
        throw new Error('Installment not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get installments by client
  async getInstallmentsByClient(clientId) {
    try {
      return this.getAllInstallments({ clientId });
    } catch (error) {
      throw error;
    }
  }

  // Get current user's installments
  async getMyInstallments(userId) {
    try {
      // Get client ID for user
      const clientQuery = 'SELECT id FROM clients WHERE user_id = $1';
      const clientResult = await query(clientQuery, [userId]);

      if (clientResult.rows.length === 0) {
        throw new Error('Client profile not found');
      }

      const clientId = clientResult.rows[0].id;
      return this.getInstallmentsByClient(clientId);
    } catch (error) {
      throw error;
    }
  }

  // Update installment status
  async updateInstallmentStatus(installmentId, status) {
    try {
      const validStatuses = ['pending', 'paid', 'overdue', 'late'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
      }

      const updateQuery = `
        UPDATE installments
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const updateResult = await query(updateQuery, [status, installmentId]);

      if (updateResult.rows.length === 0) {
        throw new Error('Installment not found');
      }

      return updateResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get overdue installments
  async getOverdueInstallments(realEstateId = null) {
    try {
      let whereClause = 'WHERE i.status IN (\'pending\', \'overdue\') AND i.due_date < CURRENT_DATE';
      const params = [];

      if (realEstateId) {
        whereClause += ' AND c.real_estate_id = $1';
        params.push(realEstateId);
      }

      const queryText = `
        SELECT i.*, c.user_id, u.first_name, u.last_name, u.email,
               p.title as property_title, re.name as real_estate_name,
               c.assigned_seller_id,
               EXTRACT(DAY FROM CURRENT_DATE - i.due_date) as days_overdue
        FROM installments i
        JOIN clients c ON i.client_id = c.id
        JOIN users u ON c.user_id = u.id
        LEFT JOIN properties p ON c.property_id = p.id
        LEFT JOIN real_estates re ON c.real_estate_id = re.id
        ${whereClause}
        ORDER BY i.due_date ASC
      `;

      const result = await query(queryText, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get upcoming installments (due within next 30 days)
  async getUpcomingInstallments(realEstateId = null) {
    try {
      let whereClause = `
        WHERE i.status = 'pending'
        AND i.due_date >= CURRENT_DATE
        AND i.due_date <= CURRENT_DATE + INTERVAL '30 days'
      `;
      const params = [];

      if (realEstateId) {
        whereClause += ' AND c.real_estate_id = $1';
        params.push(realEstateId);
      }

      const queryText = `
        SELECT i.*, c.user_id, u.first_name, u.last_name, u.email,
               p.title as property_title, re.name as real_estate_name,
               c.assigned_seller_id,
               EXTRACT(DAY FROM i.due_date - CURRENT_DATE) as days_until_due
        FROM installments i
        JOIN clients c ON i.client_id = c.id
        JOIN users u ON c.user_id = u.id
        LEFT JOIN properties p ON c.property_id = p.id
        LEFT JOIN real_estates re ON c.real_estate_id = re.id
        ${whereClause}
        ORDER BY i.due_date ASC
      `;

      const result = await query(queryText, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get installment statistics
  async getInstallmentStatistics(filters = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (filters.realEstateId) {
        whereClause += ` AND c.real_estate_id = $${paramIndex}`;
        params.push(filters.realEstateId);
        paramIndex++;
      }

      if (filters.dateFrom) {
        whereClause += ` AND i.due_date >= $${paramIndex}`;
        params.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters.dateTo) {
        whereClause += ` AND i.due_date <= $${paramIndex}`;
        params.push(filters.dateTo);
        paramIndex++;
      }

      const statsQuery = `
        SELECT
          COUNT(*) as total_installments,
          COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_installments,
          COUNT(CASE WHEN i.status = 'pending' THEN 1 END) as pending_installments,
          COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) as overdue_installments,
          COUNT(CASE WHEN i.status = 'late' THEN 1 END) as late_installments,
          COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount END), 0) as total_paid_amount,
          COALESCE(SUM(CASE WHEN i.status = 'pending' THEN i.amount END), 0) as total_pending_amount,
          COALESCE(SUM(CASE WHEN i.status = 'overdue' THEN i.amount END), 0) as total_overdue_amount,
          COALESCE(AVG(i.amount), 0) as average_installment_amount,
          MIN(CASE WHEN i.status IN ('pending', 'overdue', 'late') THEN i.due_date END) as next_due_date
        FROM installments i
        JOIN clients c ON i.client_id = c.id
        ${whereClause}
      `;

      const result = await query(statsQuery, params);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get installments summary for a client
  async getClientInstallmentSummary(clientId) {
    try {
      const summaryQuery = `
        SELECT
          COUNT(*) as total_installments,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_installments,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_installments,
          COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_installments,
          COUNT(CASE WHEN status = 'late' THEN 1 END) as late_installments,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount END), 0) as total_paid,
          COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue', 'late') THEN amount END), 0) as total_remaining,
          MIN(CASE WHEN status IN ('pending', 'overdue', 'late') THEN due_date END) as next_due_date,
          MAX(CASE WHEN status = 'paid' THEN due_date END) as last_payment_date
        FROM installments
        WHERE client_id = $1
      `;

      const result = await query(summaryQuery, [clientId]);

      if (result.rows.length === 0) {
        throw new Error('Client not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new InstallmentService();