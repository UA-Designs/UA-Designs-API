module.exports = (sequelize, DataTypes) => {
  const Material = sequelize.define('Material', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('STRUCTURAL', 'FINISHING', 'MECHANICAL', 'ELECTRICAL'),
      allowNull: false
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false
    },
    unitCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    totalCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    supplier: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('ORDERED', 'IN_TRANSIT', 'RECEIVED', 'INSTALLED'),
      defaultValue: 'ORDERED'
    }
  }, {
    tableName: 'materials',
    timestamps: true,
    paranoid: true
  });

  return Material;
}; 