const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const app = require('../../../src/server');
const {
  sequelize,
  User,
  Project,
  Stakeholder,
  Conversation,
  Message,
  Communication
} = require('../../../src/models');
const { generateAuthToken, createTestUser, createTestProject } = require('../../helpers/testHelpers');
const { isRealtimeEnabled } = require('../../../src/services/Stakeholders/realtimeService');

let manager;
let linkedStaff;
let openStaff;
let managerToken;
let linkedToken;
let openToken;
let project;
let ownStakeholder;
let otherStakeholder;

beforeAll(async () => {
  delete process.env.PUSHER_APP_ID;
  delete process.env.PUSHER_KEY;
  delete process.env.PUSHER_SECRET;
  delete process.env.PUSHER_CLUSTER;

  await sequelize.sync({ force: true });

  manager = await User.create(createTestUser({
    role: 'PROJECT_MANAGER',
    email: 'chat-manager@uadesigns.com',
    firstName: 'Mina',
    lastName: 'Manager'
  }));
  linkedStaff = await User.create(createTestUser({
    role: 'STAFF',
    email: 'chat-linked-staff@uadesigns.com',
    firstName: 'Lina',
    lastName: 'Client'
  }));
  openStaff = await User.create(createTestUser({
    role: 'STAFF',
    email: 'chat-open-staff@uadesigns.com',
    firstName: 'Omar',
    lastName: 'Staff'
  }));

  project = await Project.create({
    ...createTestProject(),
    projectManagerId: manager.id,
    projectNumber: 'UA-CHAT-1'
  });

  ownStakeholder = await Stakeholder.create({
    projectId: project.id,
    userId: linkedStaff.id,
    name: 'Lina Client',
    organization: 'Client Co',
    role: 'Owner'
  });
  otherStakeholder = await Stakeholder.create({
    projectId: project.id,
    name: 'City Planning',
    organization: 'City Council',
    role: 'Regulator'
  });

  managerToken = generateAuthToken(manager);
  linkedToken = generateAuthToken(linkedStaff);
  openToken = generateAuthToken(openStaff);
});

afterAll(async () => {
  await sequelize.close();
});

