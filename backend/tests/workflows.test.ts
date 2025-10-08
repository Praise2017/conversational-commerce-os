import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Response } from 'supertest';
import { randomUUID } from 'node:crypto';
import { createTestApp } from './helpers/testApp.js';

type WorkflowSummary = {
  id: string;
  name: string;
  status: string;
  version: number;
};

type WorkflowDetails = WorkflowSummary & {
  nodes: unknown[];
  edges: unknown[];
};

type WorkflowListResponse = { data: WorkflowSummary[] };
type ErrorResponse = { error: string };

const app = createTestApp();

function workspaceHeader(): Record<string, string> {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isWorkflowSummary(value: unknown): value is WorkflowSummary {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.status === 'string'
    && typeof value.version === 'number'
  );
}

function assertWorkflowListResponse(res: Response): WorkflowListResponse {
  const body = res.body as unknown;
  if (!isRecord(body) || !Array.isArray(body.data) || !body.data.every(isWorkflowSummary)) {
    throw new Error('Invalid workflow list response');
  }
  return { data: body.data };
}

function assertWorkflowResponse(res: Response): WorkflowDetails {
  const body = res.body as unknown;
  if (!isRecord(body)) {
    throw new Error('Invalid workflow response');
  }

  const { id, name, status, version, nodes, edges } = body;

  if (
    typeof id !== 'string'
    || typeof name !== 'string'
    || typeof status !== 'string'
    || typeof version !== 'number'
    || !Array.isArray(nodes)
    || !Array.isArray(edges)
  ) {
    throw new Error('Invalid workflow response');
  }

  return {
    id,
    name,
    status,
    version,
    nodes,
    edges,
  };
}

function assertWorkflowCreated(res: Response): WorkflowDetails {
  const created = assertWorkflowResponse(res);
  expect(created.nodes).toBeInstanceOf(Array);
  expect(created.edges).toBeInstanceOf(Array);
  return created;
}

function assertErrorResponse(res: Response): ErrorResponse {
  const body = res.body as unknown;
  if (!isRecord(body) || typeof body.error !== 'string') {
    throw new Error('Invalid error response');
  }
  return { error: body.error };
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
    const initialList = assertWorkflowListResponse(initialRes);
    const initialCount = initialList.data.length;
    expect(initialCount).toBe(0);

    const createRes = await request(app)
      .post('/v1/workflows')
      .set(headers)
      .send(sampleWorkflowBody());

    expect(createRes.status).toBe(201);
    const createdWorkflow = assertWorkflowCreated(createRes);
    expect(createdWorkflow).toMatchObject({
      name: 'Welcome Flow',
      status: 'draft',
    });

    const listRes = await request(app)
      .get('/v1/workflows')
      .set(headers);

    expect(listRes.status).toBe(200);
    const listData = assertWorkflowListResponse(listRes).data;
    expect(listData).toHaveLength(1);
    const created = listData.find(wf => wf.name === 'Welcome Flow');
    expect(created).toMatchObject({ version: 1 });
  });

  it('updates workflow status and data', async () => {
    const createRes = await request(app)
      .post('/v1/workflows')
      .set(headers)
      .send(sampleWorkflowBody());

    const workflowId = assertWorkflowResponse(createRes).id;

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
    if (updateRes.status !== 200) {
      console.error('Update response', updateRes.status, updateRes.body);
    }
    const updated = assertWorkflowResponse(updateRes);
    expect(updated).toMatchObject({
      name: 'Updated Flow',
      status: 'active',
      version: 2,
    });

    const getRes = await request(app)
      .get(`/v1/workflows/${workflowId}`)
      .set(headers);

    expect(getRes.status).toBe(200);
    const fetched = assertWorkflowResponse(getRes);
    expect(fetched).toMatchObject({ name: 'Updated Flow', status: 'active', version: 2 });
  });

  it('deletes workflows', async () => {
    const initialRes = await request(app)
      .get('/v1/workflows')
      .set(headers);

    expect(initialRes.status).toBe(200);
    const initialList = assertWorkflowListResponse(initialRes);
    const initialCount = initialList.data.length;
    expect(initialCount).toBe(0);

    const createRes = await request(app)
      .post('/v1/workflows')
      .set(headers)
      .send(sampleWorkflowBody());

    const workflowId = assertWorkflowResponse(createRes).id;

    const deleteRes = await request(app)
      .delete(`/v1/workflows/${workflowId}`)
      .set(headers);

    expect(deleteRes.status).toBe(204);

    const listRes = await request(app)
      .get('/v1/workflows')
      .set(headers);

    expect(listRes.status).toBe(200);
    const listData = assertWorkflowListResponse(listRes).data;
    expect(listData).toHaveLength(initialCount);
    const found = listData.some(wf => wf.id === workflowId);
    expect(found).toBe(false);
  });

  it('validates input', async () => {
    const res = await request(app)
      .post('/v1/workflows')
      .set(headers)
      .send({});

    expect(res.status).toBe(400);
    const errorBody = assertErrorResponse(res);
    expect(errorBody.error).toBe('INVALID_INPUT');
  });
});
