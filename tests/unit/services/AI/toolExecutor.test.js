const { sequelize, User, Project, Task, Risk, Budget } = require('../../../../src/models');
const { executeTool } = require('../../../../src/services/AI/tools/toolExecutor');
const {
  createTestUser,
  createTestProject,
  createTestTask,
  createTestRisk,
  createTestBudget
} = require('../../../helpers/testHelpers');

let user;
let project;
let overdueTask;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  user = await User.create(createTestUser({ role: 'PROJECT_MANAGER' }));
  project = await Project.create({
    ...createTestProject(),
    projectManagerId: user.id,
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  });
  overdueTask = await Task.create({
    ...createTestTask({ name: 'Electrical installation' }),
    projectId: project.id,
    status: 'IN_PROGRESS',
    plannedEndDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  });
  await Risk.create(createTestRisk({
    projectId: project.id,
    title: 'Weather delay',
    probability: 0.8,
    impact: 0.9,
    riskScore: 0.72,
    severity: 'CRITICAL'
  }));
  await Budget.create({
    ...createTestBudget({ name: 'Baseline' }),
    amount: 50000,
    status: 'APPROVED',
    projectId: project.id
  });
});

afterAll(async () => {
  await sequelize.close();
});

function ctx() {
  return { project, user };
}

describe('toolExecutor', () => {
  it('rejects unknown tools', async () => {
    const result = await executeTool({ name: 'drop_database', arguments: {} }, ctx());
    expect(result.error).toBe(true);
    expect(result.code).toBe('UNKNOWN_TOOL');
  });

  it('ignores a model-supplied projectId and uses the authorized project', async () => {
    const result = await executeTool({
      name: 'get_project',
      arguments: { projectId: '00000000-0000-0000-0000-000000000099' }
    }, ctx());
    expect(result.ok).toBe(true);
    expect(result.data.id).toBe(project.id);
  });

  it('validates tool parameters', async () => {
    const result = await executeTool({ name: 'get_task', arguments: { taskId: 'not-a-uuid' } }, ctx());
    expect(result.error).toBe(true);
    expect(result.code).toBe('INVALID_TOOL_PARAMS');
  });

  it('returns overdue tasks from stored dates', async () => {
    const result = await executeTool({ name: 'get_overdue_tasks', arguments: {} }, ctx());
    expect(result.ok).toBe(true);
    expect(result.data.count).toBeGreaterThanOrEqual(1);
    expect(result.data.tasks.some((task) => task.id === overdueTask.id)).toBe(true);
  });

  it('refuses to load a task from another project', async () => {
    const other = await Project.create(createTestProject({ name: 'Other' }));
    const otherTask = await Task.create({
      ...createTestTask({ name: 'Secret task' }),
      projectId: other.id
    });
    const result = await executeTool({
      name: 'get_task',
      arguments: { taskId: otherTask.id }
    }, ctx());
    expect(result.error).toBe(true);
    expect(result.code).toBe('TASK_NOT_FOUND');
  });

  it('creates a pending write proposal instead of inserting a task', async () => {
    const before = await Task.count({ where: { projectId: project.id } });
    const result = await executeTool({
      name: 'create_task',
      arguments: { name: 'Pour slab', reason: 'Missing from WBS' }
    }, ctx());
    const after = await Task.count({ where: { projectId: project.id } });
    expect(after).toBe(before);
    expect(result.data.proposal).toBe(true);
    expect(result.data.type).toBe('CREATE_TASK');
    expect(result.data.status).toBe('PENDING_APPROVAL');
    expect(result.data.parameters.name).toBe('Pour slab');
    expect(result.data.parameters.priority).toBe('MEDIUM');
    expect(result.data.parameters.startDate).toBeTruthy();
    expect(result.data.parameters.endDate).toBeTruthy();
    expect(result.data.parameters.duration).toBe(5);
  });

  it('assigns to the current user when assign_task omits assignedTo', async () => {
    const result = await executeTool({
      name: 'assign_task',
      arguments: { taskId: overdueTask.id }
    }, ctx());
    expect(result.data.proposal).toBe(true);
    expect(result.data.type).toBe('ASSIGN_TASK');
    expect(result.data.parameters.assignedTo).toBe(user.id);
  });

  it('loads budget metrics from cost services', async () => {
    const result = await executeTool({ name: 'get_project_budget', arguments: {} }, ctx());
    expect(result.ok).toBe(true);
    expect(result.data.baseMetrics).toHaveProperty('BAC');
  });

  it('loads stored risks from the risk service', async () => {
    const result = await executeTool({ name: 'get_project_risks', arguments: {} }, ctx());
    expect(result.ok).toBe(true);
    expect(result.data.summary.total).toBeGreaterThanOrEqual(1);
  });
});
