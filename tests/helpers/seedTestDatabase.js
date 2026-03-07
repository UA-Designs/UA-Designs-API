'use strict';

/**
 * Comprehensive Test Seed — UA Designs API
 *
 * Populates an in-memory SQLite database with realistic, fully-interconnected
 * data covering every model, every ENUM value, every status state, and critical
 * edge cases required by the integration test suite.
 *
 * Usage:
 *   const seedTestDatabase = require('../helpers/seedTestDatabase');
 *   const { sequelize } = require('../../src/models');
 *
 *   let seed;
 *   beforeAll(async () => {
 *     await sequelize.sync({ force: true });
 *     seed = await seedTestDatabase();
 *   });
 *
 * Returns a structured object — see the bottom of this file for the full shape.
 */

const bcrypt = require('bcryptjs');
const {
  User,
  Project,
  Task,
  TaskDependency,
  Budget,
  Expense,
  Cost,
  CostCategory,
  Material,
  Labor,
  Equipment,
  TeamMember,
  SkillsMatrix,
  ResourceAllocation,
  EquipmentMaintenance,
  Risk,
  RiskMitigation,
  RiskCategory,
  Stakeholder,
  Communication,
  StakeholderEngagement,
  AuditLog,
} = require('../../src/models');

// ─── Constants ───────────────────────────────────────────────────────────────

/** Plain-text password used for every test user. */
const TEST_PASSWORD = 'password123';

