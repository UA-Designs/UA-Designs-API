const { sequelize, User, Project, Task, TaskDependency } = require('../../../../src/models');
const scheduleImpactService = require('../../../../src/services/AI/scheduleImpactService');
const { createTestUser, createTestProject, createTestTask } = require('../../../helpers/testHelpers');

let project;
let foundation;
let framing;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  const user = await User.create(createTestUser());
  project = await Project.create({
    ...createTestProject(),
    projectManagerId: user.id,
    startDate: new Date('2026-01-01T00:00:00.000Z')
  });
  foundation = await Task.create({
    ...createTestTask({ name: 'Foundation' }),
    projectId: project.id,
    duration: 5,
    plannedStartDate: new Date('2026-01-01T00:00:00.000Z'),
    plannedEndDate: new Date('2026-01-05T00:00:00.000Z')
  });
  framing = await Task.create({
    ...createTestTask({ name: 'Framing' }),
    projectId: project.id,
    duration: 5,
    plannedStartDate: new Date('2026-01-06T00:00:00.000Z'),
    plannedEndDate: new Date('2026-01-10T00:00:00.000Z')
  });
  await TaskDependency.create({
    predecessorTaskId: foundation.id,
    successorTaskId: framing.id,
    dependencyType: 'FINISH_TO_START',
    lag: 0,
    createdBy: user.id
  });
});

afterAll(async () => {
  await sequelize.close();
});

describe('scheduleImpactService', () => {
  it('calculates successor impact without changing official dates', async () => {
    const originalEnd = framing.endDate;
    const result = await scheduleImpactService.analyze({
      projectId: project.id,
      taskId: foundation.id,
      delayDays: 5
    });

    expect(result.officialDatesUnchanged).toBe(true);
    expect(result.completionShiftDays).toBeGreaterThanOrEqual(5);
    expect(result.affectedTasks.some((item) => item.taskId === framing.id && item.shiftDays > 0)).toBe(true);

    await framing.reload();
    expect(new Date(framing.endDate).toISOString()).toBe(new Date(originalEnd).toISOString());
  });
});
