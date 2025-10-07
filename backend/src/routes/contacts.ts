import { Router } from 'express';
import { z } from 'zod';
import { addContact as addContactMem, listContacts as listContactsMem } from '../storage/db.js';
import { emitWebhook } from '../webhooks/dispatcher.js';
import { getPool } from '../db/pg.js';
import * as repo from '../repositories/contactsRepo.js';
import { logAudit } from '../audit.js';

const router = Router();

const ContactInput = z.object({
  displayName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  fields: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional()
});

router.get('/', (req, res) => {
  const ws = req.workspaceId!;
  const pool = getPool();
  if (!pool) {
    const contacts = listContactsMem(ws);
    return res.json({ data: contacts });
  }
  repo.listContacts(ws)
    .then(data => res.json({ data }))
    .catch(err => res.status(500).json({ error: 'DB_ERROR', message: (err as Error).message }));
});

router.post('/', async (req, res) => {
  const ws = req.workspaceId!;
  const parse = ContactInput.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parse.error.flatten() });

  const pool = getPool();
  const contact = pool
    ? await repo.addContact(ws, parse.data)
    : addContactMem(ws, parse.data);
  // fire-and-forget webhook
  emitWebhook('contact.created', { workspaceId: ws, contact }).catch(() => {});
  // audit
  logAudit(ws, 'contact.created', 'contact', contact.id).catch(()=>{});

  res.status(201).json(contact);
});

export default router;
