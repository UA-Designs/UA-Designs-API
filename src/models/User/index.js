module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 100]
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // UA Designs roles — three operational tiers + system admin
    role: {
      type: DataTypes.ENUM(
        'PROJECT_MANAGER',     // Full project control, approval authority
        'ARCHITECT',           // Technical lead with PM + engineering capabilities
        'ENGINEER',            // Task updates, resource/cost data input
        'STAFF',               // Read-only + communication input
        'ADMIN',               // System administration
        'PROPRIETOR'           // Owner-level access (admin-equivalent)
      ),
      allowNull: false,
      defaultValue: 'ENGINEER'
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true
    },
    employeeId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    hireDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Permissions based on UA Designs operational rules
    permissions: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Role-based permissions for UA Designs operational structure'
    },
    // Contact information for external communications
    emergencyContact: {
      type: DataTypes.JSON,
      allowNull: true
    },
    // Work schedule and availability
    workSchedule: {
      type: DataTypes.JSON,
      defaultValue: {
        monday: { start: '08:00', end: '17:00', available: true },
        tuesday: { start: '08:00', end: '17:00', available: true },
        wednesday: { start: '08:00', end: '17:00', available: true },
        thursday: { start: '08:00', end: '17:00', available: true },
        friday: { start: '08:00', end: '17:00', available: true },
        saturday: { start: '08:00', end: '12:00', available: false },
        sunday: { start: '00:00', end: '00:00', available: false }
      }
    },
    // Specializations for construction industry
    specializations: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Construction specializations and certifications'
    },
    // Approval authority levels
    approvalLevel: {
      type: DataTypes.ENUM('NONE', 'LOW', 'MEDIUM', 'HIGH', 'FINAL'),
      defaultValue: 'NONE'
    },
    // Cost center assignment
    costCenter: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Location/office assignment
    officeLocation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Equipment and tool assignments
    assignedEquipment: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Equipment and tools assigned to this user'
    },
    // Training and certifications
    certifications: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Professional certifications and training records'
    },
    // Performance metrics
    performanceMetrics: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Performance tracking and metrics'
    }
  }, {
    tableName: 'users',
    timestamps: true,
    paranoid: true, // Soft deletes
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        fields: ['role']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['employeeId']
      }
    ],
    hooks: {
      beforeCreate: (user) => {
        // Set default permissions based on role
        user.permissions = User.getDefaultPermissions(user.role);
      },
      beforeUpdate: (user) => {
        // Update permissions when role changes
        if (user.changed('role')) {
          user.permissions = User.getDefaultPermissions(user.role);
        }
      }
    }
  });

  // Static method to get default permissions for each role
  // Permissions are organized by the three operational tiers:
  //   Project Manager tier — read/write/approve on all project modules
  //   Engineer tier        — read/write (no approve) on operational modules
  //   Staff tier           — read-only everywhere; write on communication only
  User.getDefaultPermissions = (role) => {
    const allModules = [
      'projectManagement',
      'scheduleManagement',
      'costManagement',
      'resourceManagement',
      'riskManagement',
      'stakeholderManagement',
      'qualityManagement',
      'analytics',
      'communication',
    ];

    const TIERS = {
      PROJECT_MANAGER: Object.fromEntries(
        allModules.map(m => [m, ['read', 'write', 'approve']])
      ),
      ARCHITECT: Object.fromEntries(
        allModules.map(m => [m, ['read', 'write', 'approve']])
      ),
      ENGINEER: Object.fromEntries(
        allModules.map(m => [m, ['read', 'write']])
      ),
      STAFF: {
        ...Object.fromEntries(allModules.map(m => [m, ['read']])),
        communication: ['read', 'write'],
      },
    };

    const ROLE_TIER_MAP = {
      ADMIN: {
        ...TIERS.PROJECT_MANAGER,
        systemAdministration: ['read', 'write', 'approve'],
        userManagement:       ['read', 'write', 'approve'],
      },
      PROPRIETOR: {
        ...TIERS.PROJECT_MANAGER,
        systemAdministration: ['read', 'write', 'approve'],
        userManagement:       ['read', 'write', 'approve'],
      },
      PROJECT_MANAGER: TIERS.PROJECT_MANAGER,
      ARCHITECT:       TIERS.ARCHITECT,
      ENGINEER:        TIERS.ENGINEER,
      STAFF:           TIERS.STAFF,
    };

    return ROLE_TIER_MAP[role] || TIERS.STAFF;
  };

  // Instance methods
  User.prototype.hasPermission = function(module, action) {
    const userPermissions = this.permissions || {};
    const modulePermissions = userPermissions[module] || [];
    return modulePermissions.includes(action);
  };

  User.prototype.getFullName = function() {
    return `${this.firstName} ${this.lastName}`;
  };

  User.prototype.isApprover = function() {
    return ['PROJECT_MANAGER', 'ARCHITECT', 'ADMIN', 'PROPRIETOR'].includes(this.role);
  };

  User.prototype.canApproveMaterials = function() {
    return ['ENGINEER', 'PROJECT_MANAGER', 'ARCHITECT', 'ADMIN', 'PROPRIETOR'].includes(this.role);
  };

  User.prototype.canApproveFinishingMaterials = function() {
    return ['ENGINEER', 'PROJECT_MANAGER', 'ARCHITECT', 'ADMIN', 'PROPRIETOR'].includes(this.role);
  };

  return User;
}; 