describe('Stakeholder conversations', () => {
  it('does not call Pusher when credentials are absent', () => {
    expect(isRealtimeEnabled()).toBe(false);
  });

  it('returns realtime config without the secret', async () => {
    const response = await request(app)
      .get('/api/stakeholders/conversations/realtime-config')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      enabled: false,
      key: null,
      cluster: null
    });
    expect(response.body.data.secret).toBeUndefined();
  });

  it('returns 404 when the stakeholder does not exist', async () => {
    const response = await request(app)
      .get(`/api/stakeholders/${uuidv4()}/conversation`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('gets or creates one conversation per stakeholder', async () => {
    const first = await request(app)
      .get(`/api/stakeholders/${otherStakeholder.id}/conversation`)
      .set('Authorization', `Bearer ${managerToken}`);
    const second = await request(app)
      .get(`/api/stakeholders/${otherStakeholder.id}/conversation`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.data.id).toBe(second.body.data.id);
    expect(first.body.data.stakeholder.name).toBe('City Planning');
    expect(first.body.data.messages).toEqual([]);

    const rows = await Conversation.findAll({ where: { stakeholderId: otherStakeholder.id } });
    expect(rows).toHaveLength(1);
  });

  it('blocks a linked staff user from another stakeholder thread and allows a manager', async () => {
    const denied = await request(app)
      .get(`/api/stakeholders/${otherStakeholder.id}/conversation`)
      .set('Authorization', `Bearer ${linkedToken}`);
    expect(denied.status).toBe(403);

    const allowed = await request(app)
      .get(`/api/stakeholders/${otherStakeholder.id}/conversation`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(allowed.status).toBe(200);

    const own = await request(app)
      .get(`/api/stakeholders/${ownStakeholder.id}/conversation`)
      .set('Authorization', `Bearer ${linkedToken}`);
    expect(own.status).toBe(200);
    expect(own.body.data.stakeholderId).toBe(ownStakeholder.id);
  });

  it('lets an unlinked staff user open any thread', async () => {
    const response = await request(app)
      .get(`/api/stakeholders/${otherStakeholder.id}/conversation`)
      .set('Authorization', `Bearer ${openToken}`);

    expect(response.status).toBe(200);
  });

  it('rejects an empty message and does not write the communication log', async () => {
    const opened = await request(app)
      .get(`/api/stakeholders/${otherStakeholder.id}/conversation`)
      .set('Authorization', `Bearer ${managerToken}`);
    const before = await Communication.count();

    const response = await request(app)
      .post(`/api/stakeholders/conversations/${opened.body.data.id}/messages`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ body: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(await Communication.count()).toBe(before);
  });

  it('sends a message, updates the inbox preview, and counts it unread for the other person', async () => {
    const opened = await request(app)
      .get(`/api/stakeholders/${otherStakeholder.id}/conversation`)
      .set('Authorization', `Bearer ${managerToken}`);
    const conversationId = opened.body.data.id;
    const beforeLogs = await Communication.count();

    const sent = await request(app)
      .post(`/api/stakeholders/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ body: 'Foundation pour is Thursday.' });

    expect(sent.status).toBe(201);
    expect(sent.body.data.body).toBe('Foundation pour is Thursday.');
    expect(sent.body.data.status).toBe('SENT');
    expect(sent.body.data.mine).toBe(true);
    expect(sent.body.data.sender.firstName).toBe('Mina');
    expect(await Communication.count()).toBe(beforeLogs);

    const senderInbox = await request(app)
      .get(`/api/stakeholders/conversations?projectId=${project.id}`)
      .set('Authorization', `Bearer ${managerToken}`);
    const senderRow = senderInbox.body.data.find((row) => row.id === conversationId);
    expect(senderRow.lastMessagePreview).toBe('Foundation pour is Thursday.');
    expect(senderRow.unreadCount).toBe(0);
    expect(senderInbox.body.data[senderInbox.body.data.length - 1].lastMessageAt).toBeNull();

    const staffInbox = await request(app)
      .get(`/api/stakeholders/conversations?projectId=${project.id}`)
      .set('Authorization', `Bearer ${openToken}`);
    const staffRow = staffInbox.body.data.find((row) => row.id === conversationId);
    expect(staffRow.unreadCount).toBe(1);
  });

  it('paginates older messages oldest-first', async () => {
    const opened = await request(app)
      .get(`/api/stakeholders/${ownStakeholder.id}/conversation`)
      .set('Authorization', `Bearer ${managerToken}`);
    const conversationId = opened.body.data.id;
    const base = new Date('2026-01-01T00:00:00.000Z');

    await Message.bulkCreate([
      { conversationId, senderId: manager.id, body: 'One', status: 'SENT', createdAt: new Date(base.getTime()) },
      { conversationId, senderId: manager.id, body: 'Two', status: 'SENT', createdAt: new Date(base.getTime() + 1000) },
      { conversationId, senderId: manager.id, body: 'Three', status: 'SENT', createdAt: new Date(base.getTime() + 2000) }
    ]);

    const page = await request(app)
      .get(`/api/stakeholders/conversations/${conversationId}/messages?limit=2`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(page.status).toBe(200);
    expect(page.body.data.hasMore).toBe(true);
    expect(page.body.data.messages.map((message) => message.body)).toEqual(['Two', 'Three']);

    const older = await request(app)
      .get(`/api/stakeholders/conversations/${conversationId}/messages?limit=2&before=${encodeURIComponent(page.body.data.messages[0].createdAt)}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(older.status).toBe(200);
    expect(older.body.data.messages.map((message) => message.body)).toEqual(['One']);
    expect(older.body.data.hasMore).toBe(false);
  });

  it('marks incoming messages delivered and then read', async () => {
    const opened = await request(app)
      .get(`/api/stakeholders/${otherStakeholder.id}/conversation`)
      .set('Authorization', `Bearer ${openToken}`);
    const conversationId = opened.body.data.id;

    const delivered = await request(app)
      .post(`/api/stakeholders/conversations/${conversationId}/delivered`)
      .set('Authorization', `Bearer ${openToken}`);
    expect(delivered.status).toBe(200);
    expect(delivered.body.data.messageIds.length).toBeGreaterThan(0);

    const stillSent = await Message.findAll({
      where: { conversationId, senderId: manager.id, status: 'SENT' }
    });
    expect(stillSent).toHaveLength(0);

    const read = await request(app)
      .post(`/api/stakeholders/conversations/${conversationId}/read`)
      .set('Authorization', `Bearer ${openToken}`);
    expect(read.status).toBe(200);
    expect(read.body.data.messageIds.length).toBeGreaterThan(0);

    const unread = await Message.count({
      where: { conversationId, senderId: manager.id, status: 'SENT' }
    });
    expect(unread).toBe(0);
    const readRows = await Message.findAll({ where: { id: read.body.data.messageIds } });
    readRows.forEach((row) => {
      expect(row.status).toBe('READ');
      expect(row.readAt).toBeTruthy();
    });

    const inbox = await request(app)
      .get(`/api/stakeholders/conversations?projectId=${project.id}`)
      .set('Authorization', `Bearer ${openToken}`);
    const row = inbox.body.data.find((item) => item.id === conversationId);
    expect(row.unreadCount).toBe(0);
  });

  it('limits stakeholderUser=me to the linked stakeholder', async () => {
    const response = await request(app)
      .get(`/api/stakeholders/conversations?projectId=${project.id}&stakeholderUser=me`)
      .set('Authorization', `Bearer ${linkedToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].stakeholderId).toBe(ownStakeholder.id);
  });
});
