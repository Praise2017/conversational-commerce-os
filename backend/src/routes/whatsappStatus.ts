import { Router } from 'express';
import { z } from 'zod';
import { getPool } from '../db/pg.js';
import * as msgRepo from '../repositories/messagesRepo.js';

const router = Router();

const StatusInput = z.object({
  statuses: z.array(z.object({
    id: z.string(),            // WhatsApp provider message id
    status: z.string(),        // delivered, read, failed, etc.
    timestamp: z.string().optional()
  }))
});

// POST /v1/webhooks/status/whatsapp
router.post('/', async (req, res) => {
  const ws = req.workspaceId!; // for now, we require workspace header like other webhooks
  const parse = StatusInput.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parse.error.flatten() });

  const pool = getPool();
  if (!pool) return res.status(501).json({ error: 'NO_DB', message: 'Status webhooks require DATABASE_URL for message lookups' });

  try {
    for (const s of parse.data.statuses) {
      const normalized = s.status.toLowerCase();
      await msgRepo.updateStatusByExternal(ws, s.id, normalized);
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: 'DB_ERROR', message: e.message });
  }
});

export default router;
