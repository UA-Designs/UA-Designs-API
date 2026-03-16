const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const baseOptions = {
  dialect: dbConfig.dialect,
  storage: dbConfig.storage,
  logging: dbConfig.logging,
  dialectOptions: dbConfig.dialectOptions,
  pool: dbConfig.pool
};

const sequelize = dbConfig.use_env_variable && process.env[dbConfig.use_env_variable]
  ? new Sequelize(process.env[dbConfig.use_env_variable], baseOptions)
  : new Sequelize({
      database: dbConfig.database,
      username: dbConfig.username,
      password: dbConfig.password,
      host: dbConfig.host,
      port: dbConfig.port,
      ...baseOptions
    });

// Import core models for the 5 knowledge areas
const User = require('./User/index')(sequelize, Sequelize);
const Project = require('./Project/index')(sequelize, Sequelize);

// Schedule Management
const { Task, TaskDependency } = require('./Schedule');

// Cost Management
const { CostModel: Cost, Budget, Expense, CostCategory, SiteUsage } = require('./Cost');

// Resource Management
const { Material, Labor, Equipment, TeamMember, SkillsMatrix, ResourceAllocation, EquipmentMaintenance } = require('./Resources');

// Risk Management
const { RiskModel: Risk, RiskMitigation, RiskCategory } = require('./Risk');

// Stakeholder Management
const Stakeholder = require('./Stakeholder/index');
const Communication = require('./Stakeholder/Communication/index');
const StakeholderEngagement = require('./Stakeholder/StakeholderEngagement/index');

// Audit Log
const AuditLogDef = require('./AuditLog/index');

// Initialize models with sequelize
const ProjectModel = Project;
const TaskModel = Task(sequelize, Sequelize);
const TaskDependencyModel = TaskDependency(sequelize, Sequelize);
const CostModel = Cost(sequelize, Sequelize);
const BudgetModel = Budget(sequelize, Sequelize);
const ExpenseModel = Expense(sequelize, Sequelize);
const CostCategoryModel = CostCategory(sequelize, Sequelize);
const MaterialModel = Material(sequelize, Sequelize);
const LaborModel = Labor(sequelize, Sequelize);
const EquipmentModel = Equipment(sequelize, Sequelize);
const TeamMemberModel = TeamMember(sequelize, Sequelize);
const SkillsMatrixModel = SkillsMatrix(sequelize, Sequelize);
const ResourceAllocationModel = ResourceAllocation(sequelize, Sequelize);
const EquipmentMaintenanceModel = EquipmentMaintenance(sequelize, Sequelize);
const RiskModel = Risk(sequelize, Sequelize);
const RiskMitigationModel = RiskMitigation(sequelize, Sequelize);
const RiskCategoryModel = RiskCategory(sequelize, Sequelize);
const StakeholderModel = Stakeholder(sequelize, Sequelize);
const CommunicationModel = Communication(sequelize, Sequelize);
const StakeholderEngagementModel = StakeholderEngagement(sequelize, Sequelize);
const AuditLogModel = AuditLogDef(sequelize, Sequelize);

const SiteUsageModel = SiteUsage(sequelize, Sequelize);

// Define associations for core knowledge areas

// Project associations
ProjectModel.hasMany(TaskModel, { as: 'tasks', foreignKey: 'projectId' });
TaskModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

ProjectModel.hasMany(BudgetModel, { as: 'budgets', foreignKey: 'projectId' });
BudgetModel.belongsTo(ProjectModel, { as: 'project', foreignKey: 'projectId' });

ProjectModel.hasMany(ExpenseModel, { as: 'expenses', foreignKey: 'projectId' });
ExpenseModel.belongsTo(ProjectModel, { as: 'project', foreignKey: 'projectId' });

ProjectModel.hasMany(CostModel, { as: 'costs', foreignKey: 'projectId' });
CostModel.belongsTo(ProjectModel, { as: 'project', foreignKey: 'projectId' });

ProjectModel.hasMany(SiteUsageModel, { as: 'siteUsage', foreignKey: 'projectId' });
SiteUsageModel.belongsTo(ProjectModel, { as: 'project', foreignKey: 'projectId' });

ProjectModel.hasMany(RiskModel, { as: 'risks', foreignKey: 'projectId' });
RiskModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

ProjectModel.hasMany(StakeholderModel, { as: 'stakeholders', foreignKey: 'projectId' });
StakeholderModel.belongsTo(ProjectModel, { as: 'project', foreignKey: 'projectId' });

ProjectModel.hasMany(MaterialModel, { as: 'materials', foreignKey: 'projectId' });
MaterialModel.belongsTo(ProjectModel, { as: 'project', foreignKey: 'projectId' });

