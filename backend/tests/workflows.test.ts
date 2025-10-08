import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createTestApp } from './helpers/testApp.js';

const app = createTestApp();

function workspaceHeader() {
  return { 'x-workspace-id': `test-${randomUUID()}` };
}

function sampleWorkflowBody() {
  return {
    name: 'Welcome Flow',
    trigger: 'message.received' as const,
    start: 'start-node',
    nodes: [
      { id: 'start-node', type: 'action.send_message', params: { text: 'Hello!' } },
      { id: 'assign-node', type: 'action.assign', params: { queue: 'support' } },
    ],
    edges: [
      { from: 'start-node', to: 'assign-node' },
    ],
  };
}

describe('Workflows API (in-memory)', () => {
  let headers: Record<string, string>;

  beforeEach(() => {
    headers = workspaceHeader();
  });

  it('creates and lists workflows', async () => {
    const initialRes = await request(app)
      .get('/v1/workflows')
      .set(headers);

    expect(initialRes.status).toBe(200);
    const initialCount = (initialRes.body.data as unknown[]).length;
    expect(initialCount).toBeGreaterThanOrEqual(2);

    const createRes = await request(app)
      .post('/v1/workflows')
      .set(headers)
      .send(sampleWorkflowBody());

    expect(createRes.status).toBe(201);
    expect(createRes.body).toMatchObject({
      name: 'Welcome Flow',
      status: 'draft',
      nodes: expect.any(Array),
      edges: expect.any(Array),
    });

    const listRes = await request(app)
      .get('/v1/workflows')
      .set(headers);

    expect(listRes.status).toBe(200);
    const listData = listRes.body.data as unknown[];
    expect(listData).toHaveLength(initialCount + 1);
    const createdWorkflow = listData.find((wf) => typeof wf === 'object' && wf && 'name' in wf && (wf as Record<string, unknown>).name === 'Welcome Flow');
    expect(createdWorkflow).toMatchObject({ version: 1 });
  });

  it('updates workflow status and data', async () => {
    const createRes = await request(app)
      .post('/v1/workflows')
      .set(headers)
      .send(sampleWorkflowBody());

    const workflowId = createRes.body.id;

    const updateRes = await request(app)
      .put(`/v1/workflows/${workflowId}`)
      .set(headers)
      .send({
        name: 'Updated Flow',
        status: 'active',
        nodes: [
          { id: 'start-node', type: 'action.send_message', params: { text: 'Hi again' } },
          { id: 'route-node', type: 'condition.intent', params: { intents: ['sales'] } },
        ],
        edges: [{ from: 'start-node', to: 'route-node', label: 'next' }],
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body).toMatchObject({
      name: 'Updated Flow',
      status: 'active',
      version: 2,
    });

    const getRes = await request(app)
      .get(`/v1/workflows/${workflowId}`)
      .set(headers);

    expect(getRes.status).toBe(200);
    expect(getRes.body).toMatchObject({ name: 'Updated Flow', status: 'active', version: 2 });
  });

  it('deletes workflows', async () => {
    const initialRes = await request(app)
      .get('/v1/workflows')
      .set(headers);

    expect(initialRes.status).toBe(200);
    const initialCount = initialRes.body.data.length;
    expect(initialCount).toBeGreaterThanOrEqual(2);

    const createRes = await request(app)
      .post('/v1/workflows')
      .set(headers)
      .send(sampleWorkflowBody());

    const workflowId = createRes.body.id;

    const deleteRes = await request(app)
      .delete(`/v1/workflows/${workflowId}`)
      .set(headers);

    expect(deleteRes.status).toBe(204);

    const listRes = await request(app)
      .get('/v1/workflows')
      .set(headers);

    expect(listRes.status).toBe(200);
    const listData = listRes.body.data as unknown[];
    expect(listData).toHaveLength(initialCount);
    const found = listData.some((wf) => typeof wf === 'object' && wf && 'id' in wf && (wf as Record<string, unknown>).id === workflowId);
    expect(found).toBe(false);
  });

  it('validates input', async () => {
    const res = await request(app)
      .post('/v1/workflows')
      .set(headers)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_INPUT');
  });
});
