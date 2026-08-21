const request = require('supertest');
const app = require('../../../src/server');
const { sequelize, User, Project, Risk, AuditLog } = require('../../../src/models');
const { generateAuthToken, createTestUser, createTestProject, createTestRisk } = require('../../helpers/testHelpers');

let authToken;
let staffToken;
let testUser;
let testProject;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  testUser = await User.create(createTestUser({ role: 'PROJECT_MANAGER' }));
  const staffUser = await User.create(createTestUser({ role: 'STAFF', email: 'ai-staff@uadesigns.com' }));
  testProject = await Project.create({
    ...createTestProject(),
    projectManagerId: testUser.id
  });

  authToken = generateAuthToken(testUser);
  staffToken = generateAuthToken(staffUser);
});

afterAll(async () => {
  await sequelize.close();
});

describe('POST /api/ai/risk/score', () => {
  it('returns 401 without a token', async () => {
    const response = await request(app)
      .post('/api/ai/risk/score')
      .send({ projectId: testProject.id });

    expect(response.status).toBe(401);
  });

  it('returns 403 for STAFF', async () => {
    const response = await request(app)
      .post('/api/ai/risk/score')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ projectId: testProject.id });

    expect(response.status).toBe(403);
  });

  it('returns 400 when projectId is missing', async () => {
    const response = await request(app)
      .post('/api/ai/risk/score')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('returns 404 for an unknown project', async () => {
    const response = await request(app)
      .post('/api/ai/risk/score')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ projectId: '00000000-0000-0000-0000-000000000099' });

    expect(response.status).toBe(404);
  });

  it('stores AI suggestions without changing official rule-based fields', async () => {
    const risk = await Risk.create(createTestRisk({
      projectId: testProject.id,
      probability: 0.4,
      impact: 0.7,
      riskScore: 0.28,
      severity: 'MEDIUM',
      scheduleImpactDays: 8,
      delayDays: 8,
      impactType: 'DELAY'
    }));

    const official = {
      probability: parseFloat(risk.probability),
      impact: parseFloat(risk.impact),
      riskScore: parseFloat(risk.riskScore),
      severity: risk.severity
    };

    const response = await request(app)
      .post('/api/ai/risk/score')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ projectId: testProject.id });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.projectId).toBe(testProject.id);
    expect(Array.isArray(response.body.data.risks)).toBe(true);

    const scored = response.body.data.risks.find((item) => item.riskId === risk.id);
    expect(scored).toBeTruthy();
    expect(scored).toEqual(expect.objectContaining({
      riskId: risk.id,
      aiProbability: expect.any(Number),
      aiImpact: expect.any(Number),
      aiSeverity: expect.stringMatching(/^(LOW|MEDIUM|HIGH|CRITICAL)$/),
      aiRiskScore: expect.any(Number),
      aiConfidence: expect.any(Number),
      aiModelVersion: 'stub-v1'
    }));

    await risk.reload();
    expect(parseFloat(risk.probability)).toBeCloseTo(official.probability, 4);
    expect(parseFloat(risk.impact)).toBeCloseTo(official.impact, 4);
    expect(parseFloat(risk.riskScore)).toBeCloseTo(official.riskScore, 4);
    expect(risk.severity).toBe(official.severity);
    expect(risk.aiProbability).not.toBeNull();
    expect(risk.aiImpact).not.toBeNull();
    expect(risk.aiSeverity).toBeTruthy();
    expect(risk.aiModelVersion).toBe('stub-v1');
    expect(risk.aiGeneratedAt).toBeTruthy();
    expect(risk.aiReasons).toBeTruthy();
  });

  it('writes an audit log entry for the scoring request', async () => {
    const response = await request(app)
      .post('/api/ai/risk/score')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ projectId: testProject.id });

    expect(response.status).toBe(200);

    // Audit writes are fire-and-forget after res.json
    await new Promise((resolve) => setTimeout(resolve, 50));

    const entry = await AuditLog.findOne({
      where: { path: '/api/ai/risk/score' },
      order: [['createdAt', 'DESC']]
    });

    expect(entry).toBeTruthy();
    expect(entry.entity).toBe('RISK');
    expect(entry.action).toBe('UPDATE');
    expect(entry.description).toMatch(/AI risk score/i);
    expect(entry.entityId).toBe(testProject.id);
  });
});
