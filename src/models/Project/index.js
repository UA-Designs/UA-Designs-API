const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const Project = sequelize.define('Project', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled'),
      defaultValue: 'planning',
      allowNull: false
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    budget: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0.00
    },
    projectManagerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    clientName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    clientEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    clientPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    projectType: {
      type: DataTypes.ENUM('residential', 'commercial', 'industrial', 'infrastructure', 'renovation'),
      allowNull: true
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
      allowNull: false
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  }, {
    tableName: 'projects',
    timestamps: true,
    paranoid: true, // Soft delete
    indexes: [
      {
        fields: ['status']
      },
      {
        fields: ['projectManagerId']
      },
      {
        fields: ['startDate']
      },
      {
        fields: ['endDate']
      },
      {
        fields: ['projectType']
      },
      {
        fields: ['priority']
      }
    ]
  });

  // Instance methods
  Project.prototype.getProjectSummary = function() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      progress: this.progress,
      startDate: this.startDate,
      endDate: this.endDate,
      budget: this.budget,
      priority: this.priority,
      projectType: this.projectType,
      clientName: this.clientName
    };
  };

  Project.prototype.isOverdue = function() {
    if (!this.endDate) return false;
    return new Date() > new Date(this.endDate) && this.status !== 'completed';
  };

  Project.prototype.getDaysRemaining = function() {
    if (!this.endDate) return null;
    const today = new Date();
    const endDate = new Date(this.endDate);
    const diffTime = endDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return Project;
};
