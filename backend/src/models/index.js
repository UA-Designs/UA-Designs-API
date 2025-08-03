const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize({
  dialect: dbConfig.dialect,
  storage: dbConfig.storage,
  logging: dbConfig.logging,
  pool: dbConfig.pool
});

// Import all models
const User = require('./User')(sequelize, Sequelize);
const Project = require('./Project')(sequelize, Sequelize);
const Task = require('./Task')(sequelize, Sequelize);
const Resource = require('./Resource')(sequelize, Sequelize);
const Cost = require('./Cost')(sequelize, Sequelize);
const Risk = require('./Risk')(sequelize, Sequelize);
const Quality = require('./Quality')(sequelize, Sequelize);
const Communication = require('./Communication')(sequelize, Sequelize);
const Procurement = require('./Procurement')(sequelize, Sequelize);
const Stakeholder = require('./Stakeholder')(sequelize, Sequelize);
const ChangeRequest = require('./ChangeRequest')(sequelize, Sequelize);
const Material = require('./Material')(sequelize, Sequelize);
const Equipment = require('./Equipment')(sequelize, Sequelize);
const Labor = require('./Labor')(sequelize, Sequelize);
const Schedule = require('./Schedule')(sequelize, Sequelize);
const Budget = require('./Budget')(sequelize, Sequelize);
const Report = require('./Report')(sequelize, Sequelize);

// Define associations based on PMBOK knowledge areas

// 1. Project Integration Management
Project.hasMany(Task, { as: 'tasks', foreignKey: 'projectId' });
Task.belongsTo(Project, { foreignKey: 'projectId' });

Project.hasMany(ChangeRequest, { as: 'changeRequests', foreignKey: 'projectId' });
ChangeRequest.belongsTo(Project, { foreignKey: 'projectId' });

// 2. Project Scope Management
Project.hasMany(Stakeholder, { as: 'stakeholders', foreignKey: 'projectId' });
Stakeholder.belongsTo(Project, { foreignKey: 'projectId' });

// 3. Project Schedule Management
Project.hasMany(Schedule, { as: 'schedules', foreignKey: 'projectId' });
Schedule.belongsTo(Project, { foreignKey: 'projectId' });

Task.hasMany(Schedule, { as: 'schedules', foreignKey: 'taskId' });
Schedule.belongsTo(Task, { foreignKey: 'taskId' });

// 4. Project Cost Management
Project.hasMany(Budget, { as: 'budgets', foreignKey: 'projectId' });
Budget.belongsTo(Project, { foreignKey: 'projectId' });

Project.hasMany(Cost, { as: 'costs', foreignKey: 'projectId' });
Cost.belongsTo(Project, { foreignKey: 'projectId' });

Task.hasMany(Cost, { as: 'costs', foreignKey: 'taskId' });
Cost.belongsTo(Task, { foreignKey: 'taskId' });

// 5. Project Quality Management
Project.hasMany(Quality, { as: 'qualityChecks', foreignKey: 'projectId' });
Quality.belongsTo(Project, { foreignKey: 'projectId' });

Task.hasMany(Quality, { as: 'qualityChecks', foreignKey: 'taskId' });
Quality.belongsTo(Task, { foreignKey: 'taskId' });

// 6. Project Resource Management
Project.hasMany(Resource, { as: 'resources', foreignKey: 'projectId' });
Resource.belongsTo(Project, { foreignKey: 'projectId' });

Project.hasMany(Material, { as: 'materials', foreignKey: 'projectId' });
Material.belongsTo(Project, { foreignKey: 'projectId' });

Project.hasMany(Equipment, { as: 'equipment', foreignKey: 'projectId' });
Equipment.belongsTo(Project, { foreignKey: 'projectId' });

Project.hasMany(Labor, { as: 'labor', foreignKey: 'projectId' });
Labor.belongsTo(Project, { foreignKey: 'projectId' });

Task.hasMany(Resource, { as: 'resources', foreignKey: 'taskId' });
Resource.belongsTo(Task, { foreignKey: 'taskId' });

// 7. Project Communications Management
Project.hasMany(Communication, { as: 'communications', foreignKey: 'projectId' });
Communication.belongsTo(Project, { foreignKey: 'projectId' });

User.hasMany(Communication, { as: 'communications', foreignKey: 'userId' });
Communication.belongsTo(User, { foreignKey: 'userId' });

// 8. Project Risk Management
Project.hasMany(Risk, { as: 'risks', foreignKey: 'projectId' });
Risk.belongsTo(Project, { foreignKey: 'projectId' });

Task.hasMany(Risk, { as: 'risks', foreignKey: 'taskId' });
Risk.belongsTo(Task, { foreignKey: 'taskId' });

// 9. Project Procurement Management
Project.hasMany(Procurement, { as: 'procurements', foreignKey: 'projectId' });
Procurement.belongsTo(Project, { foreignKey: 'projectId' });

Material.hasMany(Procurement, { as: 'procurements', foreignKey: 'materialId' });
Procurement.belongsTo(Material, { foreignKey: 'materialId' });

// 10. Project Stakeholder Management
User.hasMany(Stakeholder, { as: 'stakeholderRoles', foreignKey: 'userId' });
Stakeholder.belongsTo(User, { foreignKey: 'userId' });

// Reports and Analytics
Project.hasMany(Report, { as: 'reports', foreignKey: 'projectId' });
Report.belongsTo(Project, { foreignKey: 'projectId' });

User.hasMany(Report, { as: 'reports', foreignKey: 'userId' });
Report.belongsTo(User, { foreignKey: 'userId' });

// User associations
User.hasMany(Project, { as: 'managedProjects', foreignKey: 'projectManagerId' });
Project.belongsTo(User, { as: 'projectManager', foreignKey: 'projectManagerId' });

User.hasMany(Task, { as: 'assignedTasks', foreignKey: 'assignedToId' });
Task.belongsTo(User, { as: 'assignedTo', foreignKey: 'assignedToId' });

User.hasMany(Task, { as: 'createdTasks', foreignKey: 'createdById' });
Task.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });

module.exports = {
  sequelize,
  Sequelize,
  User,
  Project,
  Task,
  Resource,
  Cost,
  Risk,
  Quality,
  Communication,
  Procurement,
  Stakeholder,
  ChangeRequest,
  Material,
  Equipment,
  Labor,
  Schedule,
  Budget,
  Report
}; 