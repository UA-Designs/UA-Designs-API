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
const { 
  Project, 
  ChangeRequest, 
  ProjectCharter, 
  ProjectClosure,
  LessonsLearned,
  ProjectTemplate,
  ApprovalWorkflow,
  ChangeImpact
} = require('./Integration');

// PMBOK Schedule Management
const { Task } = require('./Schedule');

// PMBOK Cost Management
const { CostModel: Cost, Budget, Expense, CostCategory } = require('./Cost');

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
const LessonsLearnedModel = LessonsLearned(sequelize, Sequelize);
const ProjectTemplateModel = ProjectTemplate(sequelize, Sequelize);
const ApprovalWorkflowModel = ApprovalWorkflow(sequelize, Sequelize);
const ChangeImpactModel = ChangeImpact(sequelize, Sequelize);
const TaskModel = Task(sequelize, Sequelize);
const CostModel = Cost(sequelize, Sequelize);
const BudgetModel = Budget(sequelize, Sequelize);
const ExpenseModel = Expense(sequelize, Sequelize);
const CostCategoryModel = CostCategory(sequelize, Sequelize);
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
User.hasMany(ProjectCharterModel, { as: 'sponsoredCharters', foreignKey: 'projectSponsor' });
ProjectCharterModel.belongsTo(User, { as: 'sponsor', foreignKey: 'projectSponsor' });

User.hasMany(ProjectCharterModel, { as: 'managedCharters', foreignKey: 'projectManager' });
ProjectCharterModel.belongsTo(User, { as: 'charterManager', foreignKey: 'projectManager' });

// Project Closure associations
User.hasMany(ProjectClosureModel, { as: 'managedClosures', foreignKey: 'projectManager' });
ProjectClosureModel.belongsTo(User, { as: 'closureManager', foreignKey: 'projectManager' });

// Change Request associations
User.hasMany(ChangeRequestModel, { as: 'requestedChanges', foreignKey: 'requestedBy' });
ChangeRequestModel.belongsTo(User, { as: 'requester', foreignKey: 'requestedBy' });

User.hasMany(ChangeRequestModel, { as: 'approvedChanges', foreignKey: 'approvedBy' });
ChangeRequestModel.belongsTo(User, { as: 'approver', foreignKey: 'approvedBy' });

// 2. Project Scope Management
ProjectModel.hasMany(StakeholderModel, { as: 'stakeholders', foreignKey: 'projectId' });
StakeholderModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

// 3. Project Schedule Management
// Task-Project association already defined in Integration Management

// 4. Project Cost Management
ProjectModel.hasMany(BudgetModel, { as: 'budgets', foreignKey: 'projectId' });
BudgetModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

ProjectModel.hasMany(CostModel, { as: 'costs', foreignKey: 'projectId' });
CostModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

TaskModel.hasMany(CostModel, { as: 'costs', foreignKey: 'taskId' });
CostModel.belongsTo(TaskModel, { foreignKey: 'taskId' });

// 5. Project Quality Management
ProjectModel.hasMany(QualityModel, { as: 'qualityChecks', foreignKey: 'projectId' });
QualityModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

TaskModel.hasMany(QualityModel, { as: 'qualityChecks', foreignKey: 'taskId' });
QualityModel.belongsTo(TaskModel, { foreignKey: 'taskId' });

// 6. Project Resource Management
ProjectModel.hasMany(Resource, { as: 'resources', foreignKey: 'projectId' });
Resource.belongsTo(ProjectModel, { foreignKey: 'projectId' });

ProjectModel.hasMany(MaterialModel, { as: 'materials', foreignKey: 'projectId' });
MaterialModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

ProjectModel.hasMany(EquipmentModel, { as: 'equipment', foreignKey: 'projectId' });
EquipmentModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

ProjectModel.hasMany(LaborModel, { as: 'labor', foreignKey: 'projectId' });
LaborModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

TaskModel.hasMany(Resource, { as: 'resources', foreignKey: 'taskId' });
Resource.belongsTo(TaskModel, { foreignKey: 'taskId' });

// 7. Project Communications Management
ProjectModel.hasMany(CommunicationModel, { as: 'communications', foreignKey: 'projectId' });
CommunicationModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

User.hasMany(CommunicationModel, { as: 'communications', foreignKey: 'userId' });
CommunicationModel.belongsTo(User, { foreignKey: 'userId' });

// 8. Project Risk Management
ProjectModel.hasMany(RiskModel, { as: 'risks', foreignKey: 'projectId' });
RiskModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

TaskModel.hasMany(RiskModel, { as: 'risks', foreignKey: 'taskId' });
RiskModel.belongsTo(TaskModel, { foreignKey: 'taskId' });

// 9. Project Procurement Management
ProjectModel.hasMany(ProcurementModel, { as: 'procurements', foreignKey: 'projectId' });
ProcurementModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

MaterialModel.hasMany(ProcurementModel, { as: 'procurements', foreignKey: 'materialId' });
ProcurementModel.belongsTo(MaterialModel, { foreignKey: 'materialId' });

// 10. Project Stakeholder Management
User.hasMany(StakeholderModel, { as: 'stakeholderRoles', foreignKey: 'userId' });
StakeholderModel.belongsTo(User, { foreignKey: 'userId' });

// Reports and Analytics
ProjectModel.hasMany(Report, { as: 'reports', foreignKey: 'projectId' });
Report.belongsTo(ProjectModel, { foreignKey: 'projectId' });

User.hasMany(Report, { as: 'reports', foreignKey: 'userId' });
Report.belongsTo(User, { foreignKey: 'userId' });

// User associations
User.hasMany(ProjectModel, { as: 'managedProjects', foreignKey: 'projectManagerId' });
ProjectModel.belongsTo(User, { as: 'projectManager', foreignKey: 'projectManagerId' });

User.hasMany(TaskModel, { as: 'assignedTasks', foreignKey: 'assignedTo' });
TaskModel.belongsTo(User, { as: 'assignedUser', foreignKey: 'assignedTo' });

// User-Task associations for created tasks (field not yet implemented)
// User.hasMany(TaskModel, { as: 'createdTasks', foreignKey: 'createdById' });
// TaskModel.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });

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
  LessonsLearned: LessonsLearnedModel,
  ProjectTemplate: ProjectTemplateModel,
  ApprovalWorkflow: ApprovalWorkflowModel,
  ChangeImpact: ChangeImpactModel,
  Material: MaterialModel,
  Equipment: EquipmentModel,
  Labor: LaborModel,
  Budget: BudgetModel,
  Expense: ExpenseModel,
  CostCategory: CostCategoryModel,
  Report
}; 