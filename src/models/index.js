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

// Import core models for the 5 knowledge areas
const User = require('./User/index')(sequelize, Sequelize);
const Project = require('./Project/index')(sequelize, Sequelize);

// Schedule Management
const { Task } = require('./Schedule');

// Cost Management
const { CostModel: Cost, Budget, Expense, CostCategory } = require('./Cost');

// Resource Management
const { Material, Labor, Equipment } = require('./Resources');

// Risk Management
const { RiskModel: Risk } = require('./Risk');

// Stakeholder Management
const Stakeholder = require('./Stakeholder/index');

// Initialize models with sequelize
const ProjectModel = Project;
const TaskModel = Task(sequelize, Sequelize);
const CostModel = Cost(sequelize, Sequelize);
const BudgetModel = Budget(sequelize, Sequelize);
const ExpenseModel = Expense(sequelize, Sequelize);
const CostCategoryModel = CostCategory(sequelize, Sequelize);
const MaterialModel = Material(sequelize, Sequelize);
const LaborModel = Labor(sequelize, Sequelize);
const EquipmentModel = Equipment(sequelize, Sequelize);
const RiskModel = Risk(sequelize, Sequelize);
const StakeholderModel = Stakeholder(sequelize, Sequelize);

// Define associations for core knowledge areas

// Project associations
ProjectModel.hasMany(TaskModel, { as: 'tasks', foreignKey: 'projectId' });
TaskModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

ProjectModel.hasMany(BudgetModel, { as: 'budgets', foreignKey: 'projectId' });
BudgetModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

ProjectModel.hasMany(RiskModel, { as: 'risks', foreignKey: 'projectId' });
RiskModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

ProjectModel.hasMany(StakeholderModel, { as: 'stakeholders', foreignKey: 'projectId' });
StakeholderModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

ProjectModel.hasMany(MaterialModel, { as: 'materials', foreignKey: 'projectId' });
MaterialModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

ProjectModel.hasMany(LaborModel, { as: 'labor', foreignKey: 'projectId' });
LaborModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

ProjectModel.hasMany(EquipmentModel, { as: 'equipment', foreignKey: 'projectId' });
EquipmentModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

// User associations
User.hasMany(ProjectModel, { as: 'managedProjects', foreignKey: 'projectManagerId' });
ProjectModel.belongsTo(User, { as: 'projectManager', foreignKey: 'projectManagerId' });

User.hasMany(TaskModel, { as: 'assignedTasks', foreignKey: 'assignedTo' });
TaskModel.belongsTo(User, { as: 'assignedUser', foreignKey: 'assignedTo' });

User.hasMany(StakeholderModel, { as: 'stakeholderRoles', foreignKey: 'userId' });
StakeholderModel.belongsTo(User, { foreignKey: 'userId' });

// 1. Schedule Management
// Task-resource associations are handled through Material, Labor, Equipment models

// 2. Cost Management
BudgetModel.hasMany(ExpenseModel, { as: 'expenses', foreignKey: 'budgetId' });
ExpenseModel.belongsTo(BudgetModel, { foreignKey: 'budgetId' });

CostCategoryModel.hasMany(ExpenseModel, { as: 'expenses', foreignKey: 'categoryId' });
ExpenseModel.belongsTo(CostCategoryModel, { foreignKey: 'categoryId' });

TaskModel.hasMany(CostModel, { as: 'costs', foreignKey: 'taskId' });
CostModel.belongsTo(TaskModel, { foreignKey: 'taskId' });

ProjectModel.hasMany(CostModel, { as: 'costs', foreignKey: 'projectId' });
CostModel.belongsTo(ProjectModel, { foreignKey: 'projectId' });

CostCategoryModel.hasMany(CostModel, { as: 'costs', foreignKey: 'categoryId' });
CostModel.belongsTo(CostCategoryModel, { as: 'categoryRef', foreignKey: 'categoryId' });

// 3. Resource Management
// Already defined above

// 4. Risk Management
TaskModel.hasMany(RiskModel, { as: 'risks', foreignKey: 'taskId' });
RiskModel.belongsTo(TaskModel, { foreignKey: 'taskId' });

// 5. Stakeholder Management
// Already defined above

module.exports = {
  sequelize,
  Sequelize,
  User,
  Project: ProjectModel,
  Task: TaskModel,
  Cost: CostModel,
  Risk: RiskModel,
  Stakeholder: StakeholderModel,
  Material: MaterialModel,
  Equipment: EquipmentModel,
  Labor: LaborModel,
  Budget: BudgetModel,
  Expense: ExpenseModel,
  CostCategory: CostCategoryModel
}; 