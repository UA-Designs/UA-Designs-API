module.exports = (sequelize, DataTypes) => {
  const Quality = sequelize.define('Quality', {
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
    standard: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED'),
      defaultValue: 'PENDING'
    },
    result: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'quality',
    timestamps: true,
    paranoid: true
  });

  return Quality;
}; 