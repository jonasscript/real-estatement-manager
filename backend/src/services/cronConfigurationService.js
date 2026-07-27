const { query } = require('../config/database');
const { computeNextExecutionAt } = require('../utils/cronSchedule');

class CronConfigurationService {
  getUserRealEstateId(user, explicitRealEstateId = null) {
    if (user.role_name === 'system_admin' && explicitRealEstateId) {
      return explicitRealEstateId;
    }
    return user.real_estate_id || user.realEstateId || null;
  }

  validateSchedule(data) {
    if (data.frequency === 'weekly' && (data.dayOfWeek === undefined || data.dayOfWeek === null || data.dayOfWeek === '')) {
      throw new Error('dayOfWeek is required when frequency is weekly');
    }
    if (data.frequency === 'monthly' && (data.dayOfMonth === undefined || data.dayOfMonth === null || data.dayOfMonth === '')) {
      throw new Error('dayOfMonth is required when frequency is monthly');
    }
  }

  async getConfigurations(filters, user) {
    const realEstateId = this.getUserRealEstateId(user, filters.realEstateId);
    if (!realEstateId && user.role_name !== 'system_admin') {
      throw new Error('No real estate associated with your account');
    }

    const params = [];
    let where = 'WHERE 1=1';
    if (realEstateId) {
      params.push(realEstateId);
      where += ` AND cc.real_estate_id = $${params.length}`;
    }
    if (filters.isActive !== undefined) {
      params.push(filters.isActive);
      where += ` AND cc.is_active = $${params.length}`;
    }

    const result = await query(
      `SELECT cc.*, re.name AS real_estate_name
       FROM cron_configurations cc
       JOIN real_estates re ON cc.real_estate_id = re.id
       ${where}
       ORDER BY cc.name ASC`,
      params
    );
    return result.rows;
  }

  async createConfiguration(data, user) {
    const realEstateId = this.getUserRealEstateId(user, data.realEstateId);
    if (!realEstateId) {
      throw new Error('No real estate associated with your account');
    }
    this.validateSchedule(data);

    const frequency = data.frequency || 'daily';
    const timeOfDay = data.timeOfDay || '08:00:00';
    const dayOfWeek = frequency === 'weekly' ? data.dayOfWeek : null;
    const dayOfMonth = frequency === 'monthly' ? data.dayOfMonth : null;
    const nextExecutionAt = computeNextExecutionAt({ frequency, dayOfWeek, dayOfMonth, timeOfDay });

    const result = await query(
      `INSERT INTO cron_configurations (
         real_estate_id, name, description, job_type, frequency,
         day_of_week, day_of_month, time_of_day, is_active, next_execution_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        realEstateId,
        data.name,
        data.description || null,
        data.jobType || 'custom',
        frequency,
        dayOfWeek,
        dayOfMonth,
        timeOfDay,
        data.isActive === undefined ? true : !!data.isActive,
        nextExecutionAt,
      ]
    );
    return result.rows[0];
  }

  async updateConfiguration(configId, data, user) {
    const current = await query('SELECT * FROM cron_configurations WHERE id = $1', [configId]);
    if (current.rows.length === 0) throw new Error('Cron configuration not found');
    if (user.role_name !== 'system_admin' && Number(current.rows[0].real_estate_id) !== Number(user.real_estate_id)) {
      throw new Error('Access denied to this cron configuration');
    }
    this.validateSchedule(data);

    const frequency = data.frequency || current.rows[0].frequency;
    const timeOfDay = data.timeOfDay || current.rows[0].time_of_day;
    const dayOfWeek = frequency === 'weekly' ? data.dayOfWeek : null;
    const dayOfMonth = frequency === 'monthly' ? data.dayOfMonth : null;

    const scheduleChanged = frequency !== current.rows[0].frequency
      || String(timeOfDay) !== String(current.rows[0].time_of_day)
      || dayOfWeek !== current.rows[0].day_of_week
      || dayOfMonth !== current.rows[0].day_of_month;

    const nextExecutionAt = scheduleChanged || !current.rows[0].next_execution_at
      ? computeNextExecutionAt({ frequency, dayOfWeek, dayOfMonth, timeOfDay })
      : current.rows[0].next_execution_at;

    const result = await query(
      `UPDATE cron_configurations
       SET name = $1, description = $2, job_type = $3, frequency = $4,
           day_of_week = $5, day_of_month = $6, time_of_day = $7,
           is_active = $8, next_execution_at = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        data.name || current.rows[0].name,
        data.description !== undefined ? data.description : current.rows[0].description,
        data.jobType || current.rows[0].job_type,
        frequency,
        dayOfWeek,
        dayOfMonth,
        timeOfDay,
        data.isActive === undefined ? current.rows[0].is_active : !!data.isActive,
        nextExecutionAt,
        configId,
      ]
    );
    return result.rows[0];
  }

  async deleteConfiguration(configId, user) {
    const current = await query('SELECT * FROM cron_configurations WHERE id = $1', [configId]);
    if (current.rows.length === 0) throw new Error('Cron configuration not found');
    if (user.role_name !== 'system_admin' && Number(current.rows[0].real_estate_id) !== Number(user.real_estate_id)) {
      throw new Error('Access denied to this cron configuration');
    }

    const result = await query('DELETE FROM cron_configurations WHERE id = $1 RETURNING *', [configId]);
    return result.rows[0];
  }
}

module.exports = new CronConfigurationService();
