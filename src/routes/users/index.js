const express = require('express');
const bcrypt = require('bcryptjs');
const { User } = require('../../models');
const { authenticateToken, authorizeRoles, authorizePermission } = require('../../middleware/auth');
const { Op } = require('sequelize');
const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'UA Designs User Management Service',
    timestamp: new Date().toISOString()
  });
});

// Get all users
router.get('/', authenticateToken, async (req, res) => {
  try {
    const isElevated = ['ADMIN', 'PROJECT_MANAGER'].includes(req.user.role);
    const { 
      page = 1, 
      limit = 10, 
      role, 
      department, 
      isActive, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Apply filters
    if (role) whereClause.role = role;
    if (department) whereClause.department = department;
    if (isActive !== undefined) whereClause.isActive = isActive === 'true';
    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { employeeId: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Non-admin users get a safe, active-only user directory view.
    if (!isElevated) {
      whereClause.isActive = true;
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: isElevated
        ? { exclude: ['password'] }
        : ['id', 'firstName', 'lastName', 'email', 'role', 'isActive', 'createdAt'],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalUsers: count,
          hasNext: offset + users.length < count,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile unless they're admin/project manager
    if (req.user.id !== id && !['ADMIN', 'PROJECT_MANAGER'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own profile'
      });
    }

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

// Create new user (Admin only)
router.post('/', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      role,
      department,
      employeeId,
      hireDate,
      profileImage,
      emergencyContact,
      workSchedule,
      specializations,
      approvalLevel,
      costCenter,
      officeLocation,
      assignedEquipment,
      certifications
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: firstName, lastName, email, password, role'
      });
    }

    // Check if user already exists
    const orConditions = [{ email }];
    if (employeeId) orConditions.push({ employeeId });

    const existingUser = await User.findOne({
      where: { [Op.or]: orConditions }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already exists' : 'Employee ID already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      role,
      department,
      employeeId,
      hireDate: hireDate ? new Date(hireDate) : null,
      profileImage,
      emergencyContact,
      workSchedule,
      specializations,
      approvalLevel,
      costCenter,
      officeLocation,
      assignedEquipment,
      certifications,
      isActive: true
    });

    // Return user without password
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: userResponse }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

// Update user
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Users can only update their own profile unless they're admin
    if (req.user.id !== id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.password;
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Only admin can change role and isActive
    if (req.user.role !== 'ADMIN') {
      delete updateData.role;
      delete updateData.isActive;
      delete updateData.permissions;
    }

    // Hash password if provided
    if (updateData.newPassword) {
      updateData.password = await bcrypt.hash(updateData.newPassword, 12);
      delete updateData.newPassword;
    }

    await user.update(updateData);

    // Return updated user without password
    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

// Deactivate user (Admin only)
router.patch('/:id/deactivate', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deactivating themselves
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    await user.update({ isActive: false });

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user',
      error: error.message
    });
  }
});

// Activate user (Admin only)
router.patch('/:id/activate', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update({ isActive: true });

    res.json({
      success: true,
      message: 'User activated successfully'
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate user',
      error: error.message
    });
  }
});

// Delete user (Admin only)
router.delete('/:id', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    await user.destroy(); // Soft delete

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

// Get users by role
router.get('/role/:role', authenticateToken, authorizeRoles('ADMIN', 'PROJECT_MANAGER'), async (req, res) => {
  try {
    const { role } = req.params;

    const users = await User.findAll({
      where: { 
        role,
        isActive: true
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'employeeId'],
      order: [['firstName', 'ASC']]
    });

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users by role',
      error: error.message
    });
  }
});

// Get user permissions
router.get('/:id/permissions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only view their own permissions unless they're admin
    if (req.user.id !== id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own permissions'
      });
    }

    const user = await User.findByPk(id, {
      attributes: ['id', 'role', 'permissions', 'approvalLevel']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        userId: user.id,
        role: user.role,
        permissions: user.permissions,
        approvalLevel: user.approvalLevel,
        isApprover: user.isApprover(),
        canApproveMaterials: user.canApproveMaterials(),
        canApproveFinishingMaterials: user.canApproveFinishingMaterials()
      }
    });
  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user permissions',
      error: error.message
    });
  }
});

// Update user permissions (Admin only)
router.put('/:id/permissions', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions, approvalLevel } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updateData = {};
    if (permissions) updateData.permissions = permissions;
    if (approvalLevel) updateData.approvalLevel = approvalLevel;

    await user.update(updateData);

    res.json({
      success: true,
      message: 'User permissions updated successfully'
    });
  } catch (error) {
    console.error('Update user permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user permissions',
      error: error.message
    });
  }
});

// Get user statistics (Admin only)
router.get('/stats/overview', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { isActive: true } });
    const inactiveUsers = await User.count({ where: { isActive: false } });

    // Count users by role
    const roleStats = await User.findAll({
      attributes: [
        'role',
        [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count']
      ],
      where: { isActive: true },
      group: ['role'],
      raw: true
    });

    // Recent users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUsers = await User.count({
      where: {
        createdAt: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        recentUsers,
        roleStats: roleStats.reduce((acc, stat) => {
          acc[stat.role] = parseInt(stat.count);
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: error.message
    });
  }
});

module.exports = router; 

