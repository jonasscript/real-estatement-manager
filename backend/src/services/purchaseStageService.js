const { query } = require('../config/database');
const cloudinaryService = require('./cloudinaryService');

class PurchaseStageService {
  normalizeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  normalizeBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    return ['true', '1', 'yes', 'si'].includes(String(value).toLowerCase());
  }

  getUserRealEstateId(user, explicitRealEstateId = null) {
    if (user.role_name === 'system_admin' && explicitRealEstateId) {
      return explicitRealEstateId;
    }
    return user.real_estate_id || user.realEstateId || null;
  }

  async getPurchaseGroupSupport(dbClient = null) {
    const executor = dbClient || { query };
    const result = await executor.query(
      `SELECT
         EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = 'purchase_groups'
         ) AS has_groups,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'property_purchases' AND column_name = 'purchase_group_id'
         ) AS has_purchase_group_id,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'client_purchase_stages' AND column_name = 'purchase_group_id'
         ) AS has_stage_group_id,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'payment_schedules' AND column_name = 'purchase_group_id'
         ) AS has_schedule_group_id,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'installments' AND column_name = 'purchase_group_id'
         ) AS has_installment_group_id,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'installments' AND column_name = 'installment_type'
         ) AS has_installment_type,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'installments' AND column_name = 'display_label'
         ) AS has_installment_display_label,
         EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'installments' AND column_name = 'display_order'
         ) AS has_installment_display_order`
    );
    return result.rows[0] || {};
  }

  async assertPurchaseAccess(purchaseId, user) {
    const result = await query(
      `SELECT pp.*, c.assigned_seller_id, s.user_id AS seller_user_id
       FROM property_purchases pp
       JOIN clients c ON pp.client_id = c.id
       LEFT JOIN sellers s ON c.assigned_seller_id = s.id
       WHERE pp.id = $1`,
      [purchaseId]
    );

    if (result.rows.length === 0) {
      throw new Error('Property purchase not found');
    }

    const purchase = result.rows[0];
    if (user.role_name === 'system_admin') return purchase;
    if (user.role_name === 'real_estate_admin' && Number(purchase.real_estate_id) === Number(user.real_estate_id)) return purchase;
    if (user.role_name === 'seller' && Number(purchase.seller_user_id) === Number(user.id)) return purchase;
    if (user.role_name === 'client') {
      const client = await query('SELECT id FROM clients WHERE user_id = $1', [user.id]);
      if (Number(client.rows[0]?.id) === Number(purchase.client_id)) return purchase;
    }

    throw new Error('Access denied to this purchase');
  }

  async getDefinitions(filters, user) {
    const realEstateId = this.getUserRealEstateId(user, filters.realEstateId);
    if (!realEstateId && user.role_name !== 'system_admin') {
      throw new Error('No real estate associated with your account');
    }

    const params = [];
    let where = 'WHERE 1=1';
    if (realEstateId) {
      params.push(realEstateId);
      where += ` AND psd.real_estate_id = $${params.length}`;
    }
    if (filters.isActive !== undefined) {
      params.push(filters.isActive);
      where += ` AND psd.is_active = $${params.length}`;
    }

    const result = await query(
      `SELECT psd.*, re.name AS real_estate_name
       FROM purchase_stage_definitions psd
       JOIN real_estates re ON psd.real_estate_id = re.id
       ${where}
       ORDER BY psd.sort_order ASC, psd.id ASC`,
      params
    );
    return result.rows;
  }

  async createDefinition(data, user) {
    const realEstateId = this.getUserRealEstateId(user, data.realEstateId);
    if (!realEstateId) {
      throw new Error('No real estate associated with your account');
    }

    const result = await query(
      `INSERT INTO purchase_stage_definitions (
         real_estate_id, name, description, sort_order, value_type, value,
         requires_payment, requires_approval, blocks_next_stage, is_active
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        realEstateId,
        data.name,
        data.description || null,
        this.normalizeNumber(data.sortOrder, 1),
        data.valueType || 'fixed_amount',
        this.normalizeNumber(data.value, 0),
        this.normalizeBoolean(data.requiresPayment, true),
        this.normalizeBoolean(data.requiresApproval, true),
        this.normalizeBoolean(data.blocksNextStage, true),
        this.normalizeBoolean(data.isActive, true),
      ]
    );
    return result.rows[0];
  }

  async updateDefinition(definitionId, data, user) {
    const current = await query('SELECT * FROM purchase_stage_definitions WHERE id = $1', [definitionId]);
    if (current.rows.length === 0) throw new Error('Stage definition not found');
    if (user.role_name !== 'system_admin' && Number(current.rows[0].real_estate_id) !== Number(user.real_estate_id)) {
      throw new Error('Access denied to this stage definition');
    }

    const result = await query(
      `UPDATE purchase_stage_definitions
       SET name = $1, description = $2, sort_order = $3, value_type = $4, value = $5,
           requires_payment = $6, requires_approval = $7, blocks_next_stage = $8,
           is_active = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        data.name,
        data.description || null,
        this.normalizeNumber(data.sortOrder, current.rows[0].sort_order),
        data.valueType || current.rows[0].value_type,
        this.normalizeNumber(data.value, current.rows[0].value),
        this.normalizeBoolean(data.requiresPayment, current.rows[0].requires_payment),
        this.normalizeBoolean(data.requiresApproval, current.rows[0].requires_approval),
        this.normalizeBoolean(data.blocksNextStage, current.rows[0].blocks_next_stage),
        this.normalizeBoolean(data.isActive, current.rows[0].is_active),
        definitionId,
      ]
    );
    return result.rows[0];
  }

  async deleteDefinition(definitionId, user) {
    const current = await query('SELECT * FROM purchase_stage_definitions WHERE id = $1', [definitionId]);
    if (current.rows.length === 0) throw new Error('Stage definition not found');
    if (user.role_name !== 'system_admin' && Number(current.rows[0].real_estate_id) !== Number(user.real_estate_id)) {
      throw new Error('Access denied to this stage definition');
    }

    const result = await query(
      `UPDATE purchase_stage_definitions
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [definitionId]
    );
    return result.rows[0];
  }

  async getPropertyOverrides(propertyId, user) {
    await this.assertPropertyAccess(propertyId, user);
    const result = await query(
      `SELECT psd.id AS stage_definition_id, psd.name, psd.sort_order,
              psd.value_type AS default_value_type, psd.value AS default_value,
              psd.requires_payment AS default_requires_payment,
              psd.requires_approval AS default_requires_approval,
              psd.blocks_next_stage AS default_blocks_next_stage,
              pso.id AS override_id, pso.value_type, pso.value,
              pso.requires_payment, pso.requires_approval, pso.blocks_next_stage,
              COALESCE(pso.is_active, psd.is_active) AS is_active
       FROM properties p
       JOIN property_models pm ON p.property_model_id = pm.id
       JOIN purchase_stage_definitions psd ON psd.real_estate_id = pm.real_estate_id
       LEFT JOIN property_stage_overrides pso
         ON pso.property_id = p.id AND pso.stage_definition_id = psd.id
       WHERE p.id = $1
       ORDER BY psd.sort_order ASC, psd.id ASC`,
      [propertyId]
    );
    return result.rows;
  }

  async updatePropertyOverrides(propertyId, overrides, user) {
    await this.assertPropertyAccess(propertyId, user);
    for (const override of overrides) {
      await query(
        `INSERT INTO property_stage_overrides (
           property_id, stage_definition_id, value_type, value,
           requires_payment, requires_approval, blocks_next_stage, is_active
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (property_id, stage_definition_id)
         DO UPDATE SET value_type = EXCLUDED.value_type,
                       value = EXCLUDED.value,
                       requires_payment = EXCLUDED.requires_payment,
                       requires_approval = EXCLUDED.requires_approval,
                       blocks_next_stage = EXCLUDED.blocks_next_stage,
                       is_active = EXCLUDED.is_active,
                       updated_at = CURRENT_TIMESTAMP`,
        [
          propertyId,
          override.stageDefinitionId,
          override.valueType || null,
          override.value === undefined || override.value === '' ? null : Number(override.value),
          override.requiresPayment === undefined ? null : this.normalizeBoolean(override.requiresPayment),
          override.requiresApproval === undefined ? null : this.normalizeBoolean(override.requiresApproval),
          override.blocksNextStage === undefined ? null : this.normalizeBoolean(override.blocksNextStage),
          this.normalizeBoolean(override.isActive, true),
        ]
      );
    }
    return this.getPropertyOverrides(propertyId, user);
  }

  async assertPropertyAccess(propertyId, user) {
    const result = await query(
      `SELECT p.id, pm.real_estate_id
       FROM properties p
       JOIN property_models pm ON p.property_model_id = pm.id
       WHERE p.id = $1`,
      [propertyId]
    );
    if (result.rows.length === 0) throw new Error('Property not found');
    if (user.role_name === 'system_admin') return result.rows[0];
    if (Number(result.rows[0].real_estate_id) === Number(user.real_estate_id)) return result.rows[0];
    throw new Error('Access denied to this property');
  }

  async instantiateStagesForPurchase(dbClient, purchaseId) {
    const support = await this.getPurchaseGroupSupport(dbClient);
    const hasGroupSupport = support.has_groups && support.has_purchase_group_id;
    const purchaseResult = await dbClient.query(
      hasGroupSupport
        ? `SELECT pp.id, pp.client_id, pp.property_id, COALESCE(pp.final_price, p.custom_price) AS final_price,
                  pp.real_estate_id, pp.purchase_group_id,
                  pg.mode AS purchase_group_mode, pg.total_price AS purchase_group_total_price
           FROM property_purchases pp
           JOIN properties p ON pp.property_id = p.id
           LEFT JOIN purchase_groups pg ON pp.purchase_group_id = pg.id
           WHERE pp.id = $1`
        : `SELECT pp.id, pp.client_id, pp.property_id, COALESCE(pp.final_price, p.custom_price) AS final_price,
                  pp.real_estate_id, NULL::integer AS purchase_group_id,
                  'individual'::text AS purchase_group_mode, NULL::numeric AS purchase_group_total_price
           FROM property_purchases pp
           JOIN properties p ON pp.property_id = p.id
           WHERE pp.id = $1`,
      [purchaseId]
    );
    if (purchaseResult.rows.length === 0) throw new Error('Property purchase not found');
    const purchase = purchaseResult.rows[0];
    const usePropertyOverrides = purchase.purchase_group_mode !== 'unified';
    const calculationBase = purchase.purchase_group_mode === 'unified'
      ? Number(purchase.purchase_group_total_price || purchase.final_price || 0)
      : Number(purchase.final_price || 0);

    const definitions = await dbClient.query(
      `SELECT psd.id, psd.name, psd.description, psd.sort_order,
              COALESCE(pso.value_type, psd.value_type) AS value_type,
              COALESCE(pso.value, psd.value) AS value,
              COALESCE(pso.requires_payment, psd.requires_payment) AS requires_payment,
              COALESCE(pso.requires_approval, psd.requires_approval) AS requires_approval,
              COALESCE(pso.blocks_next_stage, psd.blocks_next_stage) AS blocks_next_stage,
              COALESCE(pso.is_active, psd.is_active) AS is_active
       FROM purchase_stage_definitions psd
       LEFT JOIN property_stage_overrides pso
         ON pso.stage_definition_id = psd.id AND pso.property_id = $1 AND $3 = true
       WHERE psd.real_estate_id = $2
         AND COALESCE(pso.is_active, psd.is_active) = true
       ORDER BY psd.sort_order ASC, psd.id ASC`,
      [purchase.property_id, purchase.real_estate_id, usePropertyOverrides]
    );

    for (const stage of definitions.rows) {
      const amountDue = stage.value_type === 'percentage'
        ? (calculationBase * Number(stage.value)) / 100
        : Number(stage.value);
      const initialStatus = stage.requires_payment ? 'pending' : 'completed';
      const values = [
        purchase.client_id,
        purchase.id,
        stage.id,
        stage.name,
        stage.description,
        stage.sort_order,
        stage.value_type,
        stage.value,
        Number(amountDue.toFixed(2)),
        stage.requires_payment,
        stage.requires_approval,
        stage.blocks_next_stage,
        initialStatus,
        initialStatus === 'completed' ? new Date() : null,
      ];
      if (support.has_stage_group_id) {
        await dbClient.query(
          `INSERT INTO client_purchase_stages (
             client_id, purchase_group_id, property_purchase_id, stage_definition_id, name, description,
             sort_order, value_type, value, amount_due, requires_payment,
             requires_approval, blocks_next_stage, status, completed_at
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
          [purchase.client_id, purchase.purchase_group_id || null, ...values.slice(1)]
        );
      } else {
        await dbClient.query(
          `INSERT INTO client_purchase_stages (
             client_id, property_purchase_id, stage_definition_id, name, description,
             sort_order, value_type, value, amount_due, requires_payment,
             requires_approval, blocks_next_stage, status, completed_at
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          values
        );
      }
    }
  }

  async getStagesForPurchase(clientId, purchaseId, user) {
    const purchase = await this.assertPurchaseAccess(purchaseId, user);
    const support = await this.getPurchaseGroupSupport();
    const hasStageGroupSupport = support.has_stage_group_id && support.has_purchase_group_id;
    const result = await query(
      `SELECT cps.*, COALESCE(payment_totals.approved_amount, 0) AS approved_paid_amount,
              COALESCE(payment_totals.pending_amount, 0) AS pending_paid_amount
       FROM client_purchase_stages cps
       LEFT JOIN (
         SELECT purchase_stage_id,
                SUM(amount) FILTER (WHERE status = 'approved') AS approved_amount,
                SUM(amount) FILTER (WHERE status = 'pending') AS pending_amount
         FROM payments
         WHERE payment_type = 'purchase_stage'
         GROUP BY purchase_stage_id
       ) payment_totals ON payment_totals.purchase_stage_id = cps.id
       WHERE cps.client_id = $1
         AND ${hasStageGroupSupport ? `(
           (cps.purchase_group_id IS NOT NULL AND cps.purchase_group_id = $2)
           OR (cps.purchase_group_id IS NULL AND cps.property_purchase_id = $3)
         )` : 'cps.property_purchase_id = $2'}
       ORDER BY cps.sort_order ASC, cps.id ASC`,
      hasStageGroupSupport ? [clientId, purchase.purchase_group_id || null, purchaseId] : [clientId, purchaseId]
    );
    return result.rows;
  }

  async createStagePayment(stageId, paymentData, fileBuffer, fileInfo, user) {
    const support = await this.getPurchaseGroupSupport();
    const hasStageGroupSupport = support.has_stage_group_id && support.has_purchase_group_id;
    const stageResult = await query(
      hasStageGroupSupport
        ? `SELECT cps.*, pp.real_estate_id, pp.commercial_status, pp.purchase_group_id AS pp_purchase_group_id,
                  c.assigned_seller_id, s.user_id AS seller_user_id
           FROM client_purchase_stages cps
           JOIN property_purchases pp ON cps.property_purchase_id = pp.id
           JOIN clients c ON cps.client_id = c.id
           LEFT JOIN sellers s ON c.assigned_seller_id = s.id
           WHERE cps.id = $1`
        : `SELECT cps.*, pp.real_estate_id, pp.commercial_status, NULL::integer AS pp_purchase_group_id,
                  c.assigned_seller_id, s.user_id AS seller_user_id
           FROM client_purchase_stages cps
           JOIN property_purchases pp ON cps.property_purchase_id = pp.id
           JOIN clients c ON cps.client_id = c.id
           LEFT JOIN sellers s ON c.assigned_seller_id = s.id
           WHERE cps.id = $1`,
      [stageId]
    );
    if (stageResult.rows.length === 0) throw new Error('Purchase stage not found');
    const stage = stageResult.rows[0];
    await this.assertPurchaseAccess(stage.property_purchase_id, user);
    const groupId = hasStageGroupSupport ? stage.purchase_group_id || stage.pp_purchase_group_id || null : null;

    const blocking = await query(
      hasStageGroupSupport
        ? `SELECT 1 FROM client_purchase_stages
         WHERE (
           ($1::integer IS NOT NULL AND purchase_group_id = $1)
           OR ($1::integer IS NULL AND property_purchase_id = $2)
         )
         AND sort_order < $3
         AND blocks_next_stage = true
         AND status NOT IN ('completed', 'approved')
       LIMIT 1`
        : `SELECT 1 FROM client_purchase_stages
         WHERE property_purchase_id = $1
           AND sort_order < $2
           AND blocks_next_stage = true
           AND status NOT IN ('completed', 'approved')
         LIMIT 1`,
      hasStageGroupSupport ? [groupId, stage.property_purchase_id, stage.sort_order] : [stage.property_purchase_id, stage.sort_order]
    );
    if (blocking.rows.length > 0) {
      throw new Error('Debes completar las fases anteriores primero');
    }

    let cloudinaryUrl = null;
    let cloudinaryPublicId = null;
    if (fileBuffer && fileInfo) {
      try {
        const uploaded = await cloudinaryService.uploadBuffer(fileBuffer, fileInfo.originalname, fileInfo.mimetype);
        cloudinaryUrl = uploaded.secure_url;
        cloudinaryPublicId = uploaded.public_id;
      } catch (error) {
        console.warn('[Cloudinary] Stage payment upload failed:', error.message);
      }
    }

    const amount = this.normalizeNumber(paymentData.amount, Number(stage.amount_due) - Number(stage.paid_amount || 0));
    const canAutoApprove = ['seller', 'real_estate_admin', 'system_admin'].includes(user.role_name);
    const status = !stage.requires_approval || canAutoApprove ? 'approved' : 'pending';
    const approvedBy = status === 'approved' ? user.id : null;
    const approvedAt = status === 'approved' ? new Date() : null;
    const insert = await query(
      `INSERT INTO payments (
         installment_id, purchase_stage_id, client_id, amount, payment_method,
         reference_number, proof_file_path, proof_cloudinary_url,
         proof_cloudinary_public_id, payment_type, status, approved_by, approved_at, notes
       )
       VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8, 'purchase_stage', $9, $10, $11, $12)
       RETURNING *`,
      [
        stage.id,
        stage.client_id,
        amount,
        paymentData.paymentMethod || 'bank_transfer',
        paymentData.referenceNumber || null,
        cloudinaryUrl || null,
        cloudinaryUrl || null,
        cloudinaryPublicId || null,
        status,
        approvedBy,
        approvedAt,
        paymentData.notes || null,
      ]
    );

    if (status === 'approved') {
      await query(
        `UPDATE client_purchase_stages
         SET status = 'completed',
             paid_amount = COALESCE((
               SELECT SUM(amount) FROM payments
               WHERE purchase_stage_id = $1 AND status = 'approved'
             ), 0),
             completed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [stage.id]
      );
    } else {
      await query(
        `UPDATE client_purchase_stages
         SET status = 'payment_pending', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [stage.id]
      );
    }

    await this.refreshPurchaseProgress(stage.property_purchase_id);
    return insert.rows[0];
  }

  async refreshPurchaseProgress(purchaseId) {
    const support = await this.getPurchaseGroupSupport();
    const hasStageGroupSupport = support.has_stage_group_id && support.has_purchase_group_id;
    const purchaseResult = await query(
      hasStageGroupSupport
        ? `SELECT pp.id, pp.purchase_group_id
           FROM property_purchases pp
           WHERE pp.id = $1`
        : `SELECT pp.id, NULL::integer AS purchase_group_id
           FROM property_purchases pp
           WHERE pp.id = $1`,
      [purchaseId]
    );
    const purchase = purchaseResult.rows[0];
    const groupId = hasStageGroupSupport ? purchase?.purchase_group_id || null : null;
    const totals = await query(
      hasStageGroupSupport
        ? `SELECT COALESCE(SUM(p.amount), 0) AS approved_total
       FROM payments p
       JOIN client_purchase_stages cps ON p.purchase_stage_id = cps.id
       WHERE (
           ($1::integer IS NOT NULL AND cps.purchase_group_id = $1)
           OR ($1::integer IS NULL AND cps.property_purchase_id = $2)
         )
         AND p.payment_type = 'purchase_stage'
         AND p.status = 'approved'`
        : `SELECT COALESCE(SUM(p.amount), 0) AS approved_total
       FROM payments p
       JOIN client_purchase_stages cps ON p.purchase_stage_id = cps.id
       WHERE cps.property_purchase_id = $1
         AND p.payment_type = 'purchase_stage'
         AND p.status = 'approved'`,
      hasStageGroupSupport ? [groupId, purchaseId] : [purchaseId]
    );
    const approvedTotal = Number(totals.rows[0]?.approved_total || 0);

    const stageStatus = await query(
      hasStageGroupSupport
        ? `SELECT
         COUNT(*) FILTER (WHERE blocks_next_stage = true AND status NOT IN ('completed', 'approved')) AS blocking_pending,
         COUNT(*) AS total_stages
       FROM client_purchase_stages
       WHERE (
           ($1::integer IS NOT NULL AND purchase_group_id = $1)
           OR ($1::integer IS NULL AND property_purchase_id = $2)
         )`
        : `SELECT
         COUNT(*) FILTER (WHERE blocks_next_stage = true AND status NOT IN ('completed', 'approved')) AS blocking_pending,
         COUNT(*) AS total_stages
       FROM client_purchase_stages
       WHERE property_purchase_id = $1`,
      hasStageGroupSupport ? [groupId, purchaseId] : [purchaseId]
    );
    const blockingPending = Number(stageStatus.rows[0]?.blocking_pending || 0);
    const totalStages = Number(stageStatus.rows[0]?.total_stages || 0);
    const commercialStatus = totalStages > 0 && blockingPending === 0 ? 'ready_for_schedule' : approvedTotal > 0 ? 'in_process' : 'reserved';

    if (groupId && support.has_groups) {
      await query(
        `UPDATE purchase_groups
         SET stage_paid_amount = $1,
             commercial_status = CASE WHEN commercial_status = 'scheduled' THEN commercial_status ELSE $2 END
         WHERE id = $3`,
        [approvedTotal, commercialStatus, groupId]
      );
      await query(
        `UPDATE property_purchases
         SET stage_paid_amount = $1,
             commercial_status = CASE WHEN commercial_status = 'scheduled' THEN commercial_status ELSE $2 END
         WHERE purchase_group_id = $3`,
        [approvedTotal, commercialStatus, groupId]
      );
    } else {
      await query(
        `UPDATE property_purchases
         SET stage_paid_amount = $1,
             commercial_status = CASE WHEN commercial_status = 'scheduled' THEN commercial_status ELSE $2 END
         WHERE id = $3`,
        [approvedTotal, commercialStatus, purchaseId]
      );
    }
  }

  async markStagePaymentApproved(payment) {
    if (!payment.purchase_stage_id) return;
    const stage = await query(
      'SELECT property_purchase_id FROM client_purchase_stages WHERE id = $1',
      [payment.purchase_stage_id]
    );
    await query(
      `UPDATE client_purchase_stages
       SET status = 'completed',
           paid_amount = COALESCE((
             SELECT SUM(amount) FROM payments
             WHERE purchase_stage_id = $1 AND status = 'approved'
           ), 0),
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [payment.purchase_stage_id]
    );
    if (stage.rows[0]) {
      await this.refreshPurchaseProgress(stage.rows[0].property_purchase_id);
    }
  }

  async markStagePaymentRejected(payment) {
    if (!payment.purchase_stage_id) return;
    const stage = await query(
      'SELECT property_purchase_id FROM client_purchase_stages WHERE id = $1',
      [payment.purchase_stage_id]
    );
    await query(
      `UPDATE client_purchase_stages
       SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [payment.purchase_stage_id]
    );
    if (stage.rows[0]) {
      await this.refreshPurchaseProgress(stage.rows[0].property_purchase_id);
    }
  }

  async generateDownPaymentSchedule(purchaseId, data, user) {
    const purchase = await this.assertPurchaseAccess(purchaseId, user);
    const support = await this.getPurchaseGroupSupport();
    const hasStageGroupSupport = support.has_stage_group_id && support.has_purchase_group_id;
    const hasScheduleGroupSupport = support.has_schedule_group_id && support.has_purchase_group_id;
    const hasInstallmentGroupSupport = support.has_installment_group_id && support.has_purchase_group_id;
    const groupId = support.has_purchase_group_id ? purchase.purchase_group_id || null : null;
    const blocking = await query(
      hasStageGroupSupport
        ? `SELECT COUNT(*) AS pending_count
       FROM client_purchase_stages
       WHERE (
           ($1::integer IS NOT NULL AND purchase_group_id = $1)
           OR ($1::integer IS NULL AND property_purchase_id = $2)
         )
         AND blocks_next_stage = true
         AND status NOT IN ('completed', 'approved')`
        : `SELECT COUNT(*) AS pending_count
       FROM client_purchase_stages
       WHERE property_purchase_id = $1
         AND blocks_next_stage = true
         AND status NOT IN ('completed', 'approved')`,
      hasStageGroupSupport ? [groupId, purchaseId] : [purchaseId]
    );
    if (Number(blocking.rows[0].pending_count) > 0) {
      throw new Error('Debes completar las fases obligatorias antes de generar cuotas');
    }

    const existingSchedule = await query(
      hasScheduleGroupSupport
        ? `SELECT id FROM payment_schedules
       WHERE is_active = true
         AND (
           ($1::integer IS NOT NULL AND purchase_group_id = $1)
           OR ($1::integer IS NULL AND property_purchase_id = $2)
         )
       LIMIT 1`
        : `SELECT id FROM payment_schedules
       WHERE is_active = true
         AND property_purchase_id = $1
       LIMIT 1`,
      hasScheduleGroupSupport ? [groupId, purchaseId] : [purchaseId]
    );
    if (existingSchedule.rows.length > 0) {
      throw new Error('Esta compra ya tiene una tabla de pagos activa');
    }

    const groupResult = groupId && support.has_groups
      ? await query('SELECT * FROM purchase_groups WHERE id = $1', [groupId])
      : { rows: [] };
    const purchaseGroup = groupResult.rows[0] || null;
    const downPaymentPercentage = this.normalizeNumber(data.downPaymentPercentage, Number(purchaseGroup?.final_down_payment_percentage ?? purchase.final_down_payment_percentage ?? 0));
    const installmentsCount = Math.trunc(this.normalizeNumber(data.installmentsCount, Number(purchaseGroup?.final_installments ?? purchase.final_installments ?? 0)));
    const firstInstallmentDate = data.firstInstallmentDate;
    if (!firstInstallmentDate) throw new Error('First installment date is required');
    if (downPaymentPercentage < 0 || downPaymentPercentage > 100) throw new Error('Invalid down payment percentage');

    const finalPrice = Number(purchaseGroup?.total_price ?? purchase.final_price ?? 0);
    const downPaymentAmount = Number(((finalPrice * downPaymentPercentage) / 100).toFixed(2));
    const stagePaid = Number(purchaseGroup?.stage_paid_amount ?? purchase.stage_paid_amount ?? 0);
    const remaining = Number(Math.max(downPaymentAmount - stagePaid, 0).toFixed(2));

    const client = await require('../config/database').pool.connect();
    try {
      await client.query('BEGIN');

      let scheduleId = null;
      if (remaining > 0) {
        if (!installmentsCount || installmentsCount < 1) {
          throw new Error('Installments count must be greater than zero');
        }
        const schedule = await client.query(
          hasScheduleGroupSupport
            ? `INSERT INTO payment_schedules
             (purchase_group_id, property_purchase_id, client_id, total_amount, installments_count, is_active)
           VALUES ($1,$2,$3,$4,$5,true)
           RETURNING id`
            : `INSERT INTO payment_schedules
             (property_purchase_id, client_id, total_amount, installments_count, is_active)
           VALUES ($1,$2,$3,$4,true)
           RETURNING id`,
          hasScheduleGroupSupport
            ? [groupId, purchaseId, purchase.client_id, remaining, installmentsCount]
            : [purchaseId, purchase.client_id, remaining, installmentsCount]
        );
        scheduleId = schedule.rows[0].id;

        const baseAmount = Math.floor((remaining / installmentsCount) * 100) / 100;
        let accumulated = 0;
        const start = new Date(firstInstallmentDate);
        for (let i = 1; i <= installmentsCount; i++) {
          const dueDate = new Date(start);
          dueDate.setMonth(start.getMonth() + (i - 1));
          const amount = i === installmentsCount
            ? Number((remaining - accumulated).toFixed(2))
            : baseAmount;
          accumulated = Number((accumulated + amount).toFixed(2));
          const dueDateValue = dueDate.toISOString().split('T')[0];
          if (hasInstallmentGroupSupport && support.has_installment_type && support.has_installment_display_label && support.has_installment_display_order) {
            await client.query(
              `INSERT INTO installments (
                 payment_schedule_id, client_id, purchase_group_id, property_purchase_id, installment_number,
                 amount, due_date, status, installment_type, display_label, display_order
               )
               VALUES ($1,$2,$3,$4,$5,$6,$7,'pending','down_payment_balance',$8,$9)`,
              [
                scheduleId,
                purchase.client_id,
                groupId,
                purchaseId,
                i,
                amount,
                dueDateValue,
                `Entrada ${i}`,
                i,
              ]
            );
          } else if (support.has_installment_type && support.has_installment_display_label && support.has_installment_display_order) {
            await client.query(
              `INSERT INTO installments (
                 payment_schedule_id, client_id, property_purchase_id, installment_number,
                 amount, due_date, status, installment_type, display_label, display_order
               )
               VALUES ($1,$2,$3,$4,$5,$6,'pending','down_payment_balance',$7,$8)`,
              [
                scheduleId,
                purchase.client_id,
                purchaseId,
                i,
                amount,
                dueDateValue,
                `Entrada ${i}`,
                i,
              ]
            );
          } else {
            await client.query(
              `INSERT INTO installments (
                 payment_schedule_id, client_id, property_purchase_id, installment_number,
                 amount, due_date, status
               )
               VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
              [
                scheduleId,
                purchase.client_id,
                purchaseId,
                i,
                amount,
                dueDateValue,
              ]
            );
          }
        }
      }

      if (groupId && support.has_groups) {
        await client.query(
          `UPDATE purchase_groups
           SET final_down_payment_percentage = $1,
               final_installments = $2,
               down_payment_amount = $3,
               remaining_down_payment_amount = $4,
               commercial_status = 'scheduled'
           WHERE id = $5`,
          [downPaymentPercentage, installmentsCount, downPaymentAmount, remaining, groupId]
        );
        await client.query(
          `UPDATE property_purchases
           SET final_down_payment_percentage = $1,
               final_installments = $2,
               down_payment_percentage = $1,
               down_payment_amount = $3,
               remaining_down_payment_amount = $4,
               commercial_status = 'scheduled'
           WHERE purchase_group_id = $5`,
          [downPaymentPercentage, installmentsCount, downPaymentAmount, remaining, groupId]
        );
      } else {
        await client.query(
          `UPDATE property_purchases
           SET final_down_payment_percentage = $1,
               final_installments = $2,
               down_payment_percentage = $1,
               down_payment_amount = $3,
               remaining_down_payment_amount = $4,
               commercial_status = 'scheduled'
           WHERE id = $5`,
          [downPaymentPercentage, installmentsCount, downPaymentAmount, remaining, purchaseId]
        );
      }

      await client.query('COMMIT');
      return { scheduleId, downPaymentAmount, stagePaid, remainingDownPaymentAmount: remaining };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new PurchaseStageService();
