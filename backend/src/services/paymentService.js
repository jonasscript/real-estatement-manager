const { query } = require('../config/database');
const path = require('path');
const fs = require('fs');
const cloudinaryService = require('./cloudinaryService');
const ocrClientService = require('./ocrClientService');
const purchaseStageService = require('./purchaseStageService');

class PaymentService {
  // Get all payments for a client
  async getClientPayments(clientId, filters = {}) {
    try {
      let queryText = `
        SELECT p.*, i.installment_number, i.amount as installment_amount, i.due_date,
               COALESCE(i.property_purchase_id, cps.property_purchase_id) AS property_purchase_id,
               cps.name AS stage_name
        FROM payments p
        LEFT JOIN installments i ON p.installment_id = i.id
        LEFT JOIN client_purchase_stages cps ON p.purchase_stage_id = cps.id
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
        SELECT p.*, i.installment_number, c.user_id as client_user_id,
               cps.name AS stage_name
        FROM payments p
        LEFT JOIN installments i ON p.installment_id = i.id
        LEFT JOIN client_purchase_stages cps ON p.purchase_stage_id = cps.id
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

      if (payment.payment_type === 'purchase_stage') {
        if (status === 'approved') {
          await purchaseStageService.markStagePaymentApproved({ ...payment, status });
        } else if (status === 'rejected') {
          await purchaseStageService.markStagePaymentRejected({ ...payment, status });
        }
        return updatedPayment;
      }

      // If approved, update installment and client balance
      if (status === 'approved') {
        // Update installment status
        await query(
          "UPDATE installments SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [payment.installment_id]
        );

        // Update client remaining balance
        // Note: remaining_balance field has been removed from clients table

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

          await query(
            `UPDATE properties p
             SET sale_status = 'sold', updated_at = CURRENT_TIMESTAMP
             FROM property_purchases pp
             WHERE pp.property_id = p.id
               AND pp.client_id = $1`,
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
               cps.name AS stage_name,
               re.name as real_estate_name, prop.title as property_title,
               approver.first_name as approver_first_name, approver.last_name as approver_last_name
        FROM payments p
        LEFT JOIN installments i ON p.installment_id = i.id
        LEFT JOIN client_purchase_stages cps ON p.purchase_stage_id = cps.id
        LEFT JOIN property_purchases pp ON pp.id = COALESCE(i.property_purchase_id, cps.property_purchase_id)
        LEFT JOIN properties prop ON prop.id = pp.property_id
        JOIN clients c ON p.client_id = c.id
        JOIN users u ON c.user_id = u.id
        JOIN real_estates re ON c.real_estate_id = re.id
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
               COALESCE(i.property_purchase_id, cps.property_purchase_id) AS property_purchase_id,
               cps.name AS stage_name,
               u.first_name, u.last_name, u.email,
               prop.title as property_title, re.name as real_estate_name
        FROM payments p
        LEFT JOIN installments i ON p.installment_id = i.id
        LEFT JOIN client_purchase_stages cps ON p.purchase_stage_id = cps.id
        LEFT JOIN property_purchases pp ON pp.id = COALESCE(i.property_purchase_id, cps.property_purchase_id)
        LEFT JOIN properties prop ON prop.id = pp.property_id
        JOIN clients c ON p.client_id = c.id
        JOIN users u ON c.user_id = u.id
        JOIN real_estates re ON c.real_estate_id = re.id
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

  // Submit payment with OCR scan and Cloudinary upload (orchestrated endpoint)
  async submitPaymentWithOCR(paymentData, fileBuffer, fileInfo) {
    try {
      const { installmentId, amount, paymentMethod, referenceNumber, notes, userId } = paymentData;
      let { clientId } = paymentData;

      // Resolve clientId from userId if not provided directly
      if (!clientId && userId) {
        const clientLookup = await query('SELECT id FROM clients WHERE user_id = $1', [userId]);
        if (clientLookup.rows.length === 0) {
          throw new Error('Client profile not found for this user');
        }
        clientId = clientLookup.rows[0].id;
      }

      if (!clientId) {
        throw new Error('Client ID could not be determined');
      }

      console.log('Submitting payment with OCR:', { installmentId, clientId, amount }, fileInfo ? fileInfo.originalname : 'No file');

      // Verify installment belongs to client and is in a payable state
      const installmentQuery = `
        SELECT i.*, c.user_id
        FROM installments i
        JOIN clients c ON i.client_id = c.id
        WHERE i.id = $1
          AND i.client_id = $2
          AND i.status IN ('pending', 'overdue', 'late')
      `;
      const installmentResult = await query(installmentQuery, [installmentId, clientId]);

      if (installmentResult.rows.length === 0) {
        throw new Error('Invalid installment or installment not available for payment');
      }

      const installment = installmentResult.rows[0];

      // Enforce sequential payment order: no earlier unpaid installment must exist (within the same schedule)
      const sequentialCheck = await query(
        `SELECT COUNT(*) as cnt
         FROM installments
         WHERE payment_schedule_id = $1
           AND installment_number < $2
           AND status NOT IN ('paid', 'pending_approval')`,
        [installment.payment_schedule_id, installment.installment_number]
      );
      if (parseInt(sequentialCheck.rows[0].cnt) > 0) {
        throw new Error('Debes pagar las cuotas anteriores primero');
      }

      if (parseFloat(amount) !== parseFloat(installment.amount)) {
        throw new Error('Payment amount must match installment amount');
      }

      // OCR scan — best effort, do not fail if service is unavailable
      let ocrData = null;
      let ocrMatchedTemplate = null;
      if (fileBuffer && fileInfo) {
        try {
          const ocrResult = await ocrClientService.scan(fileBuffer, fileInfo.originalname, fileInfo.mimetype);
          if (ocrResult && ocrResult.success) {
            ocrData = ocrResult.extracted_data || null;
            ocrMatchedTemplate = ocrData?.matched_template || null;
          }
        } catch (ocrErr) {
          console.log('[OCR] Scan failed (continuing without OCR):', ocrErr.message);
        }
      }

      // Upload to Cloudinary — best effort, do not fail if service is unavailable
      let cloudinaryUrl = null;
      let cloudinaryPublicId = null;
      if (fileBuffer && fileInfo) {
        try {
          const uploaded = await cloudinaryService.uploadBuffer(fileBuffer, fileInfo.originalname, fileInfo.mimetype);
          cloudinaryUrl = uploaded.secure_url;
          cloudinaryPublicId = uploaded.public_id;
        } catch (cdnErr) {
          console.warn('[Cloudinary] Upload failed (continuing without cloud URL):', cdnErr.message);
        }
      }

      // Insert payment record with all collected data
      const insertQuery = `
        INSERT INTO payments (
          installment_id, client_id, amount, payment_method,
          reference_number, proof_file_path,
          proof_cloudinary_url, proof_cloudinary_public_id,
          ocr_data, ocr_matched_template,
          status, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11)
        RETURNING *
      `;
      const insertResult = await query(insertQuery, [
        installmentId,
        clientId,
        amount,
        paymentMethod,
        referenceNumber || null,
        cloudinaryUrl || null,       // proof_file_path points to cloud URL
        cloudinaryUrl || null,       // proof_cloudinary_url
        cloudinaryPublicId || null,
        ocrData ? JSON.stringify(ocrData) : null,
        ocrMatchedTemplate || null,
        notes || null,
      ]);

      const payment = insertResult.rows[0];

      // Update installment status
      await query(
        "UPDATE installments SET status = 'pending_approval', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [installmentId]
      );

      // Notify assigned seller
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
          relatedPaymentId: payment.id,
        });
      }

      return { payment, ocrData };
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
