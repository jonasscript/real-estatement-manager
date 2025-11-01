const userService = require('../services/userService');
const { validationResult } = require('express-validator');

class UserController {
  // Get all users
  async getAllUsers(req, res) {
    try {
      const filters = {
        role: req.query.role,
        isActive:
          req.query.isActive === 'true'
            ? true
            : req.query.isActive === 'false'
            ? false
            : undefined,
        search: req.query.search,
      };

      const users = await userService.getAllUsers(filters);

      res.json({
        message: 'Users retrieved successfully',
        data: users,
        count: users.length,
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        error: 'Failed to retrieve users',
      });
    }
  }

  // Get users by role ID (filtered by permissions)
  async getUsersByRoleId(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { roleId } = req.params;
      const users = await userService.getUsersByRoleId(parseInt(roleId));

      res.json({
        message: 'Users retrieved successfully',
        data: users,
        count: users.length,
      });
    } catch (error) {
      console.error('Get users by role ID error:', error);
      res.status(500).json({
        error: 'Failed to retrieve users',
      });
    }
  }

  // Get user by ID
  async getUserById(req, res) {
    try {
      const { userId } = req.params;
      const user = await userService.getUserById(userId);

      res.json({
        message: 'User retrieved successfully',
        data: user,
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(error.message === 'User not found' ? 404 : 500).json({
        error: error.message || 'Failed to retrieve user',
      });
    }
  }

  // Create new user
  async createUser(req, res, isNewRegister = false) {
    console.log('request', req.body);
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: errors,
          details: errors.array(),
        });
      }

      const { realEstateId, ...userData } = req.body;

      // For real_estate_admin, only allow creating users with client role (role_id = 4)
      if (
        !isNewRegister &&
        req.user.role_name === 'real_estate_admin' &&
        userData.roleId !== 4
      ) {
        return res.status(403).json({
          error: 'Real estate admins can only create client users',
        });
      }

      // Include realEstateId back into userData if it exists
      const completeUserData = {
        ...userData,
        ...(realEstateId && { realEstateId })
      };

      console.log('Complete user data being sent to service:', completeUserData);

      const newUser = await userService.createUser(completeUserData);

      res.status(201).json({
        message: 'User created successfully',
        data: newUser,
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(error.message === 'Email already exists' ? 409 : 500).json({
        error: error.message || 'Failed to create user',
      });
    }
  }

  // Update user
  async updateUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { userId } = req.params;
      const updateData = req.body;

      const updatedUser = await userService.updateUser(userId, updateData);

      res.json({
        message: 'User updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(error.message === 'User not found' ? 404 : 500).json({
        error: error.message || 'Failed to update user',
      });
    }
  }

  // Delete user
  async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      const deletedUser = await userService.deleteUser(userId);

      res.json({
        message: 'User deleted successfully',
        data: deletedUser,
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(error.message === 'User not found' ? 404 : 500).json({
        error: error.message || 'Failed to delete user',
      });
    }
  }

  // Get users by role
  async getUsersByRole(req, res) {
    try {
      const { role } = req.params;
      let users;

      switch (role) {
        case 'real_estate_admin':
          users = await userService.getRealEstateAdmins();
          break;
        case 'seller':
          users = await userService.getSellers();
          break;
        case 'client':
          users = await userService.getClients();
          break;
        default:
          return res.status(400).json({
            error: 'Invalid role specified',
          });
      }

      res.json({
        message: `${role.replace('_', ' ')}s retrieved successfully`,
        data: users,
        count: users.length,
      });
    } catch (error) {
      console.error('Get users by role error:', error);
      res.status(500).json({
        error: 'Failed to retrieve users',
      });
    }
  }

  // Get users by real estate
  async getUsersByRealEstate(req, res) {
    try {
      const { realEstateId } = req.params;
      const users = await userService.getUsersByRealEstate(realEstateId);

      res.json({
        message: 'Users retrieved successfully',
        data: users,
        count: users.length,
      });
    } catch (error) {
      console.error('Get users by real estate error:', error);
      res.status(500).json({
        error: 'Failed to retrieve users',
      });
    }
  }

  // Get available sellers for a real estate
  async getAvailableSellers(req, res) {
    try {
      const { realEstateId } = req.params;
      const sellers = await userService.getAvailableSellers(realEstateId);

      res.json({
        message: 'Available sellers retrieved successfully',
        data: sellers,
        count: sellers.length,
      });
    } catch (error) {
      console.error('Get available sellers error:', error);
      res.status(500).json({
        error: 'Failed to retrieve available sellers',
      });
    }
  }

  // Get available clients for a real estate (role_id = 4, not already clients)
  async getAvailableClients(req, res) {
    try {
      const { realEstateId } = req.params;
      const clients = await userService.getAvailableClients(realEstateId);

      res.json({
        message: 'Available clients retrieved successfully',
        data: clients,
        count: clients.length,
      });
    } catch (error) {
      console.error('Get available clients error:', error);
      res.status(500).json({
        error: 'Failed to retrieve available clients',
      });
    }
  }

  // Get only sellers by real estate (role_id = 3)
  async getSellersOnlyByRealEstate(req, res) {
    try {
      const { realEstateId } = req.params;
      const sellers = await userService.getSellersOnlyByRealEstate(
        realEstateId
      );

      res.json({
        message: 'Sellers retrieved successfully',
        data: sellers,
        count: sellers.length,
      });
    } catch (error) {
      console.error('Get sellers only by real estate error:', error);
      res.status(500).json({
        error: 'Failed to retrieve sellers',
      });
    }
  }

  // Get sellers by real estate
  async getSellersByRealEstate(req, res) {
    try {
      const { realEstateId } = req.params;
      const sellers = await userService.getSellersByRealEstate(realEstateId);

      res.json({
        message: 'Sellers retrieved successfully',
        data: sellers,
        count: sellers.length,
      });
    } catch (error) {
      console.error('Get sellers by real estate error:', error);
      res.status(500).json({
        error: 'Failed to retrieve sellers',
      });
    }
  }

  // Get clients by real estate
  async getClientsByRealEstate(req, res) {
    try {
      const { realEstateId } = req.params;
      const clients = await userService.getClientsByRealEstate(realEstateId);

      res.json({
        message: 'Clients retrieved successfully',
        data: clients,
        count: clients.length,
      });
    } catch (error) {
      console.error('Get clients by real estate error:', error);
      res.status(500).json({
        error: 'Failed to retrieve clients',
        details: error.message,
      });
    }
  }

  // Assign seller to client
  async assignSellerToClient(req, res) {
    try {
      const { clientId } = req.params;
      const { sellerId } = req.body;

      if (!sellerId) {
        return res.status(400).json({
          error: 'Seller ID is required',
        });
      }

      const assignment = await userService.assignSellerToClient(
        clientId,
        sellerId
      );

      res.json({
        message: 'Seller assigned to client successfully',
        data: assignment,
      });
    } catch (error) {
      console.error('Assign seller to client error:', error);
      res.status(error.message === 'Client not found' ? 404 : 500).json({
        error: error.message || 'Failed to assign seller',
      });
    }
  }

  // Get user statistics
  async getUserStatistics(req, res) {
    try {
      const statistics = await userService.getUserStatistics();

      res.json({
        message: 'User statistics retrieved successfully',
        data: statistics,
      });
    } catch (error) {
      console.error('Get user statistics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve user statistics',
      });
    }
  }

  // Public user registration (for clients and sellers)
  async registerUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const userData = req.body;
      const newUser = await userService.createUser(userData);

      res.status(201).json({
        message: 'User registered successfully',
        data: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          roleId: newUser.role_id,
          createdAt: newUser.created_at,
        },
      });
    } catch (error) {
      console.error('User registration error:', error);
      res.status(error.message === 'Email already exists' ? 409 : 500).json({
        error: error.message || 'Registration failed',
      });
    }
  }

  // Change user password
  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { userId } = req.params;
      const { password } = req.body;

      const updatedUser = await userService.changePassword(
        parseInt(userId),
        password
      );

      res.json({
        message: 'Password changed successfully',
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          updatedAt: updatedUser.updated_at,
        },
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(error.message === 'User not found' ? 404 : 500).json({
        error: error.message || 'Failed to change password',
      });
    }
  }

  // Get users with seller role for a specific real estate
  async getUsersSellersRealEstate(req, res) {
    try {
      const { realEstateId } = req.params;

      const sellers = await userService.getUsersSellersRealEstate(
        parseInt(realEstateId)
      );

      res.json({
        message: 'Sellers retrieved successfully',
        data: sellers,
        count: sellers.length,
      });
    } catch (error) {
      console.error('Get sellers users error:', error);
      res.status(500).json({
        error: 'Failed to retrieve sellers',
      });
    }
  }

  // Create seller user (creates user and seller record)
  async createSellerUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const userData = req.body;
      console.log('Creating seller user with data:', userData);

      const newSellerUser = await userService.createSellerUser(userData);

      res.status(201).json({
        message: 'Seller user created successfully',
        data: newSellerUser,
      });
    } catch (error) {
      console.error('Create seller user error:', error);
      res.status(error.message === 'Email already exists' ? 409 : 500).json({
        error: error.message || 'Failed to create seller user',
      });
    }
  }
}

module.exports = new UserController();
