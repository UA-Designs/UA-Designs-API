module.exports = (sequelize, DataTypes) => {
  const Expense = sequelize.define('Expense', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'PHP'
    },
    category: {
      type: DataTypes.ENUM('MATERIAL', 'LABOR', 'EQUIPMENT', 'OVERHEAD', 'SUBCONTRACTOR', 'PERMITS', 'OTHER'),
      allowNull: false
    },
    subcategory: {
      type: DataTypes.STRING,
      allowNull: true
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'PAID'),
      defaultValue: 'PENDING'
    },
    vendor: {
      type: DataTypes.STRING,
      allowNull: true
    },
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    receiptNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id'
      }
    },
    taskId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'tasks',
        key: 'id'
      }
    },
    submittedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of receipt/invoice attachments'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of tags for categorization'
    }
  }, {
    tableName: 'expenses',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['projectId']
      },
      {
        fields: ['taskId']
      },
      {
        fields: ['category']
      },
      {
        fields: ['status']
      },
      {
        fields: ['date']
      },
      {
        fields: ['submittedBy']
      }
    ]
  });

  return Expense;
};
