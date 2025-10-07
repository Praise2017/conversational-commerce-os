import { Router } from 'express';
import { z } from 'zod';
import { addChannel as addChannelMem, listChannels as listChannelsMem, setChannelStatus as setChannelStatusMem } from '../storage/db.js';
import { getPool } from '../db/pg.js';
import * as repo from '../repositories/channelsRepo.js';

const router = Router();

const CreateInput = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  config: z.record(z.any()).optional()
});

const StatusInput = z.object({ status: z.enum(['inactive','active','error']) });

router.get('/', async (req, res) => {
  const ws = req.workspaceId!;
  const pool = getPool();
  if (!pool) return res.json({ data: listChannelsMem(ws) });
  try {
    const data = await repo.listChannels(ws);
    res.json({ data })
  } catch (e: any) {
    res.status(500).json({ error: 'DB_ERROR', message: e.message })
  }
});

router.post('/', async (req, res) => {
  const ws = req.workspaceId!;
  const parse = CreateInput.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parse.error.flatten() });
  const pool = getPool();
  if (!pool) {
    const ch = addChannelMem(ws, { ...parse.data, status: 'active', config: parse.data.config ?? {} });
    return res.status(201).json(ch);
  }
  try {
    const ch = await repo.addChannel(ws, { ...parse.data, status: 'active', config: parse.data.config ?? {} } as any);
    res.status(201).json(ch);
  } catch (e: any) {
    res.status(500).json({ error: 'DB_ERROR', message: e.message })
  }
});

router.patch('/:id/status', async (req, res) => {
  const ws = req.workspaceId!;
  const parse = StatusInput.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parse.error.flatten() });
  const pool = getPool();
  if (!pool) {
    const ch = setChannelStatusMem(ws, req.params.id, parse.data.status);
    if (!ch) return res.status(404).json({ error: 'NOT_FOUND' });
    return res.json(ch);
  }
  try {
    const ch = await repo.setChannelStatus(ws, req.params.id, parse.data.status);
    if (!ch) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json(ch);
  } catch (e: any) {
    res.status(500).json({ error: 'DB_ERROR', message: e.message })
  }
});

export default router;
