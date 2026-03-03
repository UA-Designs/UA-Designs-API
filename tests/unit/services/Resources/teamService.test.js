const { sequelize } = require('../../../../src/models');

let teamService;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  await sequelize.query('PRAGMA foreign_keys = OFF');
  teamService = require('../../../../src/services/Resources/teamService');
});

afterAll(async () => {
  await sequelize.close();
});

const FAKE_PROJECT_ID = '00000000-0000-0000-0000-000000000001';
const FAKE_USER_ID = '00000000-0000-0000-0000-000000000002';

describe('TeamService', () => {
  describe('create', () => {
    it('should create a team member with valid data', async () => {
      const member = await teamService.create({
        projectId: FAKE_PROJECT_ID,
        userId: FAKE_USER_ID,
        role: 'Site Engineer',
        allocation: 100,
        status: 'ACTIVE'
      });

      expect(member).toHaveProperty('id');
      expect(member.role).toBe('Site Engineer');
      expect(member.allocation).toBe(100);
      expect(member.status).toBe('ACTIVE');
    });

    it('should default status to ACTIVE', async () => {
      const member = await teamService.create({
        projectId: FAKE_PROJECT_ID,
        userId: FAKE_USER_ID
      });

      expect(member.status).toBe('ACTIVE');
    });
  });

  describe('getAll', () => {
    it('should return paginated items', async () => {
      const result = await teamService.getAll({ page: 1, limit: 5 });

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should filter by projectId', async () => {
      const otherProjectId = '00000000-0000-0000-0000-000000000099';
      await teamService.create({
        projectId: otherProjectId,
        userId: FAKE_USER_ID
      });

      const result = await teamService.getAll({ projectId: FAKE_PROJECT_ID });

      result.items.forEach(item => {
        expect(item.projectId).toBe(FAKE_PROJECT_ID);
      });
    });

    it('should filter by status', async () => {
      await teamService.create({
        projectId: FAKE_PROJECT_ID,
        userId: FAKE_USER_ID,
        status: 'PENDING'
      });

      const result = await teamService.getAll({ status: 'PENDING' });

      expect(result.total).toBeGreaterThanOrEqual(1);
      result.items.forEach(item => {
        expect(item.status).toBe('PENDING');
      });
    });
  });

  describe('getById', () => {
    it('should return team member by ID', async () => {
      const created = await teamService.create({
        projectId: FAKE_PROJECT_ID,
        userId: FAKE_USER_ID,
        role: 'Architect'
      });

      const found = await teamService.getById(created.id);

      expect(found).not.toBeNull();
      expect(found.id).toBe(created.id);
      // Should include skills array (empty initially)
      expect(found).toHaveProperty('skills');
    });

    it('should return null for non-existent ID', async () => {
      const result = await teamService.getById('00000000-0000-0000-0000-999999999999');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update team member fields', async () => {
      const member = await teamService.create({
        projectId: FAKE_PROJECT_ID,
        userId: FAKE_USER_ID,
        role: 'Junior Engineer',
        allocation: 50
      });

      const updated = await teamService.update(member.id, { role: 'Senior Engineer', allocation: 80 });

      expect(updated.role).toBe('Senior Engineer');
      expect(updated.allocation).toBe(80);
    });

    it('should return null for non-existent ID', async () => {
      const result = await teamService.update('00000000-0000-0000-0000-999999999999', { role: 'X' });
      expect(result).toBeNull();
    });
  });

  describe('addSkill', () => {
    it('should add a skill to a team member', async () => {
      const member = await teamService.create({
        projectId: FAKE_PROJECT_ID,
        userId: FAKE_USER_ID
      });

      const skill = await teamService.addSkill(member.id, {
        skillName: 'AutoCAD',
        proficiencyLevel: 'ADVANCED',
        certificationDate: new Date()
      });

      expect(skill).toHaveProperty('id');
      expect(skill.skillName).toBe('AutoCAD');
      expect(skill.proficiencyLevel).toBe('ADVANCED');
      expect(skill.teamMemberId).toBe(member.id);
    });

    it('should return null for non-existent team member', async () => {
      const result = await teamService.addSkill('00000000-0000-0000-0000-999999999999', { skillName: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('getSkills', () => {
    it('should return skills for a team member', async () => {
      const member = await teamService.create({
        projectId: FAKE_PROJECT_ID,
        userId: FAKE_USER_ID
      });

      await teamService.addSkill(member.id, { skillName: 'Revit', proficiencyLevel: 'INTERMEDIATE' });
      await teamService.addSkill(member.id, { skillName: 'CAD', proficiencyLevel: 'EXPERT' });

      const skills = await teamService.getSkills(member.id);

      expect(Array.isArray(skills)).toBe(true);
      expect(skills.length).toBeGreaterThanOrEqual(2);
    });

    it('should return null for non-existent team member', async () => {
      const result = await teamService.getSkills('00000000-0000-0000-0000-999999999999');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should soft-delete a team member', async () => {
      const member = await teamService.create({
        projectId: FAKE_PROJECT_ID,
        userId: FAKE_USER_ID
      });

      const result = await teamService.delete(member.id);

      expect(result).toBe(true);

      const found = await teamService.getById(member.id);
      expect(found).toBeNull();
    });
  });
});