ProjectModel.hasMany(LaborModel, { as: 'labor', foreignKey: 'projectId' });
LaborModel.belongsTo(ProjectModel, { as: 'project', foreignKey: 'projectId' });

ProjectModel.hasMany(EquipmentModel, { as: 'equipment', foreignKey: 'projectId' });
EquipmentModel.belongsTo(ProjectModel, { as: 'project', foreignKey: 'projectId' });

// User associations
User.hasMany(ProjectModel, { as: 'managedProjects', foreignKey: 'projectManagerId' });
ProjectModel.belongsTo(User, { as: 'projectManager', foreignKey: 'projectManagerId' });

User.hasMany(TaskModel, { as: 'assignedTasks', foreignKey: 'assignedTo' });
TaskModel.belongsTo(User, { as: 'assignedUser', foreignKey: 'assignedTo' });

User.hasMany(StakeholderModel, { as: 'stakeholderRoles', foreignKey: 'userId' });
StakeholderModel.belongsTo(User, { as: 'user', foreignKey: 'userId' });

// 1. Schedule Management
// Task associations
TaskModel.hasMany(TaskDependencyModel, { as: 'predecessorDependencies', foreignKey: 'predecessorTaskId' });
TaskModel.hasMany(TaskDependencyModel, { as: 'successorDependencies', foreignKey: 'successorTaskId' });
TaskDependencyModel.belongsTo(TaskModel, { as: 'predecessorTask', foreignKey: 'predecessorTaskId' });
TaskDependencyModel.belongsTo(TaskModel, { as: 'successorTask', foreignKey: 'successorTaskId' });

// Task-resource associations are handled through Material, Labor, Equipment models

// 2. Cost Management
BudgetModel.hasMany(ExpenseModel, { as: 'expenses', foreignKey: 'budgetId' });
ExpenseModel.belongsTo(BudgetModel, { as: 'budget', foreignKey: 'budgetId' });

BudgetModel.hasMany(CostModel, { as: 'costs', foreignKey: 'budgetId' });
CostModel.belongsTo(BudgetModel, { foreignKey: 'budgetId' });

CostCategoryModel.hasMany(ExpenseModel, { as: 'expenses', foreignKey: 'categoryId' });
ExpenseModel.belongsTo(CostCategoryModel, { as: 'costCategory', foreignKey: 'categoryId' });

CostCategoryModel.hasMany(CostModel, { as: 'costs', foreignKey: 'categoryId' });
CostModel.belongsTo(CostCategoryModel, { as: 'costCategory', foreignKey: 'categoryId' });

TaskModel.hasMany(CostModel, { as: 'taskCosts', foreignKey: 'taskId' });
CostModel.belongsTo(TaskModel, { foreignKey: 'taskId' });

TaskModel.hasMany(ExpenseModel, { as: 'taskExpenses', foreignKey: 'taskId' });
ExpenseModel.belongsTo(TaskModel, { as: 'task', foreignKey: 'taskId' });

CostModel.hasMany(SiteUsageModel, { as: 'siteUsage', foreignKey: 'costId' });
SiteUsageModel.belongsTo(CostModel, { as: 'cost', foreignKey: 'costId' });

// 3. Resource Management - Team Members
ProjectModel.hasMany(TeamMemberModel, { as: 'teamMembers', foreignKey: 'projectId' });
TeamMemberModel.belongsTo(ProjectModel, { as: 'project', foreignKey: 'projectId' });

User.hasMany(TeamMemberModel, { as: 'projectAssignments', foreignKey: 'userId' });
TeamMemberModel.belongsTo(User, { as: 'user', foreignKey: 'userId' });

TeamMemberModel.hasMany(SkillsMatrixModel, { as: 'skills', foreignKey: 'teamMemberId' });
SkillsMatrixModel.belongsTo(TeamMemberModel, { as: 'teamMember', foreignKey: 'teamMemberId' });

// Resource Allocations
ProjectModel.hasMany(ResourceAllocationModel, { as: 'resourceAllocations', foreignKey: 'projectId' });
ResourceAllocationModel.belongsTo(ProjectModel, { as: 'project', foreignKey: 'projectId' });

TaskModel.hasMany(ResourceAllocationModel, { as: 'resourceAllocations', foreignKey: 'taskId' });
ResourceAllocationModel.belongsTo(TaskModel, { as: 'task', foreignKey: 'taskId' });

// Equipment Maintenance
EquipmentModel.hasMany(EquipmentMaintenanceModel, { as: 'maintenanceRecords', foreignKey: 'equipmentId' });
EquipmentMaintenanceModel.belongsTo(EquipmentModel, { as: 'equipment', foreignKey: 'equipmentId' });

// 4. Risk Management
TaskModel.hasMany(RiskModel, { as: 'risks', foreignKey: 'taskId' });
RiskModel.belongsTo(TaskModel, { foreignKey: 'taskId' });

