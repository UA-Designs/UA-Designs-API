module.exports = (sequelize, DataTypes) => {
  const SkillsMatrix = sequelize.define('SkillsMatrix', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    teamMemberId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    skillName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    proficiencyLevel: {
      type: DataTypes.ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'),
      defaultValue: 'INTERMEDIATE'
    },
    yearsExperience: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: true
    },
    certified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    certificationDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'skills_matrix',
    timestamps: true
  });

  return SkillsMatrix;
};
