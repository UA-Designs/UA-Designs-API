module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // null for failed logins (unauthenticated attempts)
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    action: {
      type: DataTypes.ENUM(
        'CREATE',
        'UPDATE',
        'DELETE',
        'STATUS_CHANGE',
        'LOGIN',
        'LOGOUT',
        'REGISTER',
        'PASSWORD_CHANGE',
        'APPROVE',
        'REJECT',
        'ESCALATE'
      ),
      allowNull: false
    },
    entity: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Target entity type: PROJECT, TASK, BUDGET, EXPENSE, etc.'
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Primary key of the affected record'
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Human-readable summary of the action'
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Structured before/after snapshot or relevant payload data'
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    method: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'HTTP method: GET, POST, PUT, PATCH, DELETE'
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Request path, e.g. /api/projects'
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'HTTP response status code'
    }
  }, {
    timestamps: true,
    updatedAt: false, // Audit logs are append-only — no updatedAt column
    paranoid: false,  // Never soft-delete audit logs
    tableName: 'audit_logs'
  });

  return AuditLog;
};