// Pre-hash once so `beforeAll` doesn't repeat bcrypt 10 times
let _hashedPassword = null;
async function getHashedPassword() {
  if (!_hashedPassword) {
    _hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
  }
  return _hashedPassword;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Seeds the test database and returns all created records in a structured
 * object, keyed by descriptive names for easy reference in tests.
 *
 * Must be called after `sequelize.sync({ force: true })`.
 *
 * @returns {Promise<SeedResult>}
 */
async function seedTestDatabase() {
  const hash = await getHashedPassword();

  // ── Step 2: Users ────────────────────────────────────────────────────────────

  const admin = await User.create({
    firstName: 'King Christian',
    lastName: 'Uy',
    email: 'admin@uadesigns.com',
    password: hash,
    phone: '+63-912-000-0001',
    role: 'ADMIN',
    employeeId: 'UA-ADMIN-001',
    department: 'Management',
    hireDate: new Date('2019-01-01'),
    isActive: true,
    approvalLevel: 'FINAL',
    officeLocation: 'Head Office',
    specializations: ['Project Management', 'Civil Engineering'],
    certifications: ['PRC Civil Engineer', 'PMP'],
  });

  const projectManager = await User.create({
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'pm@uadesigns.com',
    password: hash,
    phone: '+63-912-000-0002',
    role: 'PROJECT_MANAGER',
    employeeId: 'UA-PM-001',
    department: 'Projects',
    hireDate: new Date('2020-03-15'),
    isActive: true,
    approvalLevel: 'HIGH',
    officeLocation: 'Head Office',
  });

  const civilEngineer = await User.create({
    firstName: 'Jose',
    lastName: 'Reyes',
    email: 'civil@uadesigns.com',
    password: hash,
    phone: '+63-912-000-0003',
    role: 'ENGINEER',
    employeeId: 'UA-CE-001',
    department: 'Engineering',
    hireDate: new Date('2020-06-01'),
    isActive: true,
    approvalLevel: 'MEDIUM',
    specializations: ['Structural Engineering', 'Materials'],
  });

  const architect = await User.create({
    firstName: 'Mary Claire',
    lastName: 'Anyayahan',
    email: 'architect@uadesigns.com',
    password: hash,
    phone: '+63-912-000-0004',
    role: 'ENGINEER',
    employeeId: 'UA-ARCH-001',
    department: 'Design',
    hireDate: new Date('2019-06-01'),
    isActive: true,
    approvalLevel: 'MEDIUM',
    specializations: ['Architectural Design', 'Finishing Materials'],
    certifications: ['PRC Architect'],
  });

  const siteEngineer = await User.create({
    firstName: 'Ramon',
    lastName: 'Dela Cruz',
    email: 'site@uadesigns.com',
    password: hash,
    phone: '+63-912-000-0005',
    role: 'ENGINEER',
    employeeId: 'UA-SE-001',
    department: 'Engineering',
    hireDate: new Date('2021-01-10'),
    isActive: true,
    approvalLevel: 'LOW',
  });

  const juniorArchitect = await User.create({
    firstName: 'Ana',
    lastName: 'Garcia',
    email: 'jr.architect@uadesigns.com',
    password: hash,
    phone: '+63-912-000-0006',
    role: 'ENGINEER',
    employeeId: 'UA-JA-001',
    department: 'Design',
    hireDate: new Date('2022-02-01'),
    isActive: true,
    approvalLevel: 'NONE',
  });

  const apprentice = await User.create({
    firstName: 'Carlo',
    lastName: 'Mendoza',
    email: 'apprentice@uadesigns.com',
    password: hash,
    phone: '+63-912-000-0007',
    role: 'ENGINEER',
    employeeId: 'UA-AA-001',
    department: 'Design',
    hireDate: new Date('2023-06-01'),
    isActive: true,
    approvalLevel: 'NONE',
  });

  const bookkeeper = await User.create({
    firstName: 'Lourdes',
    lastName: 'Tan',
    email: 'bookkeeper@uadesigns.com',
    password: hash,
    phone: '+63-912-000-0008',
    role: 'STAFF',
    employeeId: 'UA-BK-001',
    department: 'Finance',
    hireDate: new Date('2020-01-01'),
    isActive: true,
    approvalLevel: 'LOW',
    costCenter: 'FINANCE-001',
  });

  const secretary = await User.create({
    firstName: 'Grace',
    lastName: 'Villanueva',
    email: 'secretary@uadesigns.com',
    password: hash,
    phone: '+63-912-000-0009',
    role: 'STAFF',
    employeeId: 'UA-SEC-001',
    department: 'Administration',
    hireDate: new Date('2021-07-01'),
    isActive: true,
    approvalLevel: 'NONE',
  });

  // ── Demo accounts — one per RBAC tier (simple login credentials) ──────────

  const demoManager = await User.create({
    firstName: 'Demo',
    lastName: 'Manager',
    email: 'manager@uadesigns.com',
    password: hash,
    phone: '+63-912-000-0100',
    role: 'PROJECT_MANAGER',
    employeeId: 'UA-DEMO-PM',
    department: 'Projects',
    hireDate: new Date('2023-01-01'),
    isActive: true,
    approvalLevel: 'HIGH',
    officeLocation: 'Head Office',
  });

  const demoEngineer = await User.create({
    firstName: 'Demo',
    lastName: 'Engineer',
    email: 'engineer@uadesigns.com',
    password: hash,
    phone: '+63-912-000-0101',
    role: 'ENGINEER',
    employeeId: 'UA-DEMO-ENG',
    department: 'Engineering',
    hireDate: new Date('2023-03-01'),
    isActive: true,
    approvalLevel: 'MEDIUM',
    specializations: ['Structural Engineering'],
  });

  const demoStaff = await User.create({
    firstName: 'Demo',
    lastName: 'Staff',
    email: 'staff@uadesigns.com',
    password: hash,
    phone: '+63-912-000-0102',
    role: 'STAFF',
    employeeId: 'UA-DEMO-STF',
    department: 'Finance',
    hireDate: new Date('2023-06-01'),
    isActive: true,
    approvalLevel: 'NONE',
  });

  // Edge case 1: inactive user (for auth middleware tests)
  const inactiveUser = await User.create({
    firstName: 'Deactivated',
    lastName: 'Staff',
    email: 'inactive@uadesigns.com',
    password: hash,
    phone: '+63-912-000-0010',
    role: 'ENGINEER',
    employeeId: 'UA-SE-999',
    department: 'Engineering',
    hireDate: new Date('2021-01-01'),
    isActive: false,
    approvalLevel: 'NONE',
  });

  // ── Step 3: Projects ─────────────────────────────────────────────────────────

  const residential = await Project.create({
    name: 'Residential Complex A',
    description: 'Modern residential complex with 50 units',
    projectType: 'residential',
    status: 'active',
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-08-30'),
    budget: 2500000.00,
    projectManagerId: projectManager.id,
    clientName: 'ABC Development Corp',
    clientEmail: 'contact@abcdev.com',
    clientPhone: '+63-2-8888-0001',
    location: '123 Ayala Avenue, Makati City',
    priority: 'high',
    progress: 65,
    isActive: true,
  });

  const commercial = await Project.create({
    name: 'Commercial Building B',
    description: 'Office building with retail space',
    projectType: 'commercial',
    status: 'planning',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-12-15'),
    budget: 3500000.00,
    projectManagerId: projectManager.id,
    clientName: 'XYZ Corporation',
    clientEmail: 'info@xyzcorp.com',
    clientPhone: '+63-2-8888-0002',
    location: '456 EDSA, Quezon City',
    priority: 'medium',
    progress: 15,
    isActive: true,
  });

  const infrastructure = await Project.create({
    name: 'Infrastructure Upgrade C',
    description: 'Road and drainage infrastructure upgrade',
    projectType: 'infrastructure',
    status: 'on_hold',
    startDate: new Date('2024-06-01'),
    endDate: new Date('2025-03-31'),
    budget: 1200000.00,
    projectManagerId: civilEngineer.id,
    clientName: 'Metro Infrastructure Authority',
    clientEmail: 'projects@mia.gov.ph',
    clientPhone: '+63-2-8888-0003',
    location: 'Caloocan City',
    priority: 'low',
    progress: 0,
    isActive: true,
  });

  // Edge case 2: zero-budget project (for division-by-zero guards)
  const zeroBudgetProject = await Project.create({
    name: 'Zero Budget Feasibility Study',
    description: 'Feasibility study — no budget allocated yet',
    projectType: 'renovation',
    status: 'planning',
    startDate: new Date('2024-09-01'),
    endDate: new Date('2024-10-31'),
    budget: 0.00,
    projectManagerId: projectManager.id,
    clientName: 'Internal',
    priority: 'low',
    progress: 0,
    isActive: true,
  });

  // Edge case: soft-deleted project (tests that paranoid queries exclude it)
  const deletedProject = await Project.create({
    name: 'DELETED Archived Project',
    description: 'This project has been soft-deleted',
    projectType: 'residential',
    status: 'cancelled',
    startDate: new Date('2023-01-01'),
    endDate: new Date('2023-06-30'),
    budget: 500000.00,
    projectManagerId: admin.id,
    clientName: 'Old Client',
    priority: 'low',
    progress: 0,
    isActive: false,
  });
  await deletedProject.destroy(); // sets deletedAt — paranoid soft-delete

  // ── Step 4: Tasks + Dependencies ─────────────────────────────────────────────

  const foundation = await Task.create({
    name: 'Foundation Work',
    description: 'Excavation and foundation construction',
    projectId: residential.id,
    status: 'COMPLETED',
    priority: 'HIGH',
    startDate: new Date('2024-01-20'),
    endDate: new Date('2024-02-15'),
    plannedStartDate: new Date('2024-01-20'),
    plannedEndDate: new Date('2024-02-20'),
    actualStartDate: new Date('2024-01-20'),
    actualEndDate: new Date('2024-02-10'),
    duration: 26,
    plannedCost: 150000.00,
    actualCost: 140000.00,
    progress: 100,
    assignedTo: civilEngineer.id,
    isCritical: true,
    totalFloat: 0,
    freeFloat: 0,
    notes: 'Completed 5 days ahead of schedule',
  });

  const framing = await Task.create({
    name: 'Framing Work',
    description: 'Structural framing and roof installation',
    projectId: residential.id,
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    startDate: new Date('2024-02-16'),
    endDate: new Date('2024-04-15'),
    plannedStartDate: new Date('2024-02-16'),
    plannedEndDate: new Date('2024-04-15'),
    actualStartDate: new Date('2024-02-12'),
    duration: 59,
    plannedCost: 300000.00,
    actualCost: 180000.00,
    progress: 60,
    assignedTo: civilEngineer.id,
    isCritical: true,
    totalFloat: 0,
    freeFloat: 0,
  });

  const electrical = await Task.create({
    name: 'Electrical Work',
    description: 'Electrical installation and wiring',
    projectId: residential.id,
    status: 'NOT_STARTED',
    priority: 'HIGH',
    startDate: new Date('2024-04-16'),
    endDate: new Date('2024-06-15'),
    plannedStartDate: new Date('2024-04-16'),
    plannedEndDate: new Date('2024-06-15'),
    duration: 60,
    plannedCost: 200000.00,
    actualCost: 0.00,
    progress: 0,
    assignedTo: siteEngineer.id,
    isCritical: true,
    totalFloat: 0,
    freeFloat: 0,
  });

  const plumbing = await Task.create({
    name: 'Plumbing Work',
    description: 'Plumbing installation and fixtures',
    projectId: residential.id,
    status: 'NOT_STARTED',
    priority: 'MEDIUM',
    startDate: new Date('2024-04-16'),
    endDate: new Date('2024-06-15'),
    plannedStartDate: new Date('2024-04-16'),
    plannedEndDate: new Date('2024-06-15'),
    duration: 60,
    plannedCost: 180000.00,
    actualCost: 0.00,
    progress: 0,
    assignedTo: siteEngineer.id,
    isCritical: false,
    totalFloat: 5,
    freeFloat: 5,
  });

  const finishing = await Task.create({
    name: 'Interior Finishing',
    description: 'Interior fit-out, painting, and finishing works',
    projectId: residential.id,
    status: 'ON_HOLD',
    priority: 'LOW',
    startDate: new Date('2024-06-16'),
    endDate: new Date('2024-08-15'),
    plannedStartDate: new Date('2024-06-16'),
    plannedEndDate: new Date('2024-08-15'),
    duration: 60,
    plannedCost: 350000.00,
    actualCost: 0.00,
    progress: 0,
    assignedTo: architect.id,
    isCritical: false,
    totalFloat: 15,
    freeFloat: 10,
    notes: 'On hold pending client design sign-off',
  });

  const sitePrep = await Task.create({
    name: 'Site Preparation',
    description: 'Site clearing and preparation for construction',
    projectId: commercial.id,
    status: 'NOT_STARTED',
    priority: 'MEDIUM',
    startDate: new Date('2024-03-15'),
    endDate: new Date('2024-04-15'),
    plannedStartDate: new Date('2024-03-15'),
    plannedEndDate: new Date('2024-04-15'),
    duration: 31,
    plannedCost: 80000.00,
    actualCost: 0.00,
    progress: 0,
    assignedTo: civilEngineer.id,
    isCritical: false,
  });

  const designReview = await Task.create({
    name: 'Design Review',
    description: 'Architectural design review and approval',
    projectId: commercial.id,
    status: 'CANCELLED',
    priority: 'CRITICAL',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-03-14'),
    plannedStartDate: new Date('2024-03-01'),
    plannedEndDate: new Date('2024-03-14'),
    duration: 14,
    plannedCost: 20000.00,
    actualCost: 5000.00,
    progress: 25,
    assignedTo: architect.id,
    notes: 'Cancelled — design scope changed by client',
  });

  // Edge case: task with no assignee (infraPlanning)
  const infraPlanning = await Task.create({
    name: 'Infrastructure Planning',
    description: 'Detailed planning and scope definition',
    projectId: infrastructure.id,
    status: 'NOT_STARTED',
    priority: 'HIGH',
    startDate: new Date('2024-06-01'),
    endDate: new Date('2024-07-31'),
    plannedStartDate: new Date('2024-06-01'),
    plannedEndDate: new Date('2024-07-31'),
    duration: 61,
    plannedCost: 60000.00,
    actualCost: 0.00,
    progress: 0,
    assignedTo: null, // intentional: no assignee edge case
    isCritical: true,
  });

  // Task dependencies  — covers FINISH_TO_START, START_TO_START; hard + soft
  const depFoundationToFraming = await TaskDependency.create({
    predecessorTaskId: foundation.id,
    successorTaskId: framing.id,
    dependencyType: 'FINISH_TO_START',
    lag: 0,
    description: 'Foundation must be complete before framing begins',
    isHardDependency: true,
    createdBy: admin.id,
  });

  const depFramingToElectrical = await TaskDependency.create({
    predecessorTaskId: framing.id,
    successorTaskId: electrical.id,
    dependencyType: 'FINISH_TO_START',
    lag: 1,
    description: 'Framing must be complete before electrical work begins',
    isHardDependency: true,
    createdBy: admin.id,
  });

  const depFramingToPlumbing = await TaskDependency.create({
    predecessorTaskId: framing.id,
    successorTaskId: plumbing.id,
    dependencyType: 'FINISH_TO_START',
    lag: 1,
    description: 'Framing must be complete before plumbing work begins',
    isHardDependency: false, // soft dependency — intentional edge case
    createdBy: projectManager.id,
  });

  const depElectricalToFinishing = await TaskDependency.create({
    predecessorTaskId: electrical.id,
    successorTaskId: finishing.id,
    dependencyType: 'START_TO_START',
    lag: 5,
    description: 'Finishing can start 5 days after electrical begins',
    isHardDependency: false,
    createdBy: projectManager.id,
  });

  // ── Step 5: Cost Management ───────────────────────────────────────────────────

  // Cost Categories (7 types — one per ENUM value + one child category)
  const materialCategory = await CostCategory.create({
    name: 'Materials & Supply',
    description: 'Raw materials and construction supplies',
    type: 'MATERIAL',
    isActive: true,
    sortOrder: 1,
    color: '#3B82F6',
    icon: 'cube',
  });

  const materialSubCategory = await CostCategory.create({
    name: 'Structural Materials',
    description: 'Concrete, steel, and structural materials',
    type: 'MATERIAL',
    parentCategoryId: materialCategory.id, // child of materialCategory
    isActive: true,
    sortOrder: 2,
    color: '#1D4ED8',
  });

  const laborCategory = await CostCategory.create({
    name: 'Labor & Workforce',
    description: 'Direct and indirect labor costs',
    type: 'LABOR',
    isActive: true,
    sortOrder: 3,
    color: '#10B981',
    icon: 'users',
  });

  const equipmentCategory = await CostCategory.create({
    name: 'Equipment & Tools',
    description: 'Equipment rental, purchase, and operation costs',
    type: 'EQUIPMENT',
    isActive: true,
    sortOrder: 4,
    color: '#F59E0B',
    icon: 'wrench',
  });

  const overheadCategory = await CostCategory.create({
    name: 'General Overhead',
    description: 'Administrative and indirect overhead costs',
    type: 'OVERHEAD',
    isActive: true,
    sortOrder: 5,
    color: '#6B7280',
    icon: 'office-building',
  });

  const subcontractorCategory = await CostCategory.create({
    name: 'Subcontractor Work',
    description: 'Third-party subcontractor fees and contracts',
    type: 'SUBCONTRACTOR',
    isActive: true,
    sortOrder: 6,
    color: '#8B5CF6',
    icon: 'briefcase',
  });

  const permitsCategory = await CostCategory.create({
    name: 'Permits & Fees',
    description: 'Government permits, licenses, and regulatory fees',
    type: 'PERMITS',
    isActive: true,
    sortOrder: 7,
    color: '#EF4444',
    icon: 'document',
  });

  const otherCategory = await CostCategory.create({
    name: 'Miscellaneous',
    description: 'Other uncategorized costs',
    type: 'OTHER',
    isActive: true,
    sortOrder: 8,
    color: '#9CA3AF',
  });

  // Budgets — covers all 4 statuses: APPROVED, REVISED, PLANNED, CLOSED
  const constructionBudget = await Budget.create({
    name: 'Residential Complex A — Construction Budget',
    amount: 2000000.00,
    currency: 'PHP',
    description: 'Main construction budget for Residential Complex A',
    projectId: residential.id,
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-08-30'),
    contingency: 100000.00,
    managementReserve: 50000.00,
    status: 'APPROVED',
    createdBy: admin.id,
  });

  const materialsBudget = await Budget.create({
    name: 'Residential Complex A — Materials Budget',
    amount: 500000.00,
    currency: 'PHP',
    description: 'Materials procurement budget — revised after steel price increase',
    projectId: residential.id,
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-06-30'),
    contingency: 25000.00,
    managementReserve: 10000.00,
    status: 'REVISED',
    createdBy: admin.id,
  });

  const commercialBudget = await Budget.create({
    name: 'Commercial Building B — Phase 1 Budget',
    amount: 1500000.00,
    currency: 'PHP',
    description: 'Phase 1 budget for Commercial Building B',
    projectId: commercial.id,
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-07-31'),
    contingency: 75000.00,
    managementReserve: 30000.00,
    status: 'PLANNED',
    createdBy: admin.id,
  });

  const closedBudget = await Budget.create({
    name: 'Commercial Building B — Equipment Budget',
    amount: 400000.00,
    currency: 'PHP',
    description: 'Equipment rental and procurement budget — closed at project hold',
    projectId: commercial.id,
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-12-15'),
    contingency: 20000.00,
    managementReserve: 10000.00,
    status: 'CLOSED',
    createdBy: admin.id,
  });

  // Expenses — covers all 7 categories + all 4 statuses
  const concreteExpense = await Expense.create({
    name: 'Concrete Supply — Foundation',
    description: 'Ready-mix concrete for foundation pour',
    amount: 85000.00,
    currency: 'PHP',
    category: 'MATERIAL',
    date: new Date('2024-01-25'),
    projectId: residential.id,
    budgetId: materialsBudget.id,
    taskId: foundation.id,
    vendor: 'Metro Concrete Co.',
    invoiceNumber: 'INV-2024-001',
    status: 'PAID',
    submittedBy: bookkeeper.id,
    approvedBy: admin.id,
    approvedAt: new Date('2024-01-26'),
  });

  const steelExpense = await Expense.create({
    name: 'Steel Frame Materials',
    description: 'W-shape structural steel beams for framing',
    amount: 140000.00,
    currency: 'PHP',
    category: 'MATERIAL',
    date: new Date('2024-02-20'),
    projectId: residential.id,
    budgetId: materialsBudget.id,
    taskId: framing.id,
    vendor: 'SteelCraft Industries',
    invoiceNumber: 'INV-2024-002',
    status: 'PAID',
    submittedBy: bookkeeper.id,
    approvedBy: admin.id,
    approvedAt: new Date('2024-02-21'),
  });

  const laborExpense = await Expense.create({
    name: 'Labour — Foundation Crew',
    description: 'Labour costs for foundation crew, 4 weeks',
    amount: 55000.00,
    currency: 'PHP',
    category: 'LABOR',
    date: new Date('2024-02-10'),
    projectId: residential.id,
    budgetId: constructionBudget.id,
    taskId: foundation.id,
    vendor: 'BuildRight Contractors',
    invoiceNumber: 'INV-2024-003',
    status: 'PAID',
    submittedBy: bookkeeper.id,
    approvedBy: projectManager.id,
    approvedAt: new Date('2024-02-11'),
  });

  const craneExpense = await Expense.create({
    name: 'Crane Rental — March',
    description: 'Monthly tower crane rental for steel frame installation',
    amount: 18000.00,
    currency: 'PHP',
    category: 'EQUIPMENT',
    date: new Date('2024-03-01'),
    projectId: residential.id,
    budgetId: constructionBudget.id,
    taskId: framing.id,
    vendor: 'Heavy Lift Equipment Rentals',
    invoiceNumber: 'INV-2024-004',
    status: 'APPROVED',
    submittedBy: bookkeeper.id,
    approvedBy: projectManager.id,
    approvedAt: new Date('2024-03-02'),
  });

  // Edge case 5: expense with no budget link
  const permitExpense = await Expense.create({
    name: 'Site Permits & Fees',
    description: 'Construction permit and site inspection fees',
    amount: 12000.00,
    currency: 'PHP',
    category: 'PERMITS',
    date: new Date('2024-01-20'),
    projectId: residential.id,
    budgetId: null, // intentional: unlinked to any budget
    vendor: 'Makati City Building Office',
    invoiceNumber: 'PERMIT-2024-001',
    status: 'PAID',
    submittedBy: secretary.id,
    approvedBy: admin.id,
    approvedAt: new Date('2024-01-22'),
  });

  const subcontractorExpense = await Expense.create({
    name: 'Electrical Subcontractor Deposit',
    description: '50% deposit for electrical works subcontract',
    amount: 30000.00,
    currency: 'PHP',
    category: 'SUBCONTRACTOR',
    date: new Date('2024-04-01'),
    projectId: residential.id,
    budgetId: constructionBudget.id,
    taskId: electrical.id,
    vendor: 'PowerLine Electrical Services',
    invoiceNumber: 'INV-2024-005',
    status: 'PENDING',
    submittedBy: bookkeeper.id,
    approvedBy: null, // intentional: not yet approved
  });

  const overheadExpense = await Expense.create({
    name: 'Office Supplies — Commercial Project',
    description: 'Stationery, printing, and office consumables',
    amount: 5000.00,
    currency: 'PHP',
    category: 'OVERHEAD',
    date: new Date('2024-04-15'),
    projectId: commercial.id,
    budgetId: commercialBudget.id,
    vendor: 'National Bookstore',
    invoiceNumber: 'INV-2024-006',
    status: 'REJECTED',
    submittedBy: secretary.id,
    approvedBy: null,
    notes: 'Rejected — not a valid project cost',
  });

  const otherExpense = await Expense.create({
    name: 'Survey & Geotechnical Fees',
    description: 'Soil boring and topographic survey fees',
    amount: 8000.00,
    currency: 'PHP',
    category: 'OTHER',
    date: new Date('2024-03-20'),
    projectId: commercial.id,
    budgetId: commercialBudget.id,
    vendor: 'GeoSurvey Philippines',
    invoiceNumber: 'INV-2024-007',
    status: 'PENDING',
    submittedBy: civilEngineer.id,
    approvedBy: null,
  });

  // Edge case 10: expense with near-maximum decimal precision
  const largeExpense = await Expense.create({
    name: 'Maximum Precision Test Expense',
    description: 'Edge-case expense with maximum allowed amount',
    amount: 99999999.99,
    currency: 'PHP',
    category: 'OTHER',
    date: new Date('2024-05-01'),
    projectId: residential.id,
    budgetId: constructionBudget.id,
    vendor: 'Test Vendor',
    invoiceNumber: 'INV-EDGE-001',
    status: 'PENDING',
    submittedBy: bookkeeper.id,
    approvedBy: null,
  });

  // Costs — covers all 5 types + all 4 statuses
  const materialCost = await Cost.create({
    name: 'Foundation Concrete — Cost Record',
    type: 'MATERIAL',
    amount: 85000.00,
    currency: 'PHP',
    date: new Date('2024-01-25'),
    description: 'Cost record for foundation concrete supply',
    projectId: residential.id,
    budgetId: materialsBudget.id,
    taskId: foundation.id,
    categoryId: materialCategory.id,
    status: 'APPROVED',
  });

  const laborCost = await Cost.create({
    name: 'Site Labour — February',
    type: 'LABOR',
    amount: 55000.00,
    currency: 'PHP',
    date: new Date('2024-02-28'),
    description: 'Total labour cost for February',
    projectId: residential.id,
    budgetId: constructionBudget.id,
    taskId: foundation.id,
    categoryId: laborCategory.id,
    status: 'PAID',
  });

  const equipmentCost = await Cost.create({
    name: 'Equipment Overhead — Q1',
    type: 'EQUIPMENT',
    amount: 22000.00,
    currency: 'PHP',
    date: new Date('2024-03-31'),
    description: 'Q1 equipment overhead and fuel costs',
    projectId: residential.id,
    budgetId: constructionBudget.id,
    taskId: framing.id,
    categoryId: equipmentCategory.id,
    status: 'APPROVED',
  });

  const overheadCost = await Cost.create({
    name: 'Commercial Building B — Overhead Planning',
    type: 'OVERHEAD',
    amount: 15000.00,
    currency: 'PHP',
    date: new Date('2024-03-15'),
    description: 'Project planning and overhead costs',
    projectId: commercial.id,
    budgetId: commercialBudget.id,
    categoryId: overheadCategory.id,
    status: 'PENDING',
  });

  const otherCost = await Cost.create({
    name: 'Infrastructure — Miscellaneous Costs',
    type: 'OTHER',
    amount: 3500.00,
    currency: 'PHP',
    date: new Date('2024-06-15'),
    description: 'Miscellaneous project costs',
    projectId: infrastructure.id,
    categoryId: otherCategory.id,
    status: 'REJECTED',
  });

  // ── Step 6: Resource Management ───────────────────────────────────────────────

  // Materials (4 statuses: IN_USE, DELIVERED, ORDERED, IN_TRANSIT)
  const cement = await Material.create({
    projectId: residential.id,
    name: 'Portland Cement',
    description: 'Type I/II Portland Cement for foundation and structural work',
    category: 'Concrete',
    unit: 'bags',
    unitCost: 12.50,
    quantity: 2000,
    totalCost: 25000.00,
    supplier: 'Metro Concrete Co.',
    status: 'IN_USE',
    deliveryDate: new Date('2024-01-22'),
    location: 'Site Storage Area A',
  });

  const steelBeams = await Material.create({
    projectId: residential.id,
    name: 'Structural Steel Beams',
    description: 'W-shape structural steel beams for framing',
    category: 'Steel',
    unit: 'tonnes',
    unitCost: 1200.00,
    quantity: 85,
    totalCost: 102000.00,
    supplier: 'SteelCraft Industries',
    status: 'DELIVERED',
    deliveryDate: new Date('2024-02-18'),
    location: 'Site Storage Area B',
  });

  const lumber = await Material.create({
    projectId: residential.id,
    name: 'Dimensional Lumber',
    description: '2x4 and 2x6 dimensional lumber for interior framing',
    category: 'Timber',
    unit: 'board-feet',
    unitCost: 0.85,
    quantity: 15000,
    totalCost: 12750.00,
    supplier: 'Timber Supply Co.',
    status: 'ORDERED',
    deliveryDate: new Date('2024-04-10'),
    location: 'TBD',
  });

  const conduit = await Material.create({
    projectId: residential.id,
    name: 'Electrical Conduit & Wiring',
    description: 'EMT conduit, wire, and electrical boxes for wiring phase',
    category: 'Electrical',
    unit: 'lot',
    unitCost: 45000.00,
    quantity: 1,
    totalCost: 45000.00,
    supplier: 'PowerLine Electrical Services',
    status: 'IN_TRANSIT',
    deliveryDate: new Date('2024-04-20'),
    location: 'TBD',
  });

  // Labor (3 statuses: ASSIGNED, AVAILABLE, ON_LEAVE)
  const foreman = await Labor.create({
    projectId: residential.id,
    name: 'James Foreman',
    role: 'Site Foreman',
    trade: 'General Construction',
    dailyRate: 650.00,
    overtimeRate: 975.00,
    hoursWorked: 480,
    totalCost: 39000.00,
    status: 'ASSIGNED',
    startDate: new Date('2024-01-20'),
    endDate: new Date('2024-08-30'),
    contactInfo: 'james.foreman@buildright.com',
  });

  const electrician = await Labor.create({
    projectId: residential.id,
    name: 'Maria Electrician',
    role: 'Licensed Electrician',
    trade: 'Electrical',
    dailyRate: 600.00,
    overtimeRate: 900.00,
    hoursWorked: 0,
    totalCost: 0.00,
    status: 'AVAILABLE',
    startDate: new Date('2024-04-16'),
    endDate: new Date('2024-06-30'),
    contactInfo: 'maria@powerline.com',
  });

  const plumber = await Labor.create({
    projectId: residential.id,
    name: 'Carlos Plumber',
    role: 'Master Plumber',
    trade: 'Plumbing',
    dailyRate: 580.00,
    overtimeRate: 870.00,
    hoursWorked: 0,
    totalCost: 0.00,
    status: 'ON_LEAVE',
    startDate: new Date('2024-04-16'),
    endDate: new Date('2024-06-30'),
    contactInfo: 'carlos@plumbingpros.com',
  });

  // Equipment (statuses: IN_USE, AVAILABLE, MAINTENANCE; conditions: GOOD, EXCELLENT, FAIR)
  const crane = await Equipment.create({
    projectId: residential.id,
    name: 'Tower Crane TC-350',
    type: 'Crane',
    status: 'IN_USE',
    dailyRate: 2500.00,
    condition: 'GOOD',
    operator: 'BuildRight Contractors',
    lastMaintenance: new Date('2024-01-10'),
    nextMaintenance: new Date('2024-04-10'),
    location: 'Grid A-4, Site Centre',
    description: '35-tonne tower crane for steel frame lifting operations',
  });

  const excavator = await Equipment.create({
    projectId: residential.id,
    name: 'Caterpillar 320 Excavator',
    type: 'Excavator',
    status: 'AVAILABLE',
    dailyRate: 1200.00,
    condition: 'EXCELLENT',
    operator: 'UA Designs Equipment Pool',
    lastMaintenance: new Date('2024-02-15'),
    nextMaintenance: new Date('2024-05-15'),
    location: 'Equipment Yard',
    description: '20-tonne excavator used for foundation work',
  });

  const mixer = await Equipment.create({
    projectId: residential.id,
    name: 'Concrete Mixer CM-8',
    type: 'Concrete Mixer',
    status: 'MAINTENANCE',
    dailyRate: 350.00,
    condition: 'FAIR',
    operator: 'BuildRight Contractors',
    lastMaintenance: new Date('2024-01-18'),
    nextMaintenance: new Date('2024-04-18'),
    location: 'Mixing Station, Site East',
    description: '8-cubic-metre drum mixer for on-site concrete batching',
  });

  // Edge case 8: pool equipment with no project
  const poolEquipment = await Equipment.create({
    projectId: null, // intentional: company pool equipment
    name: 'Total Station Survey Instrument',
    type: 'Survey Equipment',
    status: 'AVAILABLE',
    dailyRate: 500.00,
    condition: 'EXCELLENT',
    operator: null,
    location: 'Main Office Storage',
    description: 'Total station available for any project survey work',
  });

  // Team Members (ACTIVE, ACTIVE, INACTIVE)
  const siteEngineerMember = await TeamMember.create({
    projectId: residential.id,
    userId: siteEngineer.id,
    role: 'Site Engineer',
    startDate: new Date('2024-01-20'),
    endDate: new Date('2024-08-30'),
    allocation: 100,
    hoursPerWeek: 40,
    status: 'ACTIVE',
    notes: 'Full-time on-site assignment',
  });

  const architectMember = await TeamMember.create({
    projectId: residential.id,
    userId: juniorArchitect.id,
    role: 'Junior Architect',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-08-30'),
    allocation: 80,
    hoursPerWeek: 32,
    status: 'ACTIVE',
  });

  const inactiveMember = await TeamMember.create({
    projectId: commercial.id,
    userId: apprentice.id,
    role: 'Apprentice Architect',
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-06-30'),
    allocation: 50,
    hoursPerWeek: 20,
    status: 'INACTIVE',
    notes: 'Reassigned to another project',
  });

  // Skills Matrix — covers all 4 proficiency levels
  const structuralSkill = await SkillsMatrix.create({
    teamMemberId: siteEngineerMember.id,
    skillName: 'Structural Analysis',
    proficiencyLevel: 'ADVANCED',
    yearsExperience: 4.5,
    certified: true,
    certificationDate: new Date('2022-06-01'),
    expiryDate: new Date('2025-06-01'),
    notes: 'Licensed structural engineer',
  });

  const electricalSkill = await SkillsMatrix.create({
    teamMemberId: siteEngineerMember.id,
    skillName: 'Electrical Systems',
    proficiencyLevel: 'INTERMEDIATE',
    yearsExperience: 2.0,
    certified: false,
  });

  const designSkill = await SkillsMatrix.create({
    teamMemberId: architectMember.id,
    skillName: 'Architectural Design',
    proficiencyLevel: 'EXPERT',
    yearsExperience: 6.0,
    certified: true,
    certificationDate: new Date('2021-03-01'),
  });

  const beginnerSkill = await SkillsMatrix.create({
    teamMemberId: architectMember.id,
    skillName: 'Project Management',
    proficiencyLevel: 'BEGINNER',
    yearsExperience: 0.5,
    certified: false,
  });

  // Resource Allocations — covers all 3 types + 3 statuses
  // Edge case 9: one allocation without a task (project-level)
  const materialAlloc = await ResourceAllocation.create({
    projectId: residential.id,
    taskId: foundation.id,
    resourceType: 'MATERIAL',
    resourceId: cement.id,
    quantity: 500,
    startDate: new Date('2024-01-20'),
    endDate: new Date('2024-02-15'),
    status: 'IN_USE',
    notes: 'Cement allocated to foundation pour',
  });

  const laborAlloc = await ResourceAllocation.create({
    projectId: residential.id,
    taskId: framing.id,
    resourceType: 'LABOR',
    resourceId: foreman.id,
    quantity: 1,
    startDate: new Date('2024-02-16'),
    endDate: new Date('2024-04-15'),
    status: 'ALLOCATED',
    notes: 'Foreman allocated to framing phase',
  });

  const equipmentAlloc = await ResourceAllocation.create({
    projectId: residential.id,
    taskId: null, // edge case: project-level allocation, no specific task
    resourceType: 'EQUIPMENT',
    resourceId: crane.id,
    quantity: 1,
    startDate: new Date('2024-01-20'),
    endDate: new Date('2024-08-30'),
    status: 'PLANNED',
    notes: 'Crane allocated for entire project duration',
  });

  // Equipment Maintenance — PREVENTIVE/COMPLETED + CORRECTIVE/IN_PROGRESS
  const craneService = await EquipmentMaintenance.create({
    equipmentId: crane.id,
    maintenanceType: 'PREVENTIVE',
    description: 'Routine quarterly preventive maintenance — lubrication, inspection',
    scheduledDate: new Date('2024-01-08'),
    completedDate: new Date('2024-01-10'),
    cost: 8500.00,
    performedBy: 'TC Equipment Services Inc.',
    status: 'COMPLETED',
    notes: 'All systems nominal, next service in 90 days',
  });

  const mixerRepair = await EquipmentMaintenance.create({
    equipmentId: mixer.id,
    maintenanceType: 'CORRECTIVE',
    description: 'Drum drive belt replacement and motor inspection',
    scheduledDate: new Date('2024-04-18'),
    completedDate: null,
    cost: 3200.00,
    performedBy: 'On-site mechanic',
    status: 'IN_PROGRESS',
    notes: 'Awaiting replacement belt delivery',
  });

  // ── Step 7: Risk Management ───────────────────────────────────────────────────

  // Risk Categories
  const safetyCategory = await RiskCategory.create({
    name: 'Safety',
    description: 'Risks related to worker and site safety',
    color: '#EF4444',
  });

  const technicalCategory = await RiskCategory.create({
    name: 'Technical',
    description: 'Risks related to technical requirements and specifications',
    color: '#3B82F6',
  });

  const environmentalCategory = await RiskCategory.create({
    name: 'Environmental',
    description: 'Risks related to weather and environmental conditions',
    color: '#10B981',
  });

  const financialCategory = await RiskCategory.create({
    name: 'Financial',
    description: 'Risks related to budget and cost overruns',
    color: '#F59E0B',
  });

  // Risks — covers all 6 statuses + all 4 severities
  const weatherRisk = await Risk.create({
    title: 'Adverse Weather Conditions',
    description: 'Severe weather may delay outdoor construction and impact schedule',
    category: 'ENVIRONMENTAL',
    categoryId: environmentalCategory.id,
    probability: 0.60,
    impact: 0.70,
    riskScore: 0.42,
    severity: 'HIGH',
    status: 'IDENTIFIED',
    riskType: 'THREAT',
    responseStrategy: 'MITIGATE',
    projectId: residential.id,
    identifiedBy: civilEngineer.id,
    owner: projectManager.id,
    potentialCostImpact: 50000.00,
    potentialScheduleImpact: 14,
    triggers: 'Weather forecast showing storms; temperature drops below freezing',
    mitigationStrategy: 'Monitor forecasts; schedule weather-sensitive work during favourable periods',
    contingencyPlan: 'Have indoor work ready as backup; acquire weather protection equipment',
  });

  const supplyRisk = await Risk.create({
    title: 'Material Supply Delays',
    description: 'Key construction materials may not arrive on schedule',
    category: 'EXTERNAL',
    probability: 0.50,
    impact: 0.80,
    riskScore: 0.40,
    severity: 'HIGH',
    status: 'ANALYZED',
    riskType: 'THREAT',
    responseStrategy: 'TRANSFER',
    projectId: residential.id,
    identifiedBy: civilEngineer.id,
    owner: projectManager.id,
    potentialCostImpact: 75000.00,
    potentialScheduleImpact: 21,
    triggers: 'Supplier communication issues; global supply chain disruptions',
    mitigationStrategy: 'Maintain multiple supplier relationships; order materials well in advance',
  });

  const laborRisk = await Risk.create({
    title: 'Skilled Labor Shortage',
    description: 'Difficulty finding qualified workers for specialised tasks',
    category: 'RESOURCE',
    categoryId: null, // edge case 6: no category link
    probability: 0.40,
    impact: 0.60,
    riskScore: 0.24,
    severity: 'MEDIUM',
    status: 'MITIGATING',
    riskType: 'THREAT',
    responseStrategy: 'MITIGATE',
    projectId: residential.id,
    identifiedBy: admin.id,
    owner: projectManager.id,
    potentialCostImpact: 40000.00,
    potentialScheduleImpact: 10,
  });

  const safetyRisk = await Risk.create({
    title: 'Safety Incident',
    description: 'Potential for workplace accidents or injuries on site',
    category: 'SAFETY',
    categoryId: safetyCategory.id,
    probability: 0.30,
    impact: 0.90,
    riskScore: 0.27,
    severity: 'CRITICAL',
    status: 'MONITORING',
    riskType: 'THREAT',
    responseStrategy: 'AVOID',
    projectId: residential.id,
    taskId: framing.id,
    identifiedBy: admin.id,
    owner: siteEngineer.id,
    potentialCostImpact: 100000.00,
    potentialScheduleImpact: 30,
    triggers: 'Unsafe work conditions observed; near-miss incidents',
    mitigationStrategy: 'Regular safety briefings and tool-box talks',
    contingencyPlan: 'Emergency response plan; work stoppage protocol',
  });

  const budgetRisk = await Risk.create({
    title: 'Budget Overrun',
    description: 'Commercial building project exceeds initial cost estimates',
    category: 'FINANCIAL',
    categoryId: financialCategory.id,
    probability: 0.25,
    impact: 0.75,
    riskScore: 0.1875,
    severity: 'LOW',
    status: 'CLOSED',
    riskType: 'THREAT',
    responseStrategy: 'ACCEPT',
    projectId: commercial.id,
    identifiedBy: bookkeeper.id,
    owner: projectManager.id,
    potentialCostImpact: 200000.00,
    potentialScheduleImpact: 0,
    closedDate: new Date('2024-05-01'),
  });

  const escalatedRisk = await Risk.create({
    title: 'Permit Delays',
    description: 'Regulatory approval for commercial building may be delayed',
    category: 'REGULATORY',
    categoryId: technicalCategory.id,
    probability: 0.45,
    impact: 0.85,
    riskScore: 0.3825,
    severity: 'HIGH',
    status: 'ESCALATED',
    riskType: 'THREAT',
    responseStrategy: 'MITIGATE',
    projectId: commercial.id,
    identifiedBy: secretary.id,
    owner: admin.id,
    escalatedTo: admin.id,
    escalatedDate: new Date('2024-04-01'),
    potentialCostImpact: 120000.00,
    potentialScheduleImpact: 45,
  });

  // Risk Mitigations — covers all 4 statuses + 3 strategy values
  const weatherMonitoring = await RiskMitigation.create({
    riskId: weatherRisk.id,
    strategy: 'MITIGATE',
    action: 'Implement automated weather monitoring system',
    description: 'Set up weather alerts integrated with the project schedule tool',
    responsible: siteEngineer.id,
    dueDate: new Date('2024-02-15'),
    status: 'COMPLETED',
    completedDate: new Date('2024-02-10'),
    estimatedCost: 2000.00,
    actualCost: 1800.00,
    effectiveness: 'HIGH',
    createdBy: projectManager.id,
  });

  const protectionEquipment = await RiskMitigation.create({
    riskId: weatherRisk.id,
    strategy: 'MITIGATE',
    action: 'Procure weather protection equipment',
    description: 'Purchase tarps, covers, and temporary shelters for active work areas',
    responsible: siteEngineer.id,
    dueDate: new Date('2024-03-01'),
    status: 'IN_PROGRESS',
    estimatedCost: 15000.00,
    actualCost: 0.00,
    effectiveness: 'MEDIUM',
    createdBy: projectManager.id,
  });

  const supplierAgreements = await RiskMitigation.create({
    riskId: supplyRisk.id,
    strategy: 'TRANSFER',
    action: 'Establish secondary supplier agreements',
    description: 'Negotiate contracts with backup suppliers for all critical materials',
    responsible: bookkeeper.id,
    dueDate: new Date('2024-02-28'),
    status: 'PLANNED',
    estimatedCost: 5000.00,
    actualCost: 0.00,
    effectiveness: 'LOW',
    createdBy: admin.id,
  });

  const safetyTraining = await RiskMitigation.create({
    riskId: safetyRisk.id,
    strategy: 'MITIGATE',
    action: 'Conduct weekly safety training sessions',
    description: 'Regular safety briefings and tool-box talks for all site workers',
    responsible: siteEngineer.id,
    dueDate: new Date('2024-12-31'),
    status: 'IN_PROGRESS',
    estimatedCost: 10000.00,
    actualCost: 3000.00,
    effectiveness: 'HIGH',
    createdBy: admin.id,
  });

  const cancelledMitigation = await RiskMitigation.create({
    riskId: budgetRisk.id,
    strategy: 'ACCEPT',
    action: 'Allocate contingency buffer from management reserve',
    description: 'Accept risk and draw from management reserve if overrun materialises',
    responsible: bookkeeper.id,
    dueDate: new Date('2024-03-15'),
    status: 'CANCELLED',
    estimatedCost: 0.00,
    actualCost: 0.00,
    createdBy: admin.id,
    notes: 'Risk closed; mitigation no longer required',
  });

  // ── Step 8: Stakeholder Management ───────────────────────────────────────────

  // Stakeholders — covers all 5 engagement levels, both types, all influence/interest combos
  const clientStakeholder = await Stakeholder.create({
    projectId: residential.id,
    name: 'ABC Development Corp',
    email: 'contact@abcdev.com',
    phone: '+63-2-8888-0001',
    organization: 'ABC Development Corp',
    role: 'Client & Sponsor',
    type: 'EXTERNAL',
    influence: 'HIGH',
    interest: 'HIGH',
    engagementLevel: 'SUPPORTIVE',
    communicationPreference: 'EMAIL',
    status: 'ACTIVE',
    notes: 'Primary client and project sponsor. Decision-maker for scope changes.',
  });

  const regulatorStakeholder = await Stakeholder.create({
    projectId: residential.id,
    name: 'Metro City Planning Department',
    email: 'planning@metrocity.gov.ph',
    phone: '+63-2-8888-0199',
    organization: 'Metro City Council',
    role: 'Regulatory Authority',
    type: 'EXTERNAL',
    influence: 'HIGH',
    interest: 'MEDIUM',
    engagementLevel: 'NEUTRAL',
    communicationPreference: 'IN_PERSON',
    status: 'ACTIVE',
    notes: 'Issues construction permits and conducts site inspections',
  });

  const internalStakeholder = await Stakeholder.create({
    projectId: residential.id,
    userId: admin.id, // linked to a system user
    name: 'UA Designs Internal Team',
    email: 'admin@uadesigns.com',
    phone: '+63-912-000-0001',
    organization: 'UA Designs',
    role: 'Project Management Team',
    type: 'INTERNAL',
    influence: 'HIGH',
    interest: 'HIGH',
    engagementLevel: 'LEADING',
    communicationPreference: 'REPORT',
    status: 'ACTIVE',
    notes: 'Internal PM team; accountable for project delivery',
  });

  const resistantStakeholder = await Stakeholder.create({
    projectId: residential.id,
    name: 'Barangay Residents Association',
    email: 'bra@barangay123.ph',
    phone: '+63-917-000-0001',
    organization: 'Barangay 123 Residents',
    role: 'Community Representative',
    type: 'EXTERNAL',
    influence: 'LOW',
    interest: 'HIGH',
    engagementLevel: 'RESISTANT',
    communicationPreference: 'IN_PERSON',
    status: 'ACTIVE',
    notes: 'Concerned about construction noise and traffic impact',
  });

  // Edge case 7: external stakeholder with no system user link
  const unawareStakeholder = await Stakeholder.create({
    projectId: residential.id,
    userId: null, // intentional: no user account
    name: 'Meralco Utility Company',
    email: 'connect@meralco.ph',
    phone: '+63-2-8888-1234',
    organization: 'Manila Electric Company',
    role: 'Utility Provider',
    type: 'EXTERNAL',
    influence: 'MEDIUM',
    interest: 'LOW',
    engagementLevel: 'UNAWARE',
    communicationPreference: 'EMAIL',
    status: 'ACTIVE',
    notes: 'Needs to be informed about temporary power requirements',
  });

  // Communications — covers 4 types, both directions, all 4 statuses
  const emailUpdate = await Communication.create({
    stakeholderId: clientStakeholder.id,
    projectId: residential.id,
    sentBy: projectManager.id,
    type: 'EMAIL',
    subject: 'Monthly Progress Report — January 2024',
    message: 'Please find attached the monthly progress report for January 2024. Foundation work has been completed ahead of schedule.',
    direction: 'OUTBOUND',
    sentDate: new Date('2024-02-05'),
    status: 'SENT',
    followUpDate: null,
  });

  const meetingNotes = await Communication.create({
    stakeholderId: regulatorStakeholder.id,
    projectId: residential.id,
    sentBy: admin.id,
    type: 'MEETING',
    subject: 'Permit Application Review Meeting',
    message: 'Meeting with Metro City Planning to review building permit application. Inspector required additional soil test documentation.',
    direction: 'INBOUND',
    sentDate: new Date('2024-01-18'),
    status: 'RECEIVED',
    followUpDate: new Date('2024-01-25'),
    followUpNotes: 'Provide additional soil test documentation',
  });

  const phoneCall = await Communication.create({
    stakeholderId: clientStakeholder.id,
    projectId: residential.id,
    sentBy: projectManager.id,
    type: 'PHONE_CALL',
    subject: 'Framing Works Update',
    message: 'Called client to update on framing works progress. Client expressed satisfaction and approved additional steel order.',
    direction: 'OUTBOUND',
    sentDate: new Date('2024-03-10'),
    status: 'ACKNOWLEDGED',
  });

  // Edge case 11: communication with a future followUpDate
  const draftReport = await Communication.create({
    stakeholderId: internalStakeholder.id,
    projectId: residential.id,
    sentBy: secretary.id,
    type: 'REPORT',
    subject: 'Q1 2024 Project Status Report — DRAFT',
    message: 'Draft Q1 status report pending review before sending to client.',
    direction: 'OUTBOUND',
    sentDate: null,
    status: 'DRAFT',
    followUpDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days in future
    followUpNotes: 'Pending PM review and approval before sending',
  });

  // Stakeholder Engagements — 3 records, 3 different engagement levels
  const clientSatisfied = await StakeholderEngagement.create({
    stakeholderId: clientStakeholder.id,
    projectId: residential.id,
    assessedBy: projectManager.id,
    engagementLevel: 'SUPPORTIVE',
    satisfaction: 9,
    feedback: 'Very pleased with project progress. Foundation completed ahead of schedule.',
    assessedDate: new Date('2024-02-15'),
    notes: 'Client is highly engaged and responsive',
  });

  const regulatorNeutral = await StakeholderEngagement.create({
    stakeholderId: regulatorStakeholder.id,
    projectId: residential.id,
    assessedBy: projectManager.id,
    engagementLevel: 'NEUTRAL',
    satisfaction: 6,
    feedback: 'Standard regulatory oversight. Additional documentation requested.',
    assessedDate: new Date('2024-02-20'),
  });

  const resistantAssessment = await StakeholderEngagement.create({
    stakeholderId: resistantStakeholder.id,
    projectId: residential.id,
    assessedBy: admin.id,
    engagementLevel: 'RESISTANT',
    satisfaction: 3,
    feedback: 'Community unhappy with noise and dust from construction activities.',
    assessedDate: new Date('2024-02-28'),
    notes: 'Plan community outreach session for March',
  });

  // ── Step 9: Audit Logs ────────────────────────────────────────────────────────

  const auditLogEntries = await AuditLog.bulkCreate([
    {
      userId: admin.id,
      action: 'LOGIN',
      entity: 'USER',
      entityId: admin.id,
      description: 'User logged in',
      details: { email: 'admin@uadesigns.com', success: true },
      ipAddress: '192.168.1.1',
      method: 'POST',
      path: '/api/auth/login',
      statusCode: 200,
    },
    {
      userId: projectManager.id,
      action: 'REGISTER',
      entity: 'USER',
      entityId: projectManager.id,
      description: "Registered new user 'pm@uadesigns.com'",
      details: { email: 'pm@uadesigns.com', role: 'PROJECT_MANAGER' },
      ipAddress: '192.168.1.1',
      method: 'POST',
      path: '/api/auth/register',
      statusCode: 201,
    },
    {
      userId: admin.id,
      action: 'CREATE',
      entity: 'PROJECT',
      entityId: residential.id,
      description: "Created project 'Residential Complex A'",
      details: { name: 'Residential Complex A', budget: 2500000 },
      ipAddress: '192.168.1.1',
      method: 'POST',
      path: '/api/projects',
      statusCode: 201,
    },
    {
      userId: admin.id,
      action: 'CREATE',
      entity: 'BUDGET',
      entityId: constructionBudget.id,
      description: "Created budget 'Residential Complex A — Construction Budget'",
      details: { name: 'Residential Complex A — Construction Budget', amount: 2000000 },
      ipAddress: '192.168.1.1',
      method: 'POST',
      path: '/api/cost/budgets',
      statusCode: 201,
    },
    {
      userId: projectManager.id,
      action: 'UPDATE',
      entity: 'TASK',
      entityId: foundation.id,
      description: "Updated task 'Foundation Work' status to COMPLETED",
      details: { previousStatus: 'IN_PROGRESS', newStatus: 'COMPLETED', progress: 100 },
      ipAddress: '192.168.1.10',
      method: 'PUT',
      path: `/api/schedule/tasks/${foundation.id}`,
      statusCode: 200,
    },
    {
      userId: admin.id,
      action: 'STATUS_CHANGE',
      entity: 'RISK',
      entityId: weatherRisk.id,
      description: "Risk 'Adverse Weather Conditions' status changed to IDENTIFIED",
      details: { riskTitle: 'Adverse Weather Conditions', newStatus: 'IDENTIFIED' },
      ipAddress: '192.168.1.1',
      method: 'PATCH',
      path: `/api/risk/risks/${weatherRisk.id}/status`,
      statusCode: 200,
    },
    {
      userId: projectManager.id,
      action: 'APPROVE',
      entity: 'EXPENSE',
      entityId: concreteExpense.id,
      description: "Approved expense 'Concrete Supply — Foundation'",
      details: { name: 'Concrete Supply — Foundation', amount: 85000 },
      ipAddress: '192.168.1.10',
      method: 'PATCH',
      path: `/api/cost/expenses/${concreteExpense.id}/approve`,
      statusCode: 200,
    },
    {
      userId: admin.id,
      action: 'REJECT',
      entity: 'EXPENSE',
      entityId: overheadExpense.id,
      description: "Rejected expense 'Office Supplies — Commercial Project'",
      details: { name: 'Office Supplies — Commercial Project', reason: 'Not a valid project cost' },
      ipAddress: '192.168.1.1',
      method: 'PATCH',
      path: `/api/cost/expenses/${overheadExpense.id}/reject`,
      statusCode: 200,
    },
    {
      userId: admin.id,
      action: 'DELETE',
      entity: 'MATERIAL',
      entityId: lumber.id,
      description: "Soft-deleted material 'Dimensional Lumber'",
      details: { name: 'Dimensional Lumber' },
      ipAddress: '192.168.1.1',
      method: 'DELETE',
      path: `/api/resources/materials/${lumber.id}`,
      statusCode: 200,
    },
    {
      userId: admin.id,
      action: 'ESCALATE',
      entity: 'RISK',
      entityId: escalatedRisk.id,
      description: "Escalated risk 'Permit Delays' to admin",
      details: { riskTitle: 'Permit Delays', escalatedTo: admin.id },
      ipAddress: '192.168.1.1',
      method: 'POST',
      path: `/api/risk/risks/${escalatedRisk.id}/escalate`,
      statusCode: 200,
    },
    {
      userId: bookkeeper.id,
      action: 'PASSWORD_CHANGE',
      entity: 'USER',
      entityId: bookkeeper.id,
      description: 'User changed their password',
      details: { email: 'bookkeeper@uadesigns.com' },
      ipAddress: '192.168.1.20',
      method: 'POST',
      path: '/api/auth/change-password',
      statusCode: 200,
    },
    {
      userId: admin.id,
      action: 'LOGOUT',
      entity: 'USER',
      entityId: admin.id,
      description: 'User logged out',
      details: { email: 'admin@uadesigns.com' },
      ipAddress: '192.168.1.1',
      method: 'POST',
      path: '/api/auth/logout',
      statusCode: 200,
    },
  ]);

  // ── Step 11: Return structured result ─────────────────────────────────────────

  /**
   * @typedef {Object} SeedResult
   * @property {Object} users - All seeded User records
   * @property {Object} projects - All seeded Project records
   * @property {Object} tasks - All seeded Task records
   * @property {Object} taskDependencies - All seeded TaskDependency records
   * @property {Object} costCategories - All seeded CostCategory records
   * @property {Object} budgets - All seeded Budget records
   * @property {Object} expenses - All seeded Expense records
   * @property {Object} costs - All seeded Cost records
   * @property {Object} materials - All seeded Material records
   * @property {Object} labor - All seeded Labor records
   * @property {Object} equipment - All seeded Equipment records
   * @property {Object} teamMembers - All seeded TeamMember records
   * @property {Object} skills - All seeded SkillsMatrix records
   * @property {Object} allocations - All seeded ResourceAllocation records
   * @property {Object} maintenanceRecords - All seeded EquipmentMaintenance records
   * @property {Object} riskCategories - All seeded RiskCategory records
   * @property {Object} risks - All seeded Risk records
   * @property {Object} riskMitigations - All seeded RiskMitigation records
   * @property {Object} stakeholders - All seeded Stakeholder records
   * @property {Object} communications - All seeded Communication records
   * @property {Object} engagements - All seeded StakeholderEngagement records
   * @property {Array}  auditLogs - Array of all seeded AuditLog records
   */
  return {
    // ── Users ──────────────────────────────────────────────────────────────────
    users: {
      admin,
      projectManager,
      civilEngineer,
      architect,
      siteEngineer,
      juniorArchitect,
      apprentice,
      bookkeeper,
      secretary,
      demoManager,
      demoEngineer,
      demoStaff,
      inactiveUser,
    },

    // ── Projects ───────────────────────────────────────────────────────────────
    projects: {
      residential,
      commercial,
      infrastructure,
      zeroBudgetProject,
      // Note: deletedProject is soft-deleted and will not appear in findAll()
    },

    // ── Schedule ───────────────────────────────────────────────────────────────
    tasks: {
      foundation,
      framing,
      electrical,
      plumbing,
      finishing,
      sitePrep,
      designReview,
      infraPlanning,
    },
    taskDependencies: {
      depFoundationToFraming,
      depFramingToElectrical,
      depFramingToPlumbing,
      depElectricalToFinishing,
    },

    // ── Cost ───────────────────────────────────────────────────────────────────
    costCategories: {
      materialCategory,
      materialSubCategory,
      laborCategory,
      equipmentCategory,
      overheadCategory,
      subcontractorCategory,
      permitsCategory,
      otherCategory,
    },
    budgets: {
      constructionBudget,
      materialsBudget,
      commercialBudget,
      closedBudget,
    },
    expenses: {
      concreteExpense,
      steelExpense,
      laborExpense,
      craneExpense,
      permitExpense,
      subcontractorExpense,
      overheadExpense,
      otherExpense,
      largeExpense,
    },
    costs: {
      materialCost,
      laborCost,
      equipmentCost,
      overheadCost,
      otherCost,
    },

    // ── Resources ──────────────────────────────────────────────────────────────
    materials: {
      cement,
      steelBeams,
      lumber,
      conduit,
    },
    labor: {
      foreman,
      electrician,
      plumber,
    },
    equipment: {
      crane,
      excavator,
      mixer,
      poolEquipment,
    },
    teamMembers: {
      siteEngineerMember,
      architectMember,
      inactiveMember,
    },
    skills: {
      structuralSkill,
      electricalSkill,
      designSkill,
      beginnerSkill,
    },
    allocations: {
      materialAlloc,
      laborAlloc,
      equipmentAlloc,
    },
    maintenanceRecords: {
      craneService,
      mixerRepair,
    },

    // ── Risk ───────────────────────────────────────────────────────────────────
    riskCategories: {
      safetyCategory,
      technicalCategory,
      environmentalCategory,
      financialCategory,
    },
    risks: {
      weatherRisk,
      supplyRisk,
      laborRisk,
      safetyRisk,
      budgetRisk,
      escalatedRisk,
    },
    riskMitigations: {
      weatherMonitoring,
      protectionEquipment,
      supplierAgreements,
      safetyTraining,
      cancelledMitigation,
    },

    // ── Stakeholders ───────────────────────────────────────────────────────────
    stakeholders: {
      clientStakeholder,
      regulatorStakeholder,
      internalStakeholder,
      resistantStakeholder,
      unawareStakeholder,
    },
    communications: {
      emailUpdate,
      meetingNotes,
      phoneCall,
      draftReport,
    },
    engagements: {
      clientSatisfied,
      regulatorNeutral,
      resistantAssessment,
    },

    // ── Audit ──────────────────────────────────────────────────────────────────
    auditLogs: auditLogEntries,
  };
}

module.exports = seedTestDatabase;
