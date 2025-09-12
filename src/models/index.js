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

// Import all models using PMBOK knowledge area structure
const User = require('./User/index')(sequelize, Sequelize);
const Report = require('./Report/index')(sequelize, Sequelize);

// PMBOK Integration Management
const { Project, ChangeRequest, ProjectCharter, ProjectClosure } = require('./Integration');

// PMBOK Schedule Management
const { Task } = require('./Schedule');

// PMBOK Cost Management
const { CostModel: Cost, Budget } = require('./Cost');

// PMBOK Resource Management
const { Material, Labor, Equipment } = require('./Resources');
const Resource = require('./Resource/index')(sequelize, Sequelize);

// PMBOK Communications Management
const { Communication } = require('./Communications');

// PMBOK Risk Management
const { RiskModel: Risk } = require('./Risk');

// PMBOK Quality Management
const { QualityModel: Quality } = require('./Quality');

// PMBOK Procurement Management
const { ProcurementModel: Procurement } = require('./Procurement');

// PMBOK Stakeholder Management
const { Stakeholder } = require('./Stakeholders');

// Initialize models with sequelize
const ProjectModel = Project(sequelize, Sequelize);
const ChangeRequestModel = ChangeRequest(sequelize, Sequelize);
const ProjectCharterModel = ProjectCharter(sequelize, Sequelize);
const ProjectClosureModel = ProjectClosure(sequelize, Sequelize);
const TaskModel = Task(sequelize, Sequelize);
const CostModel = Cost(sequelize, Sequelize);
const BudgetModel = Budget(sequelize, Sequelize);
const MaterialModel = Material(sequelize, Sequelize);
const LaborModel = Labor(sequelize, Sequelize);
const EquipmentModel = Equipment(sequelize, Sequelize);
const CommunicationModel = Communication(sequelize, Sequelize);
const RiskModel = Risk(sequelize, Sequelize);
const QualityModel = Quality(sequelize, Sequelize);
const ProcurementModel = Procurement(sequelize, Sequelize);
const StakeholderModel = Stakeholder(sequelize, Sequelize);

// Define associations based on PMBOK knowledge areas

// 1. Project Integration Management
ProjectModel.hasMany(TaskModel, { as: 'tasks', foreignKey: 'projectId' });
TaskModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

ProjectModel.hasMany(ChangeRequestModel, { as: 'changeRequests', foreignKey: 'projectId' });
ChangeRequestModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

ProjectModel.hasOne(ProjectCharterModel, { as: 'charter', foreignKey: 'projectId' });
ProjectCharterModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

ProjectModel.hasOne(ProjectClosureModel, { as: 'closure', foreignKey: 'projectId' });
ProjectClosureModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

// Project Charter associations
User.hasMany(ProjectCharter, { as: 'sponsoredCharters', foreignKey: 'projectSponsor' });
ProjectCharter.belongsTo(User, { as: 'sponsor', foreignKey: 'projectSponsor' });

User.hasMany(ProjectCharter, { as: 'managedCharters', foreignKey: 'projectManager' });
ProjectCharter.belongsTo(User, { as: 'charterManager', foreignKey: 'projectManager' });

// Project Closure associations
User.hasMany(ProjectClosure, { as: 'managedClosures', foreignKey: 'projectManager' });
ProjectClosure.belongsTo(User, { as: 'closureManager', foreignKey: 'projectManager' });

// Change Request associations
User.hasMany(ChangeRequest, { as: 'requestedChanges', foreignKey: 'requestedBy' });
ChangeRequest.belongsTo(User, { as: 'requester', foreignKey: 'requestedBy' });

User.hasMany(ChangeRequest, { as: 'approvedChanges', foreignKey: 'approvedBy' });
ChangeRequest.belongsTo(User, { as: 'approver', foreignKey: 'approvedBy' });

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
  Project: ProjectModel,
  Task: TaskModel,
  Resource,
  Cost: CostModel,
  Risk: RiskModel,
  Quality: QualityModel,
  Communication: CommunicationModel,
  Procurement: ProcurementModel,
  Stakeholder: StakeholderModel,
  ChangeRequest: ChangeRequestModel,
  ProjectCharter: ProjectCharterModel,
  ProjectClosure: ProjectClosureModel,
  Material: MaterialModel,
  Equipment: EquipmentModel,
  Labor: LaborModel,
  Budget: BudgetModel,
  Report
}; 