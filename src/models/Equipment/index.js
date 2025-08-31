module.exports = (sequelize, DataTypes) => {
  const Equipment = sequelize.define('Equipment', {
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
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED'),
      defaultValue: 'AVAILABLE'
    },
    purchaseDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'equipment',
    timestamps: true,
    paranoid: true
  });

  return Equipment;
};