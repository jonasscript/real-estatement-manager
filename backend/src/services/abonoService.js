const { query } = require('../config/database');
const cloudinaryService = require('./cloudinaryService');

class AbonoService {
  /**
   * Process a capital abono (lump-sum principal payment).
   *
   * Flow:
   *  1. Load the ACTIVE payment_schedule for the purchase
   *  2. Sum pending installments from that schedule → remainingBalance
   *  3. Upload proof to Cloudinary
   *  4. Calculate new installment schedule
   *  5. Transaction:
   *     a. Deactivate current schedule (is_active = false)
   *     b. Insert abono record
   *     c. Create NEW payment_schedule (cabecera) with the recalculated balance
   *     d. Link abono ↔ schedules
   *     e. Insert new installments referencing the new schedule
   *     f. Insert abono payment record (so it appears in the payments list)
   *     Old installments are NOT deleted — they remain linked to the old (inactive) schedule.
   */
  async processAbono({ clientId, purchaseId, abonoAmount, abonoType, processedBy, proofBuffer, proofOriginalName, proofMimetype }) {
    // 1. Fetch the active schedule for this purchase
    const scheduleRes = await query(
      `SELECT id, total_amount, installments_count
       FROM payment_schedules
       WHERE property_purchase_id = $1
         AND client_id = $2
         AND is_active = true
       LIMIT 1`,
      [purchaseId, clientId]
    );
    if (scheduleRes.rows.length === 0) {
      throw new Error('No existe una tabla de pagos activa para este inmueble.');
    }
    const activeSchedule = scheduleRes.rows[0];

    // 2. Load pending installments from the active schedule
    const pendingRes = await query(
      `SELECT * FROM installments
       WHERE payment_schedule_id = $1
         AND status NOT IN ('paid')
       ORDER BY installment_number ASC`,
      [activeSchedule.id]
    );
    const pending = pendingRes.rows;
    if (pending.length === 0) {
      throw new Error('No hay cuotas pendientes para este inmueble.');
    }

    // Remaining term = schedule total installments − already paid
    const paidRes = await query(
      `SELECT COUNT(*) AS paid_count FROM installments
       WHERE payment_schedule_id = $1 AND status = 'paid'`,
      [activeSchedule.id]
    );
    const paidCount = parseInt(paidRes.rows[0].paid_count, 10);
    const remainingTerm = activeSchedule.installments_count - paidCount;

    const remainingBalance = pending.reduce((s, i) => s + parseFloat(i.amount), 0);
    const netAbonoAmount = parseFloat(abonoAmount);

    if (netAbonoAmount <= 0) {
      throw new Error('El monto del abono debe ser mayor a cero.');
    }
    if (netAbonoAmount >= remainingBalance) {
      throw new Error('El monto del abono no puede ser igual o mayor al saldo pendiente total. Use el flujo de pago normal.');
    }

    // 3. Upload proof to Cloudinary (if provided)
    let proofFileUrl = null;
    let proofPublicId = null;
    if (proofBuffer) {
      const cloudRes = await cloudinaryService.uploadBuffer(proofBuffer, proofOriginalName, proofMimetype);
      proofFileUrl = cloudRes.secure_url;
      proofPublicId = cloudRes.public_id;
    }

    // 4. Generate new installment schedule
    const newBalance = remainingBalance - netAbonoAmount;
    const pendingCount = pending.length;
    let newSchedule = [];

    const firstDueDate = new Date(pending[0].due_date);

    if (abonoType === 'reduce_amount') {
      // Keep the same remaining term (schedule installments − paid), lower amount
      const newAmount = parseFloat((newBalance / remainingTerm).toFixed(2));
      const totalFixed = parseFloat((newAmount * remainingTerm).toFixed(2));
      const diff = parseFloat((newBalance - totalFixed).toFixed(2));

      for (let i = 0; i < remainingTerm; i++) {
        const dueDate = new Date(firstDueDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        const amount = i === remainingTerm - 1 ? parseFloat((newAmount + diff).toFixed(2)) : newAmount;
        newSchedule.push({ installment_number: i + 1, amount, due_date: dueDate });
      }
    } else {
      // reduce_term: keep same monthly amount, fewer installments
      const currentMonthlyAmount = parseFloat(pending[0].amount);
      const newCount = Math.floor(newBalance / currentMonthlyAmount);
      const residual = parseFloat((newBalance - newCount * currentMonthlyAmount).toFixed(2));

      for (let i = 0; i < newCount; i++) {
        const dueDate = new Date(firstDueDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        newSchedule.push({ installment_number: i + 1, amount: currentMonthlyAmount, due_date: dueDate });
      }
      if (residual > 0) {
        const lastDate = new Date(firstDueDate);
        lastDate.setMonth(lastDate.getMonth() + newCount);
        newSchedule.push({ installment_number: newCount + 1, amount: residual, due_date: lastDate });
      }
    }

    // 5. Run everything in a transaction
    const client = await require('../config/database').pool.connect();
    try {
      await client.query('BEGIN');

      // 5a. Deactivate current schedule
      await client.query(
        `UPDATE payment_schedules SET is_active = false WHERE id = $1`,
        [activeSchedule.id]
      );

      // 5a-bis. Archive pending installments from the old schedule
      await client.query(
        `UPDATE installments SET status = 'archived', updated_at = CURRENT_TIMESTAMP
         WHERE payment_schedule_id = $1 AND status NOT IN ('paid')`,
        [activeSchedule.id]
      );

      // 5b. Create abono record
      const abonoRes = await client.query(
        `INSERT INTO abonos (client_id, property_purchase_id, previous_schedule_id,
           abono_amount, abono_type,
           remaining_balance_before, remaining_balance_after,
           installments_count_before, installments_count_after,
           proof_file_path, proof_cloudinary_url, proof_cloudinary_public_id, processed_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING id`,
        [
          clientId, purchaseId, activeSchedule.id,
          netAbonoAmount, abonoType,
          remainingBalance, newBalance,
          pendingCount, newSchedule.length,
          proofFileUrl, proofFileUrl, proofPublicId,
          processedBy
        ]
      );
      const abonoId = abonoRes.rows[0].id;

      // 5c. Create NEW payment_schedule (cabecera) with the recalculated balance
      const newScheduleRes = await client.query(
        `INSERT INTO payment_schedules
           (property_purchase_id, client_id, total_amount, installments_count, is_active, abono_id)
         VALUES ($1, $2, $3, $4, true, $5)
         RETURNING id`,
        [purchaseId, clientId, newBalance, newSchedule.length, abonoId]
      );
      const newScheduleId = newScheduleRes.rows[0].id;

      // 5d. Link abono → new_schedule_id
      await client.query(
        `UPDATE abonos SET new_schedule_id = $1 WHERE id = $2`,
        [newScheduleId, abonoId]
      );

      // 5e. Insert new installments referencing the new schedule
      for (const s of newSchedule) {
        await client.query(
          `INSERT INTO installments
             (payment_schedule_id, property_purchase_id, client_id, installment_number, amount, due_date, status)
           VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
          [newScheduleId, purchaseId, clientId, s.installment_number, s.amount, s.due_date.toISOString().split('T')[0]]
        );
      }

      // 5f. Insert the abono as a payment record (visible in the payments list)
      await client.query(
        `INSERT INTO payments
           (installment_id, client_id, amount, payment_method,
            reference_number, proof_file_path, proof_cloudinary_url,
            proof_cloudinary_public_id, status, notes, payment_date)
         VALUES (NULL, $1, $2, 'abono_capital',
                 $3, $4, $5, $6, 'approved',
                 $7, CURRENT_TIMESTAMP)`,
        [
          clientId,
          netAbonoAmount,
          `ABONO-${abonoId}`,
          proofFileUrl,
          proofFileUrl,
          proofPublicId,
          `Abono de capital #${abonoId}. Tipo: ${abonoType === 'reduce_amount' ? 'reducir monto de cuotas' : 'reducir plazo'}.`
        ]
      );

      await client.query('COMMIT');

      return {
        abonoId,
        abonoType,
        abonoAmount: netAbonoAmount,
        previousScheduleId: activeSchedule.id,
        newScheduleId,
        remainingBalanceBefore: remainingBalance,
        remainingBalanceAfter: newBalance,
        installmentsCountBefore: pendingCount,
        installmentsCountAfter: newSchedule.length,
        proofUrl: proofFileUrl,
        newSchedule
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get abono history for a purchase.
   */
  async getAbonosByPurchase(purchaseId) {
    const res = await query(
      `SELECT a.*,
              u.first_name || ' ' || u.last_name AS processed_by_name,
              ps_old.total_amount AS old_schedule_total,
              ps_new.total_amount AS new_schedule_total
       FROM abonos a
       LEFT JOIN users u ON a.processed_by = u.id
       LEFT JOIN payment_schedules ps_old ON a.previous_schedule_id = ps_old.id
       LEFT JOIN payment_schedules ps_new ON a.new_schedule_id = ps_new.id
       WHERE a.property_purchase_id = $1
       ORDER BY a.created_at DESC`,
      [purchaseId]
    );
    return res.rows;
  }

  /**
   * Get all payment schedules for a purchase (active + historical).
   */
  async getSchedulesByPurchase(purchaseId) {
    const res = await query(
      `SELECT ps.*,
              a.abono_amount,
              a.abono_type
       FROM payment_schedules ps
       LEFT JOIN abonos a ON ps.abono_id = a.id
       WHERE ps.property_purchase_id = $1
       ORDER BY ps.created_at DESC`,
      [purchaseId]
    );
    return res.rows;
  }
}

module.exports = new AbonoService();
