module.exports = (sequelize, DataTypes) => {
  const ResourceAllocation = sequelize.define('ResourceAllocation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    taskId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    resourceType: {
      type: DataTypes.ENUM('LABOR', 'MATERIAL', 'EQUIPMENT'),
      allowNull: false
    },
    resourceId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('PLANNED', 'ALLOCATED', 'IN_USE', 'RELEASED', 'CANCELLED'),
      defaultValue: 'PLANNED'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'resource_allocations',
    timestamps: true,
    paranoid: true
  });

  return ResourceAllocation;
};
