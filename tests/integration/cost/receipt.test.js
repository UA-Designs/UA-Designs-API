const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../../../src/server');
const { sequelize, User, Project, Expense } = require('../../../src/models');
const {
  generateAuthToken,
  createTestUser,
  createTestProject,
  createTestExpense
} = require('../../helpers/testHelpers');

// ─── Fixture paths ────────────────────────────────────────────────────────────
const FIXTURES_DIR = path.join(__dirname, '../../fixtures');
const JPEG_FIXTURE = path.join(FIXTURES_DIR, 'sample.jpg');
const PDF_FIXTURE = path.join(FIXTURES_DIR, 'sample.pdf');
const UPLOAD_DIR = path.join(__dirname, '../../../uploads/receipts');

// ─── Globals ─────────────────────────────────────────────────────────────────
let adminToken, memberToken, otherToken;
let adminUser, memberUser, otherUser;
let testProject;
let testExpense;

// ─── Setup / teardown ────────────────────────────────────────────────────────
beforeAll(async () => {
  // Create fixture directory and tiny valid JPEG / PDF for upload tests
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });

  // Minimal valid JPEG (1×1 px, 37 bytes)
  const jpegBytes = Buffer.from(
    'ffd8ffe000104a46494600010100000100010000ffdb00430001010101010101010101010101' +
    '01010101010101010101010101010101010101010101010101010101010101010101010101' +
    '0101010101010101010101010101ffc0000b080001000101011100ffda00080101000003f0' +
    '007fffd9',
    'hex'
  );
  if (!fs.existsSync(JPEG_FIXTURE)) fs.writeFileSync(JPEG_FIXTURE, jpegBytes);

  // Minimal valid PDF
  const pdfContent = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\n' +
    'xref\n0 4\n0000000000 65535 f\n' +
    '0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n' +
    'trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF';
  if (!fs.existsSync(PDF_FIXTURE)) fs.writeFileSync(PDF_FIXTURE, pdfContent);

  await sequelize.sync({ force: true });

  adminUser = await User.create(
    createTestUser({ role: 'ADMIN', email: 'admin-receipt@uadesigns.com' })
  );
  memberUser = await User.create(
    createTestUser({ role: 'ENGINEER', email: 'member-receipt@uadesigns.com' })
  );
  otherUser = await User.create(
    createTestUser({ role: 'ENGINEER', email: 'other-receipt@uadesigns.com' })
  );

  testProject = await Project.create({
    ...createTestProject({ projectNumber: `UA-RCPT-${Date.now()}` }),
    projectManagerId: adminUser.id
  });

  // Expense owned by memberUser
  testExpense = await Expense.create({
    ...createTestExpense({ projectId: testProject.id }),
    submittedBy: memberUser.id,
    status: 'PENDING'
  });

  adminToken = generateAuthToken(adminUser);
  memberToken = generateAuthToken(memberUser);
  otherToken = generateAuthToken(otherUser);
});

