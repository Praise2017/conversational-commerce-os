import { Router } from 'express';
import { z } from 'zod';
import { addBroadcast as addBroadcastMem, listBroadcasts as listBroadcastsMem, runBroadcastNow as runBroadcastNowMem } from '../storage/db.js';
import { getPool } from '../db/pg.js';
import * as msgRepo from '../repositories/messagesRepo.js';
import * as contactRepo from '../repositories/contactsRepo.js';
import * as bRepo from '../repositories/broadcastsRepo.js';
import * as segmentsRepo from '../repositories/segmentsRepo.js';

const router = Router();

const CreateInput = z.object({
  name: z.string().min(1),
  templateText: z.string().min(1),
  scheduledAt: z.string().datetime().nullish(),
  segmentId: z.string().uuid().nullish()
});

router.get('/', async (req, res) => {
  const ws = req.workspaceId!;
  const pool = getPool();
  if (!pool) return res.json({ data: listBroadcastsMem(ws) });
  try {
    const data = await bRepo.list(ws);
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
    const b = addBroadcastMem(ws, { name: parse.data.name, templateText: parse.data.templateText, scheduledAt: parse.data.scheduledAt ?? null });
    if (!b.scheduledAt) runBroadcastNowMem(ws, b);
    return res.status(201).json(b);
  }
  try {
    const b = await bRepo.createWithTemplate(ws, { name: parse.data.name, templateText: parse.data.templateText, scheduledAt: parse.data.scheduledAt ?? null, segmentId: parse.data.segmentId ?? null });
    if (!b.scheduledAt) {
      // Run now in DB mode
      await bRepo.markRunning(ws, b.id);
      const contacts = parse.data.segmentId ? await segmentsRepo.contactsForSegment(ws, parse.data.segmentId) : await contactRepo.listContacts(ws);
      let targeted = 0, sent = 0, failed = 0;
      targeted = contacts.length;
      for (const c of contacts) {
        try {
          await msgRepo.addMessage(ws, { contactId: c.id, direction: 'outbound', mtype: 'text', text: b.templateText });
          sent++;
        } catch {
          failed++;
        }
      }
      await bRepo.markCompleted(ws, b.id, { targeted, sent, failed });
      b.metrics = { targeted, sent, failed };
      b.status = 'completed';
    }
    res.status(201).json(b);
  } catch (e: any) {
    res.status(500).json({ error: 'DB_ERROR', message: e.message });
  }
});

export default router;
