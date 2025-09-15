module.exports = (sequelize, DataTypes) => {
  const CostCategory = sequelize.define('CostCategory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('MATERIAL', 'LABOR', 'EQUIPMENT', 'OVERHEAD', 'SUBCONTRACTOR', 'PERMITS', 'OTHER'),
      allowNull: false
    },
    parentCategoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'cost_categories',
        key: 'id'
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Hex color code for UI display'
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Icon name for UI display'
    },
    defaultBudget: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Default budget allocation for this category'
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of tags for categorization'
    }
  }, {
    tableName: 'cost_categories',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['type']
      },
      {
        fields: ['parentCategoryId']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['sortOrder']
      }
    ]
  });

  return CostCategory;
};

