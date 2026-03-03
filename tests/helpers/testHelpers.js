const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-unit-and-integration-tests';

// --- Token helpers ---

function generateAuthToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// --- Factory functions ---

function createTestUser(overrides = {}) {
  return {
    id: uuidv4(),
    firstName: 'Test',
    lastName: 'User',
    email: `test-${Date.now()}@uadesigns.com`,
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'PROJECT_MANAGER',
    isActive: true,
    ...overrides
  };
}

function createTestProject(overrides = {}) {
  return {
    id: uuidv4(),
    name: 'Test Construction Project',
    projectNumber: `UA-TEST-${Date.now()}`,
    projectType: 'RESIDENTIAL',
    status: 'PLANNING',
    phase: 'INITIATION',
    clientName: 'Test Client',
    startDate: new Date(),
    plannedEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    budget: 1000000,
    ...overrides
  };
}

function createTestRisk(overrides = {}) {
  return {
    id: uuidv4(),
    title: 'Test Risk',
    description: 'A test risk for automated testing',
    probability: 0.5,
    impact: 0.5,
    riskScore: 0.25,
    status: 'IDENTIFIED',
    severity: 'MEDIUM',
    responseStrategy: 'MITIGATE',
    identifiedDate: new Date(),
    ...overrides
  };
}

function createTestMitigation(overrides = {}) {
  return {
    id: uuidv4(),
    strategy: 'Implement safety protocols',
    action: 'Detailed action plan to address the risk',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'PLANNED',
    cost: 5000.00,
    effectiveness: 'MEDIUM',
    ...overrides
  };
}

function createTestRiskCategory(overrides = {}) {
  return {
    id: uuidv4(),
    name: `TEST_CATEGORY_${Date.now()}`,
    description: 'A test risk category',
    color: '#FF5733',
    ...overrides
  };
}

// --- Resource factory functions ---

function createTestMaterial(overrides = {}) {
  return {
    id: uuidv4(),
    name: 'Test Material',
    unit: 'm3',
    unitCost: 50.00,
    quantity: 100,
    totalCost: 5000.00,
    status: 'ORDERED',
    ...overrides
  };
}

function createTestLabor(overrides = {}) {
  return {
    id: uuidv4(),
    name: 'Test Worker',
    role: 'Carpenter',
    trade: 'CARPENTRY',
    dailyRate: 200.00,
    hoursWorked: 0,
    status: 'AVAILABLE',
    ...overrides
  };
}

function createTestEquipment(overrides = {}) {
  return {
    id: uuidv4(),
    name: 'Test Crane',
    type: 'crane',
    status: 'AVAILABLE',
    condition: 'GOOD',
    ...overrides
  };
}

function createTestTeamMember(overrides = {}) {
  return {
    id: uuidv4(),
    role: 'Site Engineer',
    allocation: 100,
    status: 'ACTIVE',
    ...overrides
  };
}

function createTestAllocation(overrides = {}) {
  return {
    id: uuidv4(),
    resourceType: 'MATERIAL',
    quantity: 10,
    status: 'PLANNED',
    ...overrides
  };
}

function createTestStakeholder(overrides = {}) {
  return {
    id: uuidv4(),
    name: 'Test Stakeholder',
    email: `stakeholder-${Date.now()}@uadesigns.com`,
    organization: 'Test Org',
    role: 'Site Inspector',
    type: 'EXTERNAL',
    influence: 'HIGH',
    interest: 'HIGH',
    engagementLevel: 'NEUTRAL',
    communicationPreference: 'EMAIL',
    status: 'ACTIVE',
    ...overrides
  };
}

function createTestCommunication(overrides = {}) {
  return {
    id: uuidv4(),
    type: 'EMAIL',
    subject: 'Project Update',
    message: 'Please review the attached documents.',
    direction: 'OUTBOUND',
    status: 'SENT',
    sentDate: new Date(),
    ...overrides
  };
}

function createTestEngagement(overrides = {}) {
  return {
    id: uuidv4(),
    engagementLevel: 'SUPPORTIVE',
    satisfaction: 8,
    feedback: 'Very pleased with the project progress.',
    assessedDate: new Date(),
    ...overrides
  };
}

module.exports = {
  generateAuthToken,
  createTestUser,
  createTestProject,
  createTestRisk,
  createTestMitigation,
  createTestRiskCategory,
  createTestMaterial,
  createTestLabor,
  createTestEquipment,
  createTestTeamMember,
  createTestAllocation,
  createTestStakeholder,
  createTestCommunication,
  createTestEngagement
};
