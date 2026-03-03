module.exports = (sequelize, DataTypes) => {
  const RiskCategory = sequelize.define('RiskCategory', {
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
    color: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'risk_categories',
    timestamps: true
  });

  return RiskCategory;
};