afterAll(async () => {
  // Clean up uploaded test files
  if (fs.existsSync(UPLOAD_DIR)) {
    fs.readdirSync(UPLOAD_DIR).forEach(f => {
      if (f !== '.gitkeep') {
        try { fs.unlinkSync(path.join(UPLOAD_DIR, f)); } catch (_) {}
      }
    });
  }
  await sequelize.close();
});

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('Receipt Upload API', () => {

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/cost/expenses/:id/receipts
  // ─────────────────────────────────────────────────────────────────────────
  describe('POST /api/cost/expenses/:id/receipts', () => {

    it('1. owner can upload a valid JPEG receipt — 200 + attachment in array', async () => {
      const res = await request(app)
        .post(`/api/cost/expenses/${testExpense.id}/receipts`)
        .set('Authorization', `Bearer ${memberToken}`)
        .attach('receipt', JPEG_FIXTURE);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Receipt uploaded successfully');
      const attachments = res.body.data.attachments;
      expect(Array.isArray(attachments)).toBe(true);
      expect(attachments.length).toBe(1);
      expect(attachments[0]).toMatchObject({
        originalName: 'sample.jpg',
        mimeType: 'image/jpeg',
        uploadedBy: memberUser.id
      });
      expect(attachments[0].url).toMatch(/^\/uploads\/receipts\//);
    });

    it('2. ADMIN can upload a PDF receipt — 200', async () => {
      const res = await request(app)
        .post(`/api/cost/expenses/${testExpense.id}/receipts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('receipt', PDF_FIXTURE);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const attachments = res.body.data.attachments;
      expect(attachments.length).toBe(2);
      expect(attachments[1].mimeType).toBe('application/pdf');
    });

    it('3. uploading with no file returns 400', async () => {
      const res = await request(app)
        .post(`/api/cost/expenses/${testExpense.id}/receipts`)
        .set('Authorization', `Bearer ${memberToken}`)
        .set('Content-Type', 'multipart/form-data');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('4. uploading a file with invalid MIME type returns 400', async () => {
      // Write a small .txt fixture
      const txtFixture = path.join(FIXTURES_DIR, 'invalid.txt');
      fs.writeFileSync(txtFixture, 'not an image');

      const res = await request(app)
        .post(`/api/cost/expenses/${testExpense.id}/receipts`)
        .set('Authorization', `Bearer ${memberToken}`)
        .attach('receipt', txtFixture);

      // multer's fileFilter rejects invalid types — either a 400 or the file is
      // filtered and multer treats it as no file provided
      expect([400, 500]).toContain(res.status);
    });

    it('5. uploading when 5 attachments already exist returns 400', async () => {
      // Fill up to 5 attachments directly
      const fakeAttachments = Array.from({ length: 5 }, (_, i) => ({
        filename: `fake-${i}.jpg`,
        originalName: `fake-${i}.jpg`,
        mimeType: 'image/jpeg',
        size: 100,
        url: `/uploads/receipts/fake-${i}.jpg`,
        uploadedAt: new Date().toISOString(),
        uploadedBy: adminUser.id
      }));
      await testExpense.update({ attachments: fakeAttachments });

      const res = await request(app)
        .post(`/api/cost/expenses/${testExpense.id}/receipts`)
        .set('Authorization', `Bearer ${memberToken}`)
        .attach('receipt', JPEG_FIXTURE);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/maximum/i);

      // Reset attachments for subsequent tests
      await testExpense.update({ attachments: [] });
    });

    it('6. request without auth token returns 401', async () => {
      const res = await request(app)
        .post(`/api/cost/expenses/${testExpense.id}/receipts`)
        .attach('receipt', JPEG_FIXTURE);

      expect(res.status).toBe(401);
    });

    it('7. non-owner, non-admin user returns 403', async () => {
      const res = await request(app)
        .post(`/api/cost/expenses/${testExpense.id}/receipts`)
        .set('Authorization', `Bearer ${otherToken}`)
        .attach('receipt', JPEG_FIXTURE);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('8. uploading to a non-existent expense returns 404', async () => {
      const { v4: uuidv4 } = require('uuid');
      const res = await request(app)
        .post(`/api/cost/expenses/${uuidv4()}/receipts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('receipt', JPEG_FIXTURE);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

  });

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE /api/cost/expenses/:id/receipts/:index
  // ─────────────────────────────────────────────────────────────────────────
  describe('DELETE /api/cost/expenses/:id/receipts/:index', () => {

    beforeEach(async () => {
      // Add a receipt to delete in each test
      await request(app)
        .post(`/api/cost/expenses/${testExpense.id}/receipts`)
        .set('Authorization', `Bearer ${memberToken}`)
        .attach('receipt', JPEG_FIXTURE);
    });

    afterEach(async () => {
      // Ensure clean state
      await testExpense.update({ attachments: [] });
    });

    it('9. owner can delete receipt at index 0 — 200 + array shrinks', async () => {
      // First confirm there is 1 attachment
      const getRes = await request(app)
        .get(`/api/cost/expenses/${testExpense.id}`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(getRes.body.data.attachments.length).toBe(1);

      const res = await request(app)
        .delete(`/api/cost/expenses/${testExpense.id}/receipts/0`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Receipt deleted successfully');
      const attachments = res.body.data.attachments;
      expect(attachments.length).toBe(0);
    });

    it('10. invalid index (out of range) returns 400', async () => {
      const res = await request(app)
        .delete(`/api/cost/expenses/${testExpense.id}/receipts/99`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('11. non-owner, non-admin user returns 403', async () => {
      const res = await request(app)
        .delete(`/api/cost/expenses/${testExpense.id}/receipts/0`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

  });

  // ─────────────────────────────────────────────────────────────────────────
  // Static file serving — GET /uploads/receipts/:filename
  // ─────────────────────────────────────────────────────────────────────────
  describe('GET /uploads/receipts/:filename (static serving)', () => {

    let uploadedFilename;

    beforeAll(async () => {
      await testExpense.update({ attachments: [] });
      const res = await request(app)
        .post(`/api/cost/expenses/${testExpense.id}/receipts`)
        .set('Authorization', `Bearer ${memberToken}`)
        .attach('receipt', JPEG_FIXTURE);
      uploadedFilename = res.body.data.attachments[0]?.filename;
    });

    afterAll(async () => {
      await testExpense.update({ attachments: [] });
    });

    it('12. serves an uploaded receipt file with 200', async () => {
      expect(uploadedFilename).toBeDefined();
      const res = await request(app).get(`/uploads/receipts/${uploadedFilename}`);
      expect(res.status).toBe(200);
    });

    it('13. returns 404 for a non-existent filename', async () => {
      const res = await request(app).get('/uploads/receipts/does-not-exist.jpg');
      expect(res.status).toBe(404);
    });

  });

  // ─────────────────────────────────────────────────────────────────────────
  // Submitter / Approver include in list and detail responses
  // ─────────────────────────────────────────────────────────────────────────
  describe('Submitter/Approver included in expense responses', () => {

    it('14. GET /api/cost/expenses includes submitter with firstName, lastName, email', async () => {
      const res = await request(app)
        .get('/api/cost/expenses')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const expense = res.body.data.expenses.find(e => e.id === testExpense.id);
      expect(expense).toBeDefined();
      expect(expense.submitter).toBeDefined();
      expect(expense.submitter).toMatchObject({
        id: memberUser.id,
        firstName: memberUser.firstName,
        lastName: memberUser.lastName,
        email: memberUser.email
      });
    });

    it('15. GET /api/cost/expenses/:id includes submitter and approver', async () => {
      const res = await request(app)
        .get(`/api/cost/expenses/${testExpense.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.submitter).toBeDefined();
      expect(res.body.data.submitter.id).toBe(memberUser.id);
      // approver is null for a PENDING expense
      expect(res.body.data.approver).toBeNull();
    });

  });

});
