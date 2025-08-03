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
    // UA Designs specific roles based on operational structure
    role: {
      type: DataTypes.ENUM(
        'CIVIL_ENGINEER',      // Mr. King Christian Uy - Materials, methodology, worker assignments
        'ARCHITECT',           // Mrs. Mary Claire Anyayahan-Uy - Design and finishing materials
        'SITE_ENGINEER',       // Progress tracking and site supervision
        'JUNIOR_ARCHITECT',    // Detail development and supervision
        'APPRENTICE_ARCHITECT', // Detail development and supervision
        'BOOKKEEPER',          // Payroll and finance
        'SECRETARY',           // Liaison work and external transactions
        'PROJECT_MANAGER',     // Overall project coordination
        'ADMIN'                // System administration
      ),
      allowNull: false,
      defaultValue: 'JUNIOR_ARCHITECT'
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
  User.getDefaultPermissions = (role) => {
    const permissions = {
      CIVIL_ENGINEER: {
        materials: ['read', 'write', 'approve'],
        methodology: ['read', 'write', 'approve'],
        workerAssignments: ['read', 'write', 'approve'],
        structuralMaterials: ['read', 'write', 'approve'],
        projectManagement: ['read', 'write'],
        costManagement: ['read', 'write'],
        qualityControl: ['read', 'write', 'approve']
      },
      ARCHITECT: {
        design: ['read', 'write', 'approve'],
        finishingMaterials: ['read', 'write', 'approve'],
        clientApproval: ['read', 'write', 'approve'],
        designReview: ['read', 'write', 'approve'],
        projectManagement: ['read', 'write'],
        costManagement: ['read', 'write']
      },
      SITE_ENGINEER: {
        progressTracking: ['read', 'write', 'approve'],
        siteSupervision: ['read', 'write', 'approve'],
        qualityControl: ['read', 'write'],
        safetyManagement: ['read', 'write', 'approve'],
        resourceAllocation: ['read', 'write'],
        projectManagement: ['read', 'write']
      },
      JUNIOR_ARCHITECT: {
        detailDevelopment: ['read', 'write'],
        supervision: ['read', 'write'],
        designSupport: ['read', 'write'],
        projectManagement: ['read']
      },
      APPRENTICE_ARCHITECT: {
        detailDevelopment: ['read', 'write'],
        supervision: ['read'],
        designSupport: ['read', 'write'],
        projectManagement: ['read']
      },
      BOOKKEEPER: {
        payroll: ['read', 'write', 'approve'],
        finance: ['read', 'write', 'approve'],
        costTracking: ['read', 'write', 'approve'],
        budgetManagement: ['read', 'write', 'approve'],
        financialReports: ['read', 'write', 'approve']
      },
      SECRETARY: {
        liaisonWork: ['read', 'write'],
        externalTransactions: ['read', 'write'],
        communication: ['read', 'write'],
        documentManagement: ['read', 'write'],
        scheduling: ['read', 'write']
      },
      PROJECT_MANAGER: {
        projectManagement: ['read', 'write', 'approve'],
        resourceAllocation: ['read', 'write', 'approve'],
        costManagement: ['read', 'write', 'approve'],
        riskManagement: ['read', 'write', 'approve'],
        stakeholderManagement: ['read', 'write', 'approve'],
        qualityManagement: ['read', 'write', 'approve'],
        scheduleManagement: ['read', 'write', 'approve']
      },
      ADMIN: {
        systemAdministration: ['read', 'write', 'approve'],
        userManagement: ['read', 'write', 'approve'],
        projectManagement: ['read', 'write', 'approve'],
        resourceAllocation: ['read', 'write', 'approve'],
        costManagement: ['read', 'write', 'approve'],
        riskManagement: ['read', 'write', 'approve'],
        stakeholderManagement: ['read', 'write', 'approve'],
        qualityManagement: ['read', 'write', 'approve'],
        scheduleManagement: ['read', 'write', 'approve']
      }
    };

    return permissions[role] || {};
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
    return ['CIVIL_ENGINEER', 'ARCHITECT', 'SITE_ENGINEER', 'PROJECT_MANAGER', 'ADMIN'].includes(this.role);
  };

  User.prototype.canApproveMaterials = function() {
    return this.role === 'CIVIL_ENGINEER' || this.role === 'ADMIN';
  };

  User.prototype.canApproveFinishingMaterials = function() {
    return this.role === 'ARCHITECT' || this.role === 'ADMIN';
  };

  return User;
}; 