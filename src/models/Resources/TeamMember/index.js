module.exports = (sequelize, DataTypes) => {
  const TeamMember = sequelize.define('TeamMember', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    role: {
      type: DataTypes.STRING,
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
    allocation: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Allocation percentage 0-100'
    },
    hoursPerWeek: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'PENDING'),
      defaultValue: 'ACTIVE'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'team_members',
    timestamps: true,
    paranoid: true
  });

  return TeamMember;
};
