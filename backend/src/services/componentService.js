const pool = require('../config/database');

class ComponentService {
  // Get all components
  async getAllComponents() {
    const result = await pool.query(
      `SELECT id, name, description 
       FROM components 
       ORDER BY name ASC`
    );
    return result.rows;
  }

  // Get component by ID
  async getComponentById(id) {
    const result = await pool.query(
      'SELECT id, name, description FROM components WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  // Get component by name
  async getComponentByName(name) {
    const result = await pool.query(
      'SELECT id, name, description FROM components WHERE name = $1',
      [name]
    );
    return result.rows[0];
  }

  // Create component
  async createComponent(componentData) {
    const { name, description } = componentData;
    
    // Check if component already exists
    const existing = await this.getComponentByName(name);
    if (existing) {
      throw new Error('Component with this name already exists');
    }

    const result = await pool.query(
      `INSERT INTO components (name, description) 
       VALUES ($1, $2) 
       RETURNING id, name, description`,
      [name, description]
    );
    return result.rows[0];
  }
}

module.exports = new ComponentService();
