import { Router } from 'express';
import { z } from 'zod';
import { getPool } from '../db/pg.js';
import * as repo from '../repositories/segmentsRepo.js';

const router = Router();

const CreateInput = z.object({
  name: z.string().min(1),
  filter: z.record(z.any()).optional(),
});

// GET /v1/segments
router.get('/', async (req, res) => {
  const ws = req.workspaceId!;
  const pool = getPool();
  if (!pool) return res.json({ data: [] });
  try {
    const data = await repo.listSegments(ws);
    res.json({ data });
  } catch (e: any) {
    res.status(500).json({ error: 'DB_ERROR', message: e.message });
  }
});

// POST /v1/segments
router.post('/', async (req, res) => {
  const ws = req.workspaceId!;
  const parse = CreateInput.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parse.error.flatten() });
  const pool = getPool();
  if (!pool) return res.status(501).json({ error: 'NO_DB', message: 'Segments require DATABASE_URL' });
  try {
    const seg = await repo.createSegment(ws, { name: parse.data.name, filter: parse.data.filter ?? {} });
    res.status(201).json(seg);
  } catch (e: any) {
    res.status(500).json({ error: 'DB_ERROR', message: e.message });
  }
});

export default router;
