module.exports = (sequelize, DataTypes) => {
  const EquipmentMaintenance = sequelize.define('EquipmentMaintenance', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    equipmentId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    maintenanceType: {
      type: DataTypes.ENUM('PREVENTIVE', 'CORRECTIVE', 'EMERGENCY'),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    scheduledDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    performedBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
      defaultValue: 'SCHEDULED'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'equipment_maintenance',
    timestamps: true,
    paranoid: true
  });

  return EquipmentMaintenance;
};
