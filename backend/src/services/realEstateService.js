const { query } = require('../config/database');

class RealEstateService {
  normalizeOptionalText(value) {
    const normalized = String(value ?? '').trim();
    return normalized || null;
  }

  // Get all real estates
  async getAllRealEstates() {
    try {
      const queryText = `
        SELECT re.*, u.first_name as created_by_first_name, u.last_name as created_by_last_name
        FROM real_estates re
        LEFT JOIN users u ON re.created_by = u.id
        ORDER BY re.created_at DESC
      `;
      const result = await query(queryText);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get real estate by ID
  async getRealEstateById(realEstateId) {
    try {
      const queryText = `
        SELECT re.*, u.first_name as created_by_first_name, u.last_name as created_by_last_name
        FROM real_estates re
        LEFT JOIN users u ON re.created_by = u.id
        WHERE re.id = $1
      `;
      const result = await query(queryText, [realEstateId]);

      if (result.rows.length === 0) {
        throw new Error('Real estate not found');
      }

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Create new real estate
  async createRealEstate(realEstateData, createdBy) {
    try {
      const {
        name,
        address,
        city,
        country,
        phone,
        email,
        ses_sender_email,
        ses_sender_domain,
      } = realEstateData;

      const insertQuery = `
        INSERT INTO real_estates (
          name, address, city, country, phone, email,
          ses_sender_email, ses_sender_domain, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const insertResult = await query(insertQuery, [
        name,
        address,
        city,
        country,
        this.normalizeOptionalText(phone),
        this.normalizeOptionalText(email),
        this.normalizeOptionalText(ses_sender_email)?.toLowerCase() || null,
        this.normalizeOptionalText(ses_sender_domain)?.replace(/^@/, '').toLowerCase() || null,
        createdBy,
      ]);

      return insertResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update real estate
  async updateRealEstate(realEstateId, updateData) {
    try {
      const {
        name,
        address,
        city,
        country,
        phone,
        email,
        ses_sender_email,
        ses_sender_domain,
      } = updateData;

      const updateQuery = `
        UPDATE real_estates
        SET name = $1,
            address = $2,
            city = $3,
            country = $4,
            phone = $5,
            email = $6,
            ses_sender_email = $7,
            ses_sender_domain = $8,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
        RETURNING *
      `;
      const updateResult = await query(updateQuery, [
        name,
        address,
        city,
        country,
        this.normalizeOptionalText(phone),
        this.normalizeOptionalText(email),
        this.normalizeOptionalText(ses_sender_email)?.toLowerCase() || null,
        this.normalizeOptionalText(ses_sender_domain)?.replace(/^@/, '').toLowerCase() || null,
        realEstateId,
      ]);

      if (updateResult.rows.length === 0) {
        throw new Error('Real estate not found');
      }

      return updateResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete real estate
  async deleteRealEstate(realEstateId) {
    try {
      // Check if real estate has associated clients or property models
      const checkQuery = `
        SELECT
          (SELECT COUNT(*) FROM clients WHERE real_estate_id = $1) as client_count,
          (SELECT COUNT(*) FROM property_models WHERE real_estate_id = $1) as property_model_count,
          (SELECT COUNT(*) FROM sellers WHERE real_estate_id = $1) as seller_count
      `;
      const checkResult = await query(checkQuery, [realEstateId]);
      const { client_count, property_count } = checkResult.rows[0];

      if (parseInt(client_count) > 0 || parseInt(property_model_count) > 0) {
        throw new Error('Cannot delete real estate with associated clients or property models');
      }

      const deleteQuery = 'DELETE FROM real_estates WHERE id = $1 RETURNING *';
      const deleteResult = await query(deleteQuery, [realEstateId]);

      if (deleteResult.rows.length === 0) {
        throw new Error('Real estate not found');
      }

      return deleteResult.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get real estate statistics
  async getRealEstateStatistics(realEstateId = null) {
    try {
      let whereClause = '';
      const params = [];

      if (realEstateId) {
        whereClause = 'WHERE re.id = $1';
        params.push(realEstateId);
      }

      const statsQuery = `
        SELECT
          re.id,
          re.name,
          COALESCE(properties.property_count, 0) as property_count,
          COALESCE(properties.property_model_count, 0) as property_model_count,
          COALESCE(properties.inventory_value, 0) as inventory_value,
          COALESCE(properties.available_properties_count, 0) as available_properties_count,
          COALESCE(properties.reserved_properties_count, 0) as reserved_properties_count,
          COALESCE(properties.sold_properties_count, 0) as sold_properties_count,
          COALESCE(properties.available_inventory_value, 0) as available_inventory_value,
          COALESCE(clients.client_count, 0) as client_count,
          COALESCE(clients.signed_contracts_count, 0) as signed_contracts_count,
          COALESCE(sellers.seller_count, 0) as seller_count,
          COALESCE(sellers.active_seller_count, 0) as active_seller_count,
          COALESCE(sales.purchase_count, 0) as purchase_count,
          COALESCE(sales.total_sales_amount, 0) as total_sales_amount,
          COALESCE(sales.total_down_payments, 0) as total_down_payments,
          COALESCE(payments.approved_payments_amount, 0) as approved_payments_amount,
          COALESCE(payments.pending_payments_count, 0) as pending_payments_count,
          COALESCE(payments.overdue_installments_count, 0) as overdue_installments_count,
          GREATEST(COALESCE(sales.total_down_payments, 0) - COALESCE(payments.approved_payments_amount, 0), 0) as total_remaining_balance,
          COALESCE(monthly_sales.monthly_sales, '[]'::json) as monthly_sales,
          COALESCE(status_distribution.status_distribution, '[]'::json) as status_distribution,
          COALESCE(seller_performance.seller_performance, '[]'::json) as seller_performance,
          COALESCE(top_models.top_models, '[]'::json) as top_models
        FROM real_estates re
        LEFT JOIN LATERAL (
          SELECT
            COUNT(DISTINCT p.id) as property_count,
            (SELECT COUNT(*) FROM property_models pm_all WHERE pm_all.real_estate_id = re.id) as property_model_count,
            COALESCE(SUM(COALESCE(p.custom_price, 0)), 0) as inventory_value,
            COUNT(*) FILTER (WHERE p.sale_status = 'available') as available_properties_count,
            COUNT(*) FILTER (WHERE p.sale_status = 'reserved') as reserved_properties_count,
            COUNT(*) FILTER (WHERE p.sale_status = 'sold') as sold_properties_count,
            COALESCE(SUM(CASE WHEN p.sale_status = 'available' THEN COALESCE(p.custom_price, 0) ELSE 0 END), 0) as available_inventory_value
          FROM properties p
          JOIN units u ON p.unit_id = u.id
          JOIN blocks b ON u.block_id = b.id
          JOIN phases ph ON b.phase_id = ph.id
          WHERE ph.real_estate_id = re.id
        ) properties ON true
        LEFT JOIN LATERAL (
          SELECT
            COUNT(DISTINCT c.id) as client_count,
            COUNT(DISTINCT c.id) FILTER (WHERE c.contract_signed = true) as signed_contracts_count
          FROM clients c
          JOIN users u ON c.user_id = u.id
          WHERE u.real_estate_id = re.id
        ) clients ON true
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*) as seller_count,
            COUNT(*) FILTER (WHERE s.is_active = true) as active_seller_count
          FROM sellers s
          JOIN users u ON s.user_id = u.id
          WHERE u.real_estate_id = re.id
        ) sellers ON true
        LEFT JOIN LATERAL (
          SELECT
            COUNT(DISTINCT pp.id) as purchase_count,
            COALESCE(SUM(COALESCE(pp.final_price, p.custom_price, 0)), 0) as total_sales_amount,
            COALESCE(SUM(COALESCE(active_schedule.total_amount, COALESCE(pp.final_price, p.custom_price, 0) * COALESCE(pp.final_down_payment_percentage, 0) / 100.0)), 0) as total_down_payments
          FROM property_purchases pp
          JOIN properties p ON pp.property_id = p.id
          LEFT JOIN LATERAL (
            SELECT ps.total_amount
            FROM payment_schedules ps
            WHERE ps.property_purchase_id = pp.id AND ps.is_active = true
            ORDER BY ps.created_at DESC
            LIMIT 1
          ) active_schedule ON true
          WHERE pp.real_estate_id = re.id
        ) sales ON true
        LEFT JOIN LATERAL (
          SELECT
            COALESCE(SUM(CASE WHEN pay.status = 'approved' THEN pay.amount ELSE 0 END), 0) as approved_payments_amount,
            COUNT(*) FILTER (WHERE pay.status = 'pending') as pending_payments_count,
            COUNT(DISTINCT i.id) FILTER (WHERE i.status IN ('overdue', 'late')) as overdue_installments_count
          FROM property_purchases pp
          LEFT JOIN installments i ON i.property_purchase_id = pp.id
          LEFT JOIN payments pay ON pay.installment_id = i.id
          WHERE pp.real_estate_id = re.id
        ) payments ON true
        LEFT JOIN LATERAL (
          SELECT json_agg(month_row ORDER BY month_row.month_start) as monthly_sales
          FROM (
            SELECT
              month_series.month_start,
              EXTRACT(MONTH FROM month_series.month_start)::int as month_number,
              TO_CHAR(month_series.month_start, 'YYYY-MM') as month_key,
              COUNT(pp.id)::int as sales_count,
              COALESCE(SUM(COALESCE(pp.final_price, p.custom_price, 0)), 0) as sales_amount
            FROM generate_series(
              date_trunc('month', CURRENT_DATE) - interval '5 months',
              date_trunc('month', CURRENT_DATE),
              interval '1 month'
            ) month_series(month_start)
            LEFT JOIN property_purchases pp
              ON pp.real_estate_id = re.id
             AND date_trunc('month', COALESCE(pp.purchase_date, pp.created_at)::date) = month_series.month_start
            LEFT JOIN properties p ON pp.property_id = p.id
            GROUP BY month_series.month_start
          ) month_row
        ) monthly_sales ON true
        LEFT JOIN LATERAL (
          SELECT json_agg(status_row ORDER BY status_row.count DESC, status_row.status_name) as status_distribution
          FROM (
            SELECT
              COALESCE(ps.name, 'Sin estado') as status_name,
              COALESCE(ps.color, '#64748b') as status_color,
              COUNT(p.id)::int as count,
              COALESCE(SUM(COALESCE(p.custom_price, 0)), 0) as amount
            FROM properties p
            JOIN units u ON p.unit_id = u.id
            JOIN blocks b ON u.block_id = b.id
            JOIN phases ph ON b.phase_id = ph.id
            LEFT JOIN property_status ps ON p.property_status_id = ps.id
            WHERE ph.real_estate_id = re.id
            GROUP BY ps.name, ps.color
          ) status_row
        ) status_distribution ON true
        LEFT JOIN LATERAL (
          SELECT json_agg(seller_row ORDER BY seller_row.total_sales_amount DESC, seller_row.seller_name) as seller_performance
          FROM (
            SELECT
              s.id,
              TRIM(CONCAT(u.first_name, ' ', u.last_name)) as seller_name,
              u.email,
              s.commission_rate,
              s.is_active,
              COALESCE(client_stats.clients_count, 0) as clients_count,
              COALESCE(sale_stats.sales_count, 0) as sales_count,
              COALESCE(sale_stats.total_sales_amount, 0) as total_sales_amount,
              COALESCE(sale_stats.total_down_payments, 0) as total_down_payments,
              COALESCE(sale_stats.total_sales_amount, 0) * COALESCE(s.commission_rate, 0) / 100.0 as estimated_commission
            FROM sellers s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN LATERAL (
              SELECT COUNT(DISTINCT c.id)::int as clients_count
              FROM clients c
              JOIN users cu ON c.user_id = cu.id
              WHERE c.assigned_seller_id = s.id AND cu.real_estate_id = re.id
            ) client_stats ON true
            LEFT JOIN LATERAL (
              SELECT
                COUNT(DISTINCT pp.id)::int as sales_count,
                COALESCE(SUM(COALESCE(pp.final_price, p.custom_price, 0)), 0) as total_sales_amount,
                COALESCE(SUM(COALESCE(active_schedule.total_amount, COALESCE(pp.final_price, p.custom_price, 0) * COALESCE(pp.final_down_payment_percentage, 0) / 100.0)), 0) as total_down_payments
              FROM property_purchases pp
              JOIN properties p ON pp.property_id = p.id
              LEFT JOIN LATERAL (
                SELECT ps.total_amount
                FROM payment_schedules ps
                WHERE ps.property_purchase_id = pp.id AND ps.is_active = true
                ORDER BY ps.created_at DESC
                LIMIT 1
              ) active_schedule ON true
              WHERE pp.seller_id = s.id AND pp.real_estate_id = re.id
            ) sale_stats ON true
            WHERE u.real_estate_id = re.id
            ORDER BY total_sales_amount DESC, seller_name
            LIMIT 6
          ) seller_row
        ) seller_performance ON true
        LEFT JOIN LATERAL (
          SELECT json_agg(model_row ORDER BY model_row.sales_amount DESC, model_row.model_name) as top_models
          FROM (
            SELECT
              pm.name as model_name,
              COUNT(DISTINCT pp.id)::int as sales_count,
              COALESCE(SUM(COALESCE(pp.final_price, p.custom_price, 0)), 0) as sales_amount
            FROM property_purchases pp
            JOIN properties p ON pp.property_id = p.id
            JOIN property_models pm ON p.property_model_id = pm.id
            WHERE pp.real_estate_id = re.id
            GROUP BY pm.name
            ORDER BY sales_amount DESC, pm.name
            LIMIT 5
          ) model_row
        ) top_models ON true
        ${whereClause}
        ORDER BY re.name
      `;

      const result = await query(statsQuery, params);
      return realEstateId ? result.rows[0] : result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get real estates created by a specific admin
  async getRealEstatesByAdmin(adminId) {
    try {
      const queryText = `
        SELECT re.*, u.first_name as created_by_first_name, u.last_name as created_by_last_name
        FROM real_estates re
        LEFT JOIN users u ON re.created_by = u.id
        WHERE re.created_by = $1
        ORDER BY re.created_at DESC
      `;
      const result = await query(queryText, [adminId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Search real estates
  async searchRealEstates(searchTerm) {
    try {
      const queryText = `
        SELECT re.*, u.first_name as created_by_first_name, u.last_name as created_by_last_name
        FROM real_estates re
        LEFT JOIN users u ON re.created_by = u.id
        WHERE re.name ILIKE $1 OR re.city ILIKE $1 OR re.country ILIKE $1
        ORDER BY re.created_at DESC
      `;
      const result = await query(queryText, [`%${searchTerm}%`]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new RealEstateService();
