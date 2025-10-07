import { Router } from 'express';
import { getSummaryCounts } from '../storage/db.js';
import { getPool } from '../db/pg.js';
import * as repo from '../repositories/analyticsRepo.js';

const router = Router();

router.get('/summary', async (req, res) => {
  const ws = req.workspaceId!;
  const pool = getPool();
  if (!pool) {
    const summary = getSummaryCounts(ws);
    return res.json(summary);
  }
  try {
    const summary = await repo.getSummary(ws);
    res.json(summary);
  } catch (e: any) {
    res.status(500).json({ error: 'DB_ERROR', message: e.message });
  }
});

export default router;
