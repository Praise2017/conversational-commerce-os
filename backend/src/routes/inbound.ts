import { Router } from 'express';
import { z } from 'zod';
import { addMessage as addMessageMem, getOrCreateContactByExternal as getOrCreateContactByExternalMem } from '../storage/db.js';
import { emitWebhook } from '../webhooks/dispatcher.js';
import { getPool } from '../db/pg.js';
import * as msgRepo from '../repositories/messagesRepo.js';
import * as contactRepo from '../repositories/contactsRepo.js';
import { runWorkflowsForInbound } from '../workflows/engine.js';

const router = Router();

const InboundInput = z.object({
  externalId: z.string().min(1),
  type: z.enum(['text','image','template']).default('text'),
  text: z.string().optional(),
  channelId: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// POST /v1/webhooks/inbound/:channel
router.post('/:channel', async (req, res) => {
  const ws = req.workspaceId!;
  const parse = InboundInput.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parse.error.flatten() });

  const pool = getPool();
  if (!pool) {
    const contact = getOrCreateContactByExternalMem(ws, parse.data.externalId);
    const msg = addMessageMem(ws, {
      contactId: contact.id,
      direction: 'inbound',
      mtype: parse.data.type,
      text: parse.data.text,
      channelId: parse.data.channelId
    });
    emitWebhook('message.received', { workspaceId: ws, message: msg }).catch(()=>{});
    // run workflows (in-memory)
    await runWorkflowsForInbound({ workspaceId: ws, contact, message: msg });
    if (msg.text) {
      const reply = addMessageMem(ws, {
        contactId: contact.id,
        direction: 'outbound',
        mtype: 'text',
        text: `Thanks for your message: ${msg.text}`,
        channelId: parse.data.channelId
      });
      emitWebhook('message.sent', { workspaceId: ws, message: reply }).catch(()=>{});
    }
    return res.status(202).json({ ok: true });
  }

  const contact = await contactRepo.getOrCreateContactByExternal(ws, parse.data.externalId);
  const msg = await msgRepo.addMessage(ws, {
    contactId: contact.id,
    direction: 'inbound',
    mtype: parse.data.type,
    text: parse.data.text,
    channelId: parse.data.channelId
  });
  emitWebhook('message.received', { workspaceId: ws, message: msg }).catch(()=>{});
  await runWorkflowsForInbound({ workspaceId: ws, contact, message: msg });
  if (msg.text) {
    const reply = await msgRepo.addMessage(ws, {
      contactId: contact.id,
      direction: 'outbound',
      mtype: 'text',
      text: `Thanks for your message: ${msg.text}`,
      channelId: parse.data.channelId
    });
    emitWebhook('message.sent', { workspaceId: ws, message: reply }).catch(()=>{});
  }
  return res.status(202).json({ ok: true });
});

export default router;