// Risk Mitigations
RiskModel.hasMany(RiskMitigationModel, { as: 'mitigations', foreignKey: 'riskId' });
RiskMitigationModel.belongsTo(RiskModel, { as: 'risk', foreignKey: 'riskId' });

// Risk Categories
RiskCategoryModel.hasMany(RiskModel, { as: 'risks', foreignKey: 'categoryId' });
RiskModel.belongsTo(RiskCategoryModel, { as: 'riskCategory', foreignKey: 'categoryId' });

// Risk User associations
User.hasMany(RiskModel, { as: 'identifiedRisks', foreignKey: 'identifiedBy' });
RiskModel.belongsTo(User, { as: 'identifier', foreignKey: 'identifiedBy' });

User.hasMany(RiskModel, { as: 'ownedRisks', foreignKey: 'owner' });
RiskModel.belongsTo(User, { as: 'riskOwner', foreignKey: 'owner' });

User.hasMany(RiskModel, { as: 'escalatedRisks', foreignKey: 'escalatedTo' });
RiskModel.belongsTo(User, { as: 'escalatee', foreignKey: 'escalatedTo' });

// Mitigation User associations
User.hasMany(RiskMitigationModel, { as: 'responsibleMitigations', foreignKey: 'responsible' });
RiskMitigationModel.belongsTo(User, { as: 'responsibleUser', foreignKey: 'responsible' });

User.hasMany(RiskMitigationModel, { as: 'createdMitigations', foreignKey: 'createdBy' });
RiskMitigationModel.belongsTo(User, { as: 'creator', foreignKey: 'createdBy' });

// 5. Stakeholder Management
StakeholderModel.hasMany(CommunicationModel, { as: 'communications', foreignKey: 'stakeholderId' });
CommunicationModel.belongsTo(StakeholderModel, { as: 'stakeholder', foreignKey: 'stakeholderId' });

CommunicationModel.belongsTo(ProjectModel, { as: 'project', foreignKey: 'projectId' });
ProjectModel.hasMany(CommunicationModel, { as: 'communications', foreignKey: 'projectId' });

CommunicationModel.belongsTo(User, { as: 'sender', foreignKey: 'sentBy' });
User.hasMany(CommunicationModel, { as: 'sentCommunications', foreignKey: 'sentBy' });

StakeholderModel.hasMany(StakeholderEngagementModel, { as: 'engagements', foreignKey: 'stakeholderId' });
StakeholderEngagementModel.belongsTo(StakeholderModel, { as: 'stakeholder', foreignKey: 'stakeholderId' });

StakeholderEngagementModel.belongsTo(ProjectModel, { as: 'project', foreignKey: 'projectId' });
ProjectModel.hasMany(StakeholderEngagementModel, { as: 'stakeholderEngagements', foreignKey: 'projectId' });

StakeholderEngagementModel.belongsTo(User, { as: 'assessor', foreignKey: 'assessedBy' });
User.hasMany(StakeholderEngagementModel, { as: 'conductedEngagements', foreignKey: 'assessedBy' });

// 6. Audit Log
User.hasMany(AuditLogModel, { as: 'auditLogs', foreignKey: 'userId' });
AuditLogModel.belongsTo(User, { as: 'user', foreignKey: 'userId' });

// Expense User associations (submitter / approver)
User.hasMany(ExpenseModel, { as: 'submittedExpenses', foreignKey: 'submittedBy' });
ExpenseModel.belongsTo(User, { as: 'submitter', foreignKey: 'submittedBy' });

User.hasMany(ExpenseModel, { as: 'approvedExpenses', foreignKey: 'approvedBy' });
ExpenseModel.belongsTo(User, { as: 'approver', foreignKey: 'approvedBy' });

module.exports = {
  sequelize,
  Sequelize,
  User,
  Project: ProjectModel,
  Task: TaskModel,
  TaskDependency: TaskDependencyModel,
  Cost: CostModel,
  Risk: RiskModel,
  RiskMitigation: RiskMitigationModel,
  RiskCategory: RiskCategoryModel,
  Stakeholder: StakeholderModel,
  Communication: CommunicationModel,
  StakeholderEngagement: StakeholderEngagementModel,
  Material: MaterialModel,
  Equipment: EquipmentModel,
  Labor: LaborModel,
  Budget: BudgetModel,
  Expense: ExpenseModel,
  CostCategory: CostCategoryModel,
  TeamMember: TeamMemberModel,
  SkillsMatrix: SkillsMatrixModel,
  ResourceAllocation: ResourceAllocationModel,
  EquipmentMaintenance: EquipmentMaintenanceModel,
  AuditLog: AuditLogModel,
  SiteUsage: SiteUsageModel
}; 