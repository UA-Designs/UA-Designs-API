module.exports = (sequelize, DataTypes) => {
  const Equipment = sequelize.define('Equipment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: true
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
    dailyRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    condition: {
      type: DataTypes.ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR'),
      defaultValue: 'GOOD'
    },
    operator: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastMaintenance: {
      type: DataTypes.DATE,
      allowNull: true
    },
    nextMaintenance: {
      type: DataTypes.DATE,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    notes: {
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