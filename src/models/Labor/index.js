module.exports = (sequelize, DataTypes) => {
  const Labor = sequelize.define('Labor', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false
    },
    hours: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    totalCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('ASSIGNED', 'IN_PROGRESS', 'COMPLETED'),
      defaultValue: 'ASSIGNED'
    }
  }, {
    tableName: 'labor',
    timestamps: true,
    paranoid: true
  });

  return Labor;
};