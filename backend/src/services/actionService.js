const pool = require('../config/database');

class ActionService {
  // Get all actions
  async getAllActions() {
    const result = await pool.query(
      `SELECT id, name, description 
       FROM actions 
       ORDER BY name ASC`
    );
    return result.rows;
  }

  // Get action by ID
  async getActionById(id) {
    const result = await pool.query(
      'SELECT id, name, description FROM actions WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  // Get action by name
  async getActionByName(name) {
    const result = await pool.query(
      'SELECT id, name, description FROM actions WHERE name = $1',
      [name]
    );
    return result.rows[0];
  }

  // Create action
  async createAction(actionData) {
    const { name, description } = actionData;
    
    // Check if action already exists
    const existing = await this.getActionByName(name);
    if (existing) {
      throw new Error('Action with this name already exists');
    }

    const result = await pool.query(
      `INSERT INTO actions (name, description) 
       VALUES ($1, $2) 
       RETURNING id, name, description`,
      [name, description]
    );
    return result.rows[0];
  }
}

module.exports = new ActionService();
