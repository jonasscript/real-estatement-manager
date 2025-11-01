const { query } = require('../config/database');

class ClientService {
  // Get all clients with user and property information
  async getAllClients(filters = {}) {
    try {
      let queryText = `
        SELECT c.*, u.email, u.first_name, u.last_name, u.phone,
               re.name as real_estate_name,
               su.first_name as seller_first_name, su.last_name as seller_last_name
        FROM clients c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN real_estates re ON c.real_estate_id = re.id
        LEFT JOIN users su ON c.assigned_seller_id = su.id
        WHERE 1=1
      `;
      const queryParams = [];
      let paramIndex = 1;

      // Add filters
      if (filters.realEstateId) {
        queryText += ` AND c.real_estate_id = $${paramIndex}`;
        queryParams.push(filters.realEstateId);
        paramIndex++;
      }

      if (filters.sellerId) {
        queryText += ` AND c.assigned_seller_id = $${paramIndex}`;
        queryParams.push(filters.sellerId);
        paramIndex++;
      }

      if (filters.contractSigned !== undefined) {
        queryText += ` AND c.contract_signed = $${paramIndex}`;
        queryParams.push(filters.contractSigned);
        paramIndex++;
      }

      if (filters.search) {
        queryText += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      queryText += ' ORDER BY c.created_at DESC';

      const result = await query(queryText, queryParams);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get client by ID
  async getClientById(clientId) {
    try {
      const queryText = `
        SELECT c.*, u.email, u.first_name, u.last_name, u.phone,
               re.name as real_estate_name,
               su.first_name as seller_first_name, su.last_name as seller_last_name
        FROM clients c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN real_estates re ON c.real_estate_id = re.id
        LEFT JOIN users su ON c.assigned_seller_id = su.id
        WHERE c.id = $1
      `;
      const result = await query(queryText, [clientId]);

      if (result.rows.length === 0) {
        throw new Error('Client not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get client by user ID
  async getClientByUserId(userId) {
    try {
      const queryText = `
        SELECT c.*, u.email, u.first_name, u.last_name, u.phone,
               re.name as real_estate_name,
               su.first_name as seller_first_name, su.last_name as seller_last_name
        FROM clients c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN real_estates re ON c.real_estate_id = re.id
        LEFT JOIN users su ON c.assigned_seller_id = su.id
        WHERE c.user_id = $1
      `;
      const result = await query(queryText, [userId]);

      if (result.rows.length === 0) {
        throw new Error('Client not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Create new client and generate installments
  async createClient(clientData, createdBy) {
    const client = await this._createClientTransaction(clientData, createdBy);
    return client;
  }

  // Private method to handle client creation in transaction
  async _createClientTransaction(clientData, createdBy) {
    const { userId, contractDate, assignedSellerId } = clientData;

    try {
      // Start transaction
      await query('BEGIN');

      // Create client
      const clientInsertQuery = `
        INSERT INTO clients (
          user_id, assigned_seller_id, contract_signed, contract_date
        )
        VALUES ($1, $2, true, $3)
        RETURNING *
      `;
      const clientResult = await query(clientInsertQuery, [
        userId, assignedSellerId || null, contractDate
      ]);

      const client = clientResult.rows[0];

      // Commit transaction
      await query('COMMIT');

      return client;
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }

  // Generate installments for a client
  async _generateInstallments(clientId, property) {
    const { total_installments, installment_amount } = property;
    const installments = [];

    // Calculate due dates (monthly installments starting from next month)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() + 1); // Start from next month

    for (let i = 1; i <= total_installments; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(startDate.getMonth() + (i - 1));

      installments.push({
        client_id: clientId,
        installment_number: i,
        amount: installment_amount,
        due_date: dueDate.toISOString().split('T')[0], // YYYY-MM-DD format
        status: i === 1 ? 'pending' : 'pending' // First installment is immediately pending
      });
    }

    // Bulk insert installments
    const values = installments.map(inst => `(${inst.client_id}, ${inst.installment_number}, ${inst.amount}, '${inst.due_date}', '${inst.status}')`).join(', ');
    const insertQuery = `
      INSERT INTO installments (client_id, installment_number, amount, due_date, status)
      VALUES ${values}
    `;

    await query(insertQuery);
  }

  // Update client
  async updateClient(clientId, updateData) {
    try {
      const { contractSigned, contractDate, assignedSellerId } = updateData;

      const updateQuery = `
        UPDATE clients
        SET contract_signed = $1, contract_date = $2, assigned_seller_id = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;
      const updateResult = await query(updateQuery, [
        contractSigned, contractDate, assignedSellerId, clientId
      ]);

      if (updateResult.rows.length === 0) {
        throw new Error('Client not found');
      }

      return updateResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete client
  async deleteClient(clientId) {
    try {
      // Check if client has payments
      const paymentCheckQuery = 'SELECT COUNT(*) as payment_count FROM payments WHERE client_id = $1';
      const paymentCheckResult = await query(paymentCheckQuery, [clientId]);
      const paymentCount = parseInt(paymentCheckResult.rows[0].payment_count);

      if (paymentCount > 0) {
        throw new Error('Cannot delete client with existing payments');
      }

      // Delete installments first (cascade will handle this, but being explicit)
      await query('DELETE FROM installments WHERE client_id = $1', [clientId]);

      // Delete client
      const deleteQuery = 'DELETE FROM clients WHERE id = $1 RETURNING *';
      const deleteResult = await query(deleteQuery, [clientId]);

      if (deleteResult.rows.length === 0) {
        throw new Error('Client not found');
      }

      return deleteResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get clients by seller
  async getClientsBySeller(sellerId) {
    try {
      return this.getAllClients({ sellerId });
    } catch (error) {
      throw error;
    }
  }

  // Get client statistics
  async getClientStatistics(realEstateId = null) {
    try {
      let whereClause = '';
      let params = [];

      if (realEstateId) {
        whereClause = 'WHERE c.real_estate_id = $1';
        params = [realEstateId];
      }

      const statsQuery = `
        SELECT
          COUNT(*) as total_clients,
          COUNT(CASE WHEN c.contract_signed = true THEN 1 END) as signed_contracts,
          COUNT(CASE WHEN c.contract_signed = false THEN 1 END) as pending_contracts
        FROM clients c
        ${whereClause}
      `;

      const result = await query(statsQuery, params);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get client payment summary
  async getClientPaymentSummary(clientId) {
    try {
      const summaryQuery = `
        SELECT
          COUNT(i.id) as total_installments,
          COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_installments,
          COUNT(CASE WHEN i.status = 'pending' THEN 1 END) as pending_installments,
          COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) as overdue_installments,
          COUNT(CASE WHEN i.status = 'late' THEN 1 END) as late_installments,
          COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount END), 0) as total_paid,
          MIN(CASE WHEN i.status IN ('pending', 'overdue', 'late') THEN i.due_date END) as next_due_date
        FROM clients c
        LEFT JOIN installments i ON c.id = i.client_id
        WHERE c.id = $1
        GROUP BY c.id
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

  // Get client's installments
  async getClientInstallments(clientId) {
    try {
      const queryText = `
        SELECT i.*
        FROM installments i
        WHERE i.client_id = $1
        ORDER BY i.due_date ASC
      `;
      const result = await query(queryText, [clientId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get client's payments
  async getClientPayments(clientId) {
    try {
      const queryText = `
        SELECT p.*, i.installment_number, i.due_date
        FROM payments p
        JOIN installments i ON p.installment_id = i.id
        WHERE i.client_id = $1
        ORDER BY p.created_at DESC
      `;
      const result = await query(queryText, [clientId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ClientService();