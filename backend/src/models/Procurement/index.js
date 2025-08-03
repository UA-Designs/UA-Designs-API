module.exports = (sequelize, DataTypes) => {
  const Procurement = sequelize.define('Procurement', {
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
    type: {
      type: DataTypes.ENUM('MATERIAL', 'SERVICE', 'EQUIPMENT'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('PLANNING', 'REQUESTED', 'APPROVED', 'ORDERED', 'RECEIVED'),
      defaultValue: 'PLANNING'
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
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
    expectedDelivery: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'procurements',
    timestamps: true,
    paranoid: true
  });

  return Procurement;
}; 