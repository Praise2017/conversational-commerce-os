import { Router } from 'express';
import { z } from 'zod';
import { addTemplate as addTemplateMem, listTemplates as listTemplatesMem } from '../storage/db.js';
import { getPool } from '../db/pg.js';
import * as repo from '../repositories/templatesRepo.js';

const router = Router();

const CreateInput = z.object({
  name: z.string().min(1),
  body: z.string().min(1),
  channelType: z.string().optional(),
  variables: z.array(z.string()).optional()
});

router.get('/', async (req, res) => {
  const ws = req.workspaceId!;
  const pool = getPool();
  if (!pool) return res.json({ data: listTemplatesMem(ws) });
  try {
    const data = await repo.listTemplates(ws);
    res.json({ data });
  } catch (e: any) {
    res.status(500).json({ error: 'DB_ERROR', message: e.message });
  }
});

router.post('/', async (req, res) => {
  const ws = req.workspaceId!;
  const parse = CreateInput.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parse.error.flatten() });
  const pool = getPool();
  if (!pool) {
    const t = addTemplateMem(ws, parse.data);
    return res.status(201).json(t);
  }
  try {
    const t = await repo.addTemplate(ws, parse.data);
    res.status(201).json(t);
  } catch (e: any) {
    res.status(500).json({ error: 'DB_ERROR', message: e.message });
  }
});

export default router;
