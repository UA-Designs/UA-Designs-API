const { sequelize, Task, TaskDependency, User, Project } = require('../../../../src/models');
const { v4: uuidv4 } = require('uuid');

let taskService;
const fakeProjectId = uuidv4();
const fakeUserId = uuidv4();

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await sequelize.query('PRAGMA foreign_keys = OFF');
  taskService = require('../../../../src/services/Schedule/taskService');
});

afterAll(async () => {
  await sequelize.close();
});

// Helper to create a task in DB
async function createTask(overrides = {}) {
  return Task.create({
    id: uuidv4(),
    name: 'Test Task',
    description: 'Unit test task',
    status: 'NOT_STARTED',
    priority: 'MEDIUM',
    duration: 5,
    progress: 0,
    projectId: fakeProjectId,
    ...overrides
  });
}

describe('TaskService', () => {
  // --- getTasksWithFilters ---

  describe('getTasksWithFilters', () => {
    let projectId;

    beforeAll(async () => {
      projectId = uuidv4();
      await createTask({ projectId, name: 'Filter Task 1', status: 'NOT_STARTED', priority: 'LOW' });
      await createTask({ projectId, name: 'Filter Task 2', status: 'IN_PROGRESS', priority: 'HIGH' });
      await createTask({ projectId, name: 'Filter Task 3', status: 'COMPLETED', priority: 'MEDIUM' });
    });

    it('should return all tasks for a project', async () => {
      const result = await taskService.getTasksWithFilters(projectId, {});

      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('pagination');
      expect(result.tasks.length).toBe(3);
    });

    it('should return empty array for project with no tasks', async () => {
      const result = await taskService.getTasksWithFilters(uuidv4(), {});

      expect(result.tasks.length).toBe(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should filter by status', async () => {
      const result = await taskService.getTasksWithFilters(projectId, { status: 'IN_PROGRESS' });

      result.tasks.forEach(t => expect(t.status).toBe('IN_PROGRESS'));
    });

    it('should filter by priority', async () => {
      const result = await taskService.getTasksWithFilters(projectId, { priority: 'HIGH' });

      result.tasks.forEach(t => expect(t.priority).toBe('HIGH'));
    });

    it('should return pagination metadata', async () => {
      const result = await taskService.getTasksWithFilters(projectId, { page: 1, limit: 2 });

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.tasks.length).toBeLessThanOrEqual(2);
    });

    it('should filter by isCritical', async () => {
      await createTask({ projectId, name: 'Critical Task', isCritical: true });
      const result = await taskService.getTasksWithFilters(projectId, { isCritical: true });

      expect(result.tasks.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- getTaskDependencies ---

  describe('getTaskDependencies', () => {
    let taskA;
    let taskB;

    beforeAll(async () => {
      const projId = uuidv4();
      taskA = await createTask({ projectId: projId, name: 'Dependency Task A' });
      taskB = await createTask({ projectId: projId, name: 'Dependency Task B' });
      await TaskDependency.create({
        id: uuidv4(),
        predecessorTaskId: taskA.id,
        successorTaskId: taskB.id,
        dependencyType: 'FINISH_TO_START',
        lag: 0,
        isHardDependency: true,
        createdBy: fakeUserId
      });
    });

    it('should return task with predecessor and successor dependencies', async () => {
      const result = await taskService.getTaskDependencies(taskB.id);

      expect(result).toHaveProperty('task');
      expect(result).toHaveProperty('predecessors');
      expect(result).toHaveProperty('successors');
      // The service stores "taskB is the successor" in successorDependencies → result.successors
      expect(result.successors.length).toBe(1);
    });

    it('should return empty arrays for task with no dependencies', async () => {
      const loneTask = await createTask({ projectId: uuidv4(), name: 'Lone Task' });
      const result = await taskService.getTaskDependencies(loneTask.id);

      expect(result.predecessors.length).toBe(0);
      expect(result.successors.length).toBe(0);
    });

    it('should throw an error for non-existent task', async () => {
      await expect(
        taskService.getTaskDependencies('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow();
    });
  });

  // --- createTaskDependency ---

  describe('createTaskDependency', () => {
    let projId;
    let predTask;
    let succTask;

    beforeAll(async () => {
      projId = uuidv4();
      predTask = await createTask({ projectId: projId, name: 'Predecessor Task' });
      succTask = await createTask({ projectId: projId, name: 'Successor Task' });
    });

    it('should create a valid FINISH_TO_START dependency', async () => {
      const dep = await taskService.createTaskDependency({
        predecessorTaskId: predTask.id,
        successorTaskId: succTask.id,
        dependencyType: 'FINISH_TO_START',
        lag: 0
      }, fakeUserId);

      expect(dep).toHaveProperty('id');
      expect(dep.predecessorTaskId).toBe(predTask.id);
      expect(dep.successorTaskId).toBe(succTask.id);
      expect(dep.dependencyType).toBe('FINISH_TO_START');
    });

    it('should throw when dependency already exists', async () => {
      await expect(
        taskService.createTaskDependency({
          predecessorTaskId: predTask.id,
          successorTaskId: succTask.id,
          dependencyType: 'FINISH_TO_START'
        }, fakeUserId)
      ).rejects.toThrow();
    });

    it('should throw when predecessor task does not exist', async () => {
      const newSucc = await createTask({ projectId: projId, name: 'Another Successor' });
      await expect(
        taskService.createTaskDependency({
          predecessorTaskId: '00000000-0000-0000-0000-000000000000',
          successorTaskId: newSucc.id,
          dependencyType: 'FINISH_TO_START'
        }, fakeUserId)
      ).rejects.toThrow();
    });

    it('should throw when tasks belong to different projects', async () => {
      const otherProjTask = await createTask({ projectId: uuidv4(), name: 'Other Project Task' });
      await expect(
        taskService.createTaskDependency({
          predecessorTaskId: predTask.id,
          successorTaskId: otherProjTask.id,
          dependencyType: 'FINISH_TO_START'
        }, fakeUserId)
      ).rejects.toThrow();
    });

    it('should default dependencyType to FINISH_TO_START', async () => {
      const p = await createTask({ projectId: projId, name: 'Default Type Pred' });
      const s = await createTask({ projectId: projId, name: 'Default Type Succ' });

      const dep = await taskService.createTaskDependency({
        predecessorTaskId: p.id,
        successorTaskId: s.id
      }, fakeUserId);

      expect(dep.dependencyType).toBe('FINISH_TO_START');
    });
  });

  // --- deleteTaskDependency ---

  describe('deleteTaskDependency', () => {
    let depToDelete;

    beforeAll(async () => {
      const projId = uuidv4();
      const p = await createTask({ projectId: projId, name: 'Delete Dep Pred' });
      const s = await createTask({ projectId: projId, name: 'Delete Dep Succ' });
      depToDelete = await TaskDependency.create({
        id: uuidv4(),
        predecessorTaskId: p.id,
        successorTaskId: s.id,
        dependencyType: 'FINISH_TO_START',
        lag: 0,
        isHardDependency: true,
        createdBy: fakeUserId
      });
    });

    it('should delete a dependency successfully', async () => {
      const result = await taskService.deleteTaskDependency(depToDelete.id);
      expect(result.success).toBe(true);

      const found = await TaskDependency.findByPk(depToDelete.id);
      expect(found).toBeNull();
    });

    it('should throw when dependency does not exist', async () => {
      await expect(
        taskService.deleteTaskDependency('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow();
    });
  });

  // --- calculateCriticalPath ---

  describe('calculateCriticalPath', () => {
    it('should return empty critical path for project with no tasks', async () => {
      const result = await taskService.calculateCriticalPath(uuidv4());

      expect(result.criticalPath).toEqual([]);
      expect(result.totalDuration).toBe(0);
    });

    it('should return a critical path for a project with tasks', async () => {
      const projId = uuidv4();
      const taskOne = await createTask({ projectId: projId, name: 'CP Task 1', duration: 5 });
      const taskTwo = await createTask({ projectId: projId, name: 'CP Task 2', duration: 3 });
      await TaskDependency.create({
        id: uuidv4(),
        predecessorTaskId: taskOne.id,
        successorTaskId: taskTwo.id,
        dependencyType: 'FINISH_TO_START',
        lag: 0,
        isHardDependency: true,
        createdBy: fakeUserId
      });

      const result = await taskService.calculateCriticalPath(projId);

      expect(result).toHaveProperty('criticalPath');
      expect(result).toHaveProperty('totalDuration');
      expect(result.totalDuration).toBeGreaterThan(0);
    });

    it('should identify both tasks as critical in a linear chain', async () => {
      const projId = uuidv4();
      const taskA = await createTask({ projectId: projId, name: 'Chain A', duration: 4 });
      const taskB = await createTask({ projectId: projId, name: 'Chain B', duration: 4 });
      await TaskDependency.create({
        id: uuidv4(),
        predecessorTaskId: taskA.id,
        successorTaskId: taskB.id,
        dependencyType: 'FINISH_TO_START',
        lag: 0,
        isHardDependency: true,
        createdBy: fakeUserId
      });

      const result = await taskService.calculateCriticalPath(projId);
      const criticalIds = result.criticalPath.map(t => t.id);

      expect(criticalIds).toContain(taskA.id);
      expect(criticalIds).toContain(taskB.id);
    });

    it('should return analysis object with counts', async () => {
      const projId = uuidv4();
      await createTask({ projectId: projId, name: 'Solo Task', duration: 7 });

      const result = await taskService.calculateCriticalPath(projId);

      expect(result.analysis).toHaveProperty('totalTasks');
      expect(result.analysis.totalTasks).toBe(1);
    });
  });
});
