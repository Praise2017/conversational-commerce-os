import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createTestApp } from './helpers/testApp.js';

const app = createTestApp();

function workspaceHeader() {
  return { 'x-workspace-id': `test-${randomUUID()}` };
}

describe('Contacts API (in-memory)', () => {
  it('requires workspace header', async () => {
    const res = await request(app).get('/v1/contacts');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'MISSING_WORKSPACE_ID' });
  });

  it('creates and lists contacts', async () => {
    const headers = workspaceHeader();
    const createRes = await request(app)
      .post('/v1/contacts')
      .set(headers)
      .send({ displayName: 'Jane Doe', email: 'jane@example.com' });

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({ displayName: 'Jane Doe', email: 'jane@example.com' });

    const listRes = await request(app).get('/v1/contacts').set(headers);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0]).toMatchObject({ displayName: 'Jane Doe', email: 'jane@example.com' });
  });
});
