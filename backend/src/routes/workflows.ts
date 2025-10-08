import { Router } from 'express';
import { z } from 'zod';
import {
  addWorkflow as addWorkflowMem,
  listWorkflows as listWorkflowsMem,
  updateWorkflow as updateWorkflowMem,
  deleteWorkflow as deleteWorkflowMem,
  findWorkflow as findWorkflowMem,
} from '../storage/db.js';
import { getPool } from '../db/pg.js';
import * as repo from '../repositories/workflowsRepo.js';
import type { WorkflowStatus } from '../workflows/types.js';

const router = Router();

const StatusEnum = z.enum(['draft', 'active', 'archived']);

const NodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['action.send_message', 'condition.intent', 'action.assign']),
  params: z.record(z.any()).optional(),
});

const EdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().min(1).optional(),
});

const BaseWorkflowSchema = z.object({
  name: z.string().min(1),
  status: StatusEnum.optional(),
  trigger: z.literal('message.received').default('message.received'),
  start: z.string().min(1),
  nodes: z.array(NodeSchema).min(1),
  edges: z.array(EdgeSchema).optional().default([]),
});

const CreateSchema = BaseWorkflowSchema;

const UpdateSchema = BaseWorkflowSchema.partial().superRefine((val, ctx) => {
  if (Object.keys(val).length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Body must include at least one field to update' });
  }
});

const ListQuerySchema = z.object({
  status: StatusEnum.optional(),
});

function mapWorkflowStatus(value: string | undefined): WorkflowStatus | undefined {
  if (!value) return undefined;
  if (value === 'draft' || value === 'active' || value === 'archived') return value;
  return undefined;
}

router.get('/', async (req, res) => {
  const ws = req.workspaceId!;
  let queryParams: z.infer<typeof ListQuerySchema>;
  try {
    queryParams = ListQuerySchema.parse(req.query);
  } catch (error) {
    const details = error instanceof z.ZodError ? error.flatten() : undefined;
    return res.status(400).json({ error: 'INVALID_QUERY', details });
  }

  const pool = getPool();
  const statusFilter = queryParams.status;
  try {
    let workflows = pool ? await repo.list(ws) : listWorkflowsMem(ws);
    if (statusFilter) {
      workflows = workflows.filter(wf => wf.status === statusFilter);
    }
    res.json({ data: workflows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'DB_ERROR', message });
  }
});

router.get('/:id', async (req, res) => {
  const ws = req.workspaceId!;
  const pool = getPool();
  try {
    const wf = pool ? await repo.find(ws, req.params.id) : findWorkflowMem(ws, req.params.id);
    if (!wf) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json(wf);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'DB_ERROR', message });
  }
});

router.post('/', async (req, res) => {
  const ws = req.workspaceId!;
  let body: z.infer<typeof CreateSchema>;
  try {
    body = CreateSchema.parse(req.body);
  } catch (error) {
    const details = error instanceof z.ZodError ? error.flatten() : undefined;
    return res.status(400).json({ error: 'INVALID_INPUT', details });
  }
  const pool = getPool();
  try {
    if (!pool) {
      const workflow = addWorkflowMem(ws, {
        name: body.name,
        status: mapWorkflowStatus(body.status) ?? 'draft',
        trigger: body.trigger,
        start: body.start,
        nodes: body.nodes,
        edges: body.edges ?? [],
      });
      return res.status(201).json(workflow);
    }

    const workflow = await repo.create(ws, {
      name: body.name,
      status: mapWorkflowStatus(body.status) ?? 'draft',
      trigger: body.trigger,
      start: body.start,
      nodes: body.nodes,
      edges: body.edges ?? [],
    });
    if (!workflow) return res.status(500).json({ error: 'DB_ERROR', message: 'Failed to create workflow' });
    res.status(201).json(workflow);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'DB_ERROR', message });
  }
});

router.put('/:id', async (req, res) => {
  const ws = req.workspaceId!;
  let body: z.infer<typeof UpdateSchema>;
  try {
    body = UpdateSchema.parse(req.body);
  } catch (error) {
    const details = error instanceof z.ZodError ? error.flatten() : undefined;
    return res.status(400).json({ error: 'INVALID_INPUT', details });
  }
  const pool = getPool();
  try {
    if (!pool) {
      const updated = updateWorkflowMem(ws, req.params.id, {
        name: body.name,
        status: mapWorkflowStatus(body.status),
        trigger: body.trigger,
        start: body.start,
        nodes: body.nodes,
        edges: body.edges,
      });
      if (!updated) return res.status(404).json({ error: 'NOT_FOUND' });
      return res.json(updated);
    }

    const updated = await repo.update(ws, req.params.id, {
      name: body.name,
      status: mapWorkflowStatus(body.status),
      trigger: body.trigger,
      start: body.start,
      nodes: body.nodes,
      edges: body.edges,
    });
    if (!updated) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'DB_ERROR', message });
  }
});

router.delete('/:id', async (req, res) => {
  const ws = req.workspaceId!;
  const pool = getPool();
  try {
    if (!pool) {
      const removed = deleteWorkflowMem(ws, req.params.id);
      if (!removed) return res.status(404).json({ error: 'NOT_FOUND' });
      return res.status(204).send();
    }
    const removed = await repo.remove(ws, req.params.id);
    if (!removed) return res.status(404).json({ error: 'NOT_FOUND' });
    res.status(204).send();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: 'DB_ERROR', message });
  }
});

export default router;
