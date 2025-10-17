const { query } = require('../config/database');
const path = require('path');
const fs = require('fs');

class PaymentService {
  // Get all payments for a client
  async getClientPayments(clientId, filters = {}) {
    try {
      let queryText = `
        SELECT p.*, i.installment_number, i.amount as installment_amount, i.due_date
        FROM payments p
        JOIN installments i ON p.installment_id = i.id
        WHERE p.client_id = $1
      `;
      const queryParams = [clientId];
      let paramIndex = 2;

      // Add filters
      if (filters.status) {
        queryText += ` AND p.status = $${paramIndex}`;
        queryParams.push(filters.status);
        paramIndex++;
      }

      if (filters.installmentId) {
        queryText += ` AND p.installment_id = $${paramIndex}`;
        queryParams.push(filters.installmentId);
        paramIndex++;
      }

      queryText += ' ORDER BY p.payment_date DESC';

      const result = await query(queryText, queryParams);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Create a new payment with proof upload
  async createPayment(paymentData, proofFile = null) {
    try {
      const { installmentId, clientId, amount, paymentMethod, referenceNumber, notes } = paymentData;

      // Verify installment belongs to client and is pending
      const installmentQuery = `
        SELECT i.*, c.user_id
        FROM installments i
        JOIN clients c ON i.client_id = c.id
        WHERE i.id = $1 AND i.client_id = $2 AND i.status = 'pending'
      `;
      const installmentResult = await query(installmentQuery, [installmentId, clientId]);

      if (installmentResult.rows.length === 0) {
        throw new Error('Invalid installment or installment not pending');
      }

      const installment = installmentResult.rows[0];

      // Check if amount matches installment amount
      if (parseFloat(amount) !== parseFloat(installment.amount)) {
        throw new Error('Payment amount must match installment amount');
      }

      // Create payment record
      const insertQuery = `
        INSERT INTO payments (
          installment_id, client_id, amount, payment_method,
          reference_number, proof_file_path, status, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
        RETURNING *
      `;

      const proofPath = proofFile ? proofFile.path : null;
      const insertResult = await query(insertQuery, [
        installmentId, clientId, amount, paymentMethod,
        referenceNumber, proofPath, notes
      ]);

      const payment = insertResult.rows[0];

      // Update installment status to pending approval
      await query(
        "UPDATE installments SET status = 'pending_approval', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [installmentId]
      );

      // Create notification for assigned seller
      const sellerQuery = 'SELECT assigned_seller_id FROM clients WHERE id = $1';
      const sellerResult = await query(sellerQuery, [clientId]);

      if (sellerResult.rows.length > 0 && sellerResult.rows[0].assigned_seller_id) {
        await this.createNotification({
          recipientId: sellerResult.rows[0].assigned_seller_id,
          senderId: installment.user_id,
          type: 'payment_uploaded',
          title: 'New Payment Proof Uploaded',
          message: `Client has uploaded payment proof for installment #${installment.installment_number}`,
          relatedClientId: clientId,
          relatedPaymentId: payment.id
        });
      }

      return payment;
    } catch (error) {
      throw error;
    }
  }

  // Approve or reject payment
  async approvePayment(paymentId, approvedBy, status, notes = null) {
    try {
      // Get payment details
      const paymentQuery = `
        SELECT p.*, i.installment_number, c.user_id as client_user_id
        FROM payments p
        JOIN installments i ON p.installment_id = i.id
        JOIN clients c ON p.client_id = c.id
        WHERE p.id = $1
      `;
      const paymentResult = await query(paymentQuery, [paymentId]);

      if (paymentResult.rows.length === 0) {
        throw new Error('Payment not found');
      }

      const payment = paymentResult.rows[0];

      // Update payment status
      const updateQuery = `
        UPDATE payments
        SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP, notes = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;
      const updateResult = await query(updateQuery, [status, approvedBy, notes, paymentId]);
      const updatedPayment = updateResult.rows[0];

      // If approved, update installment and client balance
      if (status === 'approved') {
        // Update installment status
        await query(
          "UPDATE installments SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [payment.installment_id]
        );

        // Update client remaining balance
        await query(
          "UPDATE clients SET remaining_balance = remaining_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [payment.amount, payment.client_id]
        );

        // Check if all installments are paid
        const allPaidQuery = `
          SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid
          FROM installments WHERE client_id = $1
        `;
        const allPaidResult = await query(allPaidQuery, [payment.client_id]);
        const { total, paid } = allPaidResult.rows[0];

        if (parseInt(total) === parseInt(paid)) {
          // All installments paid - mark contract as signed
          await query(
            "UPDATE clients SET contract_signed = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [payment.client_id]
          );
        }
      } else if (status === 'rejected') {
        // Reset installment status to pending
        await query(
          "UPDATE installments SET status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [payment.installment_id]
        );
      }

      // Create notification for client
      const notificationType = status === 'approved' ? 'payment_approved' : 'payment_rejected';
      const notificationTitle = status === 'approved' ? 'Payment Approved' : 'Payment Rejected';
      const notificationMessage = status === 'approved'
        ? `Your payment for installment #${payment.installment_number} has been approved.`
        : `Your payment for installment #${payment.installment_number} has been rejected. ${notes || ''}`;

      await this.createNotification({
        recipientId: payment.client_user_id,
        senderId: approvedBy,
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        relatedClientId: payment.client_id,
        relatedPaymentId: paymentId
      });

      return updatedPayment;
    } catch (error) {
      throw error;
    }
  }

  // Get payment by ID with full details
  async getPaymentById(paymentId) {
    try {
      const queryText = `
        SELECT p.*, i.installment_number, i.amount as installment_amount, i.due_date,
               c.user_id as client_user_id, u.first_name, u.last_name, u.email,
               re.name as real_estate_name, prop.title as property_title,
               approver.first_name as approver_first_name, approver.last_name as approver_last_name
        FROM payments p
        JOIN installments i ON p.installment_id = i.id
        JOIN clients c ON p.client_id = c.id
        JOIN users u ON c.user_id = u.id
        JOIN properties prop ON c.property_id = prop.id
        JOIN real_estates re ON prop.real_estate_id = re.id
        LEFT JOIN users approver ON p.approved_by = approver.id
        WHERE p.id = $1
      `;
      const result = await query(queryText, [paymentId]);

      if (result.rows.length === 0) {
        throw new Error('Payment not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get pending payments for approval
  async getPendingPayments(filters = {}) {
    try {
      let queryText = `
        SELECT p.*, i.installment_number, i.amount as installment_amount, i.due_date,
               u.first_name, u.last_name, u.email,
               prop.title as property_title, re.name as real_estate_name
        FROM payments p
        JOIN installments i ON p.installment_id = i.id
        JOIN clients c ON p.client_id = c.id
        JOIN users u ON c.user_id = u.id
        JOIN properties prop ON c.property_id = prop.id
        JOIN real_estates re ON prop.real_estate_id = re.id
        WHERE p.status = 'pending'
      `;
      const queryParams = [];
      let paramIndex = 1;

      // Add filters
      if (filters.realEstateId) {
        queryText += ` AND re.id = $${paramIndex}`;
        queryParams.push(filters.realEstateId);
        paramIndex++;
      }

      if (filters.sellerId) {
        queryText += ` AND c.assigned_seller_id = $${paramIndex}`;
        queryParams.push(filters.sellerId);
        paramIndex++;
      }

      queryText += ' ORDER BY p.payment_date DESC';

      const result = await query(queryText, queryParams);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Delete payment proof file
  async deletePaymentProof(paymentId) {
    try {
      const paymentQuery = 'SELECT proof_file_path FROM payments WHERE id = $1';
      const paymentResult = await query(paymentQuery, [paymentId]);

      if (paymentResult.rows.length === 0) {
        throw new Error('Payment not found');
      }

      const proofPath = paymentResult.rows[0].proof_file_path;

      if (proofPath && fs.existsSync(proofPath)) {
        fs.unlinkSync(proofPath);
      }

      // Update payment record
      await query(
        'UPDATE payments SET proof_file_path = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [paymentId]
      );

      return { message: 'Payment proof deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Create notification
  async createNotification(notificationData) {
    try {
      const { recipientId, senderId, type, title, message, relatedClientId, relatedPaymentId } = notificationData;

      const insertQuery = `
        INSERT INTO notifications (
          recipient_id, sender_id, type, title, message,
          related_client_id, related_payment_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      await query(insertQuery, [
        recipientId, senderId, type, title, message, relatedClientId, relatedPaymentId
      ]);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  // Get payment statistics
  async getPaymentStatistics(filters = {}) {
    try {
      let whereClause = '';
      let params = [];

      if (filters.clientId) {
        whereClause = 'WHERE p.client_id = $1';
        params = [filters.clientId];
      }

      const statsQuery = `
        SELECT
          COUNT(*) as total_payments,
          COUNT(CASE WHEN p.status = 'approved' THEN 1 END) as approved_payments,
          COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_payments,
          COUNT(CASE WHEN p.status = 'rejected' THEN 1 END) as rejected_payments,
          COALESCE(SUM(CASE WHEN p.status = 'approved' THEN p.amount END), 0) as total_approved_amount,
          COALESCE(SUM(p.amount), 0) as total_amount
        FROM payments p
        ${whereClause}
      `;

      const result = await query(statsQuery, params);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PaymentService();