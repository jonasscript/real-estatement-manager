const { query, pool } = require('../config/database');
const authService = require('./authService');
const purchaseStageService = require('./purchaseStageService');

class ClientService {
  // Get all clients with user and property information
  async getAllClients(filters = {}) {
    try {
      let queryText = `
        SELECT
          c.id AS client_id,
          u.id AS id,
          c.user_id,
          c.assigned_seller_id,
          c.contract_signed,
          c.contract_date,
          c.created_at,
          c.updated_at,
          u.email,
          u.first_name,
          u.last_name,
          u.phone,
          u.real_estate_id,
          re.name AS real_estate_name,
          su.first_name AS seller_first_name,
          su.last_name AS seller_last_name,
          su.email AS seller_email,
          sel.id AS seller_table_id,
          sel.user_id AS seller_user_id,
          (
            SELECT COALESCE(json_agg(json_build_object(
              'unit_identifier', ui.identifier,
              'model_name', pm2.name,
              'full_location', CONCAT(ph2.name, ' / ', b2.name, ' - ', ui.identifier),
              'final_price', COALESCE(pp2.final_price, p2.custom_price)
            ) ORDER BY pp2.created_at ASC), '[]'::json)
            FROM property_purchases pp2
            JOIN properties p2 ON pp2.property_id = p2.id
            JOIN units ui ON p2.unit_id = ui.id
            JOIN blocks b2 ON ui.block_id = b2.id
            JOIN phases ph2 ON b2.phase_id = ph2.id
            JOIN property_models pm2 ON p2.property_model_id = pm2.id
            WHERE pp2.client_id = c.id
          ) AS properties
        FROM clients c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN real_estates re ON u.real_estate_id = re.id
        LEFT JOIN sellers sel ON c.assigned_seller_id = sel.id
        LEFT JOIN users su ON sel.user_id = su.id
        WHERE 1=1
      `;
      const queryParams = [];
      let paramIndex = 1;

      // Add filters
      if (filters.realEstateId) {
        queryText += ` AND u.real_estate_id = $${paramIndex}`;
        queryParams.push(filters.realEstateId);
        paramIndex++;
      }

      if (filters.sellerId) {
        // sellerId is sellers.id (not users.id)
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
      return result.rows.map(row => {
        const { seller_first_name, seller_last_name, seller_email, seller_table_id, seller_user_id, ...rest } = row;
        return {
          ...rest,
          assigned_seller: seller_table_id ? {
            id: seller_table_id,
            user_id: seller_user_id,
            first_name: seller_first_name,
            last_name: seller_last_name,
            email: seller_email
          } : null
        };
      });
    } catch (error) {
      throw error;
    }
  }

  // Get client by ID
  async getClientById(clientId) {
    try {
      const queryText = `
        SELECT c.*, u.email, u.first_name, u.last_name, u.phone,
               su.first_name as seller_first_name, su.last_name as seller_last_name
        FROM clients c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN sellers sel ON c.assigned_seller_id = sel.id
        LEFT JOIN users su ON sel.user_id = su.id
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
               su.first_name as seller_first_name, su.last_name as seller_last_name
        FROM clients c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN sellers sel ON c.assigned_seller_id = sel.id
        LEFT JOIN users su ON sel.user_id = su.id
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
    const { userId, contractDate, assignedSellerId, contractSigned, propertyPurchases, realEstateId } = clientData;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create client
      const clientInsertQuery = `
        INSERT INTO clients (
          user_id, assigned_seller_id, contract_signed, contract_date
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const clientResult = await client.query(clientInsertQuery, [
        userId, assignedSellerId || null, contractSigned || false, contractDate || null
      ]);

      const newClient = clientResult.rows[0];

      // Link properties to client if provided
      if (propertyPurchases && propertyPurchases.length > 0) {
        for (const purchase of propertyPurchases) {
          const propResult = await client.query(
            'SELECT custom_price, sale_status FROM properties WHERE id = $1 FOR UPDATE',
            [purchase.propertyId]
          );
          if (propResult.rows.length === 0) throw new Error(`Property ${purchase.propertyId} not found`);
          if (propResult.rows[0].sale_status !== 'available') {
            throw new Error('Property is not available for reservation');
          }

          const propPrice = parseFloat(propResult.rows[0].custom_price);
          const finalPrice = this._resolveFinalPrice(purchase.finalPrice, propPrice);

          const ppResult = await client.query(
            `INSERT INTO property_purchases (
               client_id, property_id, seller_id, real_estate_id, final_price,
               final_down_payment_percentage, final_installments, purchase_date, commercial_status
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, 'reserved')
             RETURNING id`,
            [newClient.id, purchase.propertyId, assignedSellerId || null, realEstateId || null, finalPrice, purchase.finalDownPaymentPercentage, purchase.finalInstallments]
          );
          await purchaseStageService.instantiateStagesForPurchase(client, ppResult.rows[0].id);

          await client.query(
            'UPDATE properties SET sale_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [contractSigned ? 'sold' : 'reserved', purchase.propertyId]
          );
        }
      }

      await client.query('COMMIT');
      return newClient;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Atomic registration: creates user + client + property_purchases in one transaction
  async registerClientWithUser(data, realEstateId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check email uniqueness
      const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [data.email]);
      if (existingUser.rows.length > 0) {
        throw new Error('Email already exists');
      }

      // Hash password
      const passwordHash = await authService.hashPassword(data.password);

      // Insert user (role 4 = client)
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, real_estate_id, id_number, birthday)
         VALUES ($1, $2, $3, $4, $5, 4, $6, $7, $8)
         RETURNING id, email, first_name, last_name, phone, role_id, real_estate_id, is_active, created_at`,
        [data.email, passwordHash, data.firstName, data.lastName, data.phone || null,
         realEstateId, data.idNumber, data.birthday]
      );
      const newUser = userResult.rows[0];

      // Insert client
      const clientResult = await client.query(
        `INSERT INTO clients (user_id, assigned_seller_id, contract_signed, contract_date)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [newUser.id, data.assignedSellerId || null, data.contractSigned || false, data.contractDate || null]
      );
      const newClient = clientResult.rows[0];

      // Link properties and instantiate configurable commercial stages.
      for (const purchase of (data.propertyPurchases || [])) {
        // Fetch property price and lock it so it cannot be reserved twice.
        const propResult = await client.query(
          'SELECT custom_price, sale_status FROM properties WHERE id = $1 FOR UPDATE',
          [purchase.propertyId]
        );
        if (propResult.rows.length === 0) throw new Error(`Property ${purchase.propertyId} not found`);
        if (propResult.rows[0].sale_status !== 'available') {
          throw new Error('Property is not available for reservation');
        }
        const propertyPrice = parseFloat(propResult.rows[0].custom_price);
        const finalPrice = this._resolveFinalPrice(purchase.finalPrice, propertyPrice);

        // Insert purchase record, capture its id
        const ppResult = await client.query(
          `INSERT INTO property_purchases
             (client_id, property_id, seller_id, real_estate_id, final_price,
              final_down_payment_percentage, final_installments, purchase_date, commercial_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, 'reserved')
           RETURNING id`,
          [newClient.id, purchase.propertyId, data.assignedSellerId || null, realEstateId,
           finalPrice, purchase.finalDownPaymentPercentage, purchase.finalInstallments]
        );
        const purchaseId = ppResult.rows[0].id;
        // Update only the commercial lifecycle; construction status remains intact.
        await client.query(
          'UPDATE properties SET sale_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [data.contractSigned ? 'sold' : 'reserved', purchase.propertyId]
        );

        await purchaseStageService.instantiateStagesForPurchase(client, purchaseId);
      }

      await client.query('COMMIT');
      return { user: newUser, client: newClient };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
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

  // Get clients by seller — sellerId may be a users.id; resolve to sellers.id first
  async getClientsBySeller(userId) {
    try {
      const result = await query('SELECT id FROM sellers WHERE user_id = $1', [userId]);
      if (result.rows.length === 0) return [];
      const sellerTableId = result.rows[0].id;
      return this.getAllClients({ sellerId: sellerTableId });
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
        whereClause = 'WHERE 1=0'; // clients table has no real_estate_id; filter unsupported
        params = [];
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

  // Get client payment summary (only from active payment schedule)
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
        LEFT JOIN payment_schedules ps ON i.payment_schedule_id = ps.id
        WHERE c.id = $1
          AND (ps.is_active = true OR ps.id IS NULL)
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

  // Get client's installments (only from active payment schedule)
  async getClientInstallments(clientId) {
    try {
      const queryText = `
        SELECT i.*
        FROM installments i
        JOIN payment_schedules ps ON i.payment_schedule_id = ps.id
        WHERE i.client_id = $1
          AND ps.is_active = true
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
        SELECT p.*, i.installment_number, i.due_date,
               COALESCE(i.property_purchase_id, cps.property_purchase_id) AS property_purchase_id,
               cps.name AS stage_name
        FROM payments p
        LEFT JOIN installments i ON p.installment_id = i.id
        LEFT JOIN client_purchase_stages cps ON p.purchase_stage_id = cps.id
        WHERE p.client_id = $1
        ORDER BY p.created_at DESC
      `;
      const result = await query(queryText, [clientId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get all property purchases for a client (with full property details)
  async getClientProperties(clientId) {
    const queryText = `
        SELECT
          pp.id AS purchase_id,
          pp.property_id,
          pp.seller_id,
          pp.real_estate_id,
          pp.final_down_payment_percentage,
          pp.final_installments,
          pp.commercial_status,
          pp.down_payment_percentage,
          pp.down_payment_amount,
          pp.stage_paid_amount,
          pp.remaining_down_payment_amount,
          pp.purchase_date,
          pp.notes AS purchase_notes,
          pp.created_at AS purchase_created_at,
          u.identifier AS unit_identifier,
          pm.name AS model_name,
          pt.name AS property_type,
          b.name AS block_name,
          ph.name AS phase_name,
          p.sale_status,
          ps.name AS construction_status,
          ps.color AS construction_status_color,
          CASE p.sale_status
            WHEN 'reserved' THEN 'Reservado'
            WHEN 'sold' THEN 'Vendido'
            ELSE 'Disponible'
          END AS status,
          CASE p.sale_status
            WHEN 'reserved' THEN '#ffc107'
            WHEN 'sold' THEN '#dc3545'
            ELSE '#28a745'
          END AS status_color,
          COALESCE(pp.final_price, p.custom_price) AS final_price,
          pm.area_sqm,
          pm.bedrooms,
          pm.bathrooms,
          CONCAT(ph.name, ' / ', b.name, ' - ', u.identifier) AS full_location,
          su.first_name AS seller_first_name,
          su.last_name AS seller_last_name,
          COALESCE(stage_counts.total_stages, 0) AS total_stages,
          COALESCE(stage_counts.completed_stages, 0) AS completed_stages,
          COALESCE(stage_counts.pending_stages, 0) AS pending_stages
        FROM property_purchases pp
        JOIN properties p ON pp.property_id = p.id
        JOIN units u ON p.unit_id = u.id
        JOIN blocks b ON u.block_id = b.id
        JOIN phases ph ON b.phase_id = ph.id
        JOIN property_models pm ON p.property_model_id = pm.id
        LEFT JOIN property_types pt ON pm.property_type_id = pt.id
        LEFT JOIN property_status ps ON p.property_status_id = ps.id
        LEFT JOIN sellers s ON pp.seller_id = s.id
        LEFT JOIN users su ON s.user_id = su.id
        LEFT JOIN (
          SELECT property_purchase_id,
                 COUNT(*) AS total_stages,
                 COUNT(*) FILTER (WHERE status IN ('completed', 'approved')) AS completed_stages,
                 COUNT(*) FILTER (WHERE status NOT IN ('completed', 'approved')) AS pending_stages
          FROM client_purchase_stages
          GROUP BY property_purchase_id
        ) stage_counts ON stage_counts.property_purchase_id = pp.id
        WHERE pp.client_id = $1
        ORDER BY pp.created_at DESC
      `;
    const result = await query(queryText, [clientId]);
    return result.rows;
  }

  // Add a new property purchase to an existing client
  async addPropertyToClient(clientId, purchaseData, realEstateId) {
    const { propertyId, finalPrice: requestedFinalPrice, finalDownPaymentPercentage, finalInstallments, sellerId, notes } = purchaseData;

    const dbClient = await pool.connect();
    try {
      await dbClient.query('BEGIN');

      // Check duplicate
      const existing = await dbClient.query(
        'SELECT id FROM property_purchases WHERE client_id = $1 AND property_id = $2',
        [clientId, propertyId]
      );
      if (existing.rows.length > 0) {
        throw new Error('Property already purchased by this client');
      }

      const propResult = await dbClient.query(
        `SELECT p.custom_price, p.sale_status, c.contract_signed
         FROM properties p
         CROSS JOIN clients c
         WHERE p.id = $1 AND c.id = $2
         FOR UPDATE OF p`,
        [propertyId, clientId]
      );
      if (propResult.rows.length === 0) throw new Error(`Property ${propertyId} not found`);
      if (propResult.rows[0].sale_status !== 'available') {
        throw new Error('Property is not available for reservation');
      }

      const propertyPrice = parseFloat(propResult.rows[0].custom_price);
      const finalPrice = this._resolveFinalPrice(requestedFinalPrice, propertyPrice);
      const nextSaleStatus = propResult.rows[0].contract_signed ? 'sold' : 'reserved';

      // Insert purchase
      const ppResult = await dbClient.query(
        `INSERT INTO property_purchases
           (client_id, property_id, seller_id, real_estate_id, final_price,
            final_down_payment_percentage, final_installments, purchase_date, notes, commercial_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8, 'reserved')
         RETURNING *`,
        [clientId, propertyId, sellerId || null, realEstateId || null,
         finalPrice, finalDownPaymentPercentage, finalInstallments, notes || null]
      );
      const newPurchase = ppResult.rows[0];

      await dbClient.query(
        'UPDATE properties SET sale_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [nextSaleStatus, propertyId]
      );

      await purchaseStageService.instantiateStagesForPurchase(dbClient, newPurchase.id);

      await dbClient.query('COMMIT');
      return newPurchase;
    } catch (error) {
      await dbClient.query('ROLLBACK');
      throw error;
    } finally {
      dbClient.release();
    }
  }

  // Generate monthly installments for a property purchase
  // amount per installment = (price × downPaymentPct / 100) / numInstallments
  async _createInstallmentsForPurchase(dbClient, clientId, purchaseId, finalPrice, downPaymentPct, numInstallments) {
    if (numInstallments <= 0 || finalPrice <= 0) return;

    const downPayment = (finalPrice * downPaymentPct) / 100;
    const monthlyAmount = parseFloat((downPayment / numInstallments).toFixed(2));

    // Create payment_schedule header (cabecera)
    const scheduleRes = await dbClient.query(
      `INSERT INTO payment_schedules
         (property_purchase_id, client_id, total_amount, installments_count, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id`,
      [purchaseId, clientId, downPayment, numInstallments]
    );
    const scheduleId = scheduleRes.rows[0].id;

    // Due dates start the month after today
    const start = new Date();
    start.setDate(1);
    start.setMonth(start.getMonth() + 1);

    for (let i = 1; i <= numInstallments; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(start.getMonth() + (i - 1));
      const dueDateStr = dueDate.toISOString().split('T')[0];

      await dbClient.query(
        `INSERT INTO installments
           (payment_schedule_id, client_id, property_purchase_id, installment_number, amount, due_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
        [scheduleId, clientId, purchaseId, i, monthlyAmount, dueDateStr]
      );
    }
  }

  _resolveFinalPrice(requestedFinalPrice, propertyPrice) {
    const finalPrice = requestedFinalPrice === undefined || requestedFinalPrice === null || requestedFinalPrice === ''
      ? propertyPrice
      : parseFloat(requestedFinalPrice);

    if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
      throw new Error('Final price must be a positive number');
    }

    return finalPrice;
  }
}

module.exports = new ClientService();
