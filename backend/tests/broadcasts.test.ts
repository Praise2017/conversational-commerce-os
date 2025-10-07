import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createTestApp } from './helpers/testApp.js';

const app = createTestApp();

function workspaceHeader() {
  return { 'x-workspace-id': `test-${randomUUID()}` };
}

describe('Broadcasts API (in-memory)', () => {
  it('rejects invalid payloads', async () => {
    const headers = workspaceHeader();

    const res = await request(app)
      .post('/v1/broadcasts')
      .set(headers)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_INPUT');
  });

  it('creates immediate broadcast and records metrics', async () => {
    const headers = workspaceHeader();

    // Seed a contact so broadcast has a target
    await request(app)
      .post('/v1/contacts')
      .set(headers)
      .send({ displayName: 'Target User', email: 'target@example.com' });

    const createRes = await request(app)
      .post('/v1/broadcasts')
      .set(headers)
      .send({ name: 'Promo Blast', templateText: 'Hello there!' });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({
      name: 'Promo Blast',
      status: 'completed',
      metrics: { targeted: 1, sent: 1, failed: 0 }
    });

    const listRes = await request(app).get('/v1/broadcasts').set(headers);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data[0]).toMatchObject({
      name: 'Promo Blast',
      status: 'completed'
    });
  });

  it('creates scheduled broadcast without running immediately', async () => {
    const headers = workspaceHeader();

    const scheduledTime = new Date(Date.now() + 60_000).toISOString();

    const createRes = await request(app)
      .post('/v1/broadcasts')
      .set(headers)
      .send({ name: 'Later Blast', templateText: 'Schedule me', scheduledAt: scheduledTime });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({
      name: 'Later Blast',
      status: 'scheduled',
      scheduledAt: scheduledTime
    });
    expect(createRes.body.metrics).toEqual({ targeted: 0, sent: 0, failed: 0 });
  });
});
