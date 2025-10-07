import { Router } from 'express';
import { z } from 'zod';
import { addMessage as addMessageMem, findContact as findContactMem, listMessagesByContact as listMessagesByContactMem, findTemplate as findTemplateMem } from '../storage/db.js';
import { emitWebhook } from '../webhooks/dispatcher.js';
import { getPool } from '../db/pg.js';
import * as msgRepo from '../repositories/messagesRepo.js';
import * as contactRepo from '../repositories/contactsRepo.js';
import * as templateRepo from '../repositories/templatesRepo.js';
import { findChannel } from '../storage/db.js';
import * as channelsRepo from '../repositories/channelsRepo.js';
import { sendText as sendWhatsAppText } from '../adapters/whatsapp.js';

const router = Router();

const SendInput = z.object({
  contactId: z.string().min(1),
  type: z.enum(['text','image','template']).default('text'),
  text: z.string().optional(),
  channelId: z.string().optional(),
  templateId: z.string().optional(),
  variables: z.record(z.string()).optional(),
});

router.get('/', (req, res) => {
  const ws = req.workspaceId!;
  const contactId = req.query.contactId as string | undefined;
  if (!contactId) return res.status(400).json({ error: 'MISSING_CONTACT_ID' });
  const pool = getPool();
  if (!pool) {
    const data = listMessagesByContactMem(ws, contactId);
    return res.json({ data });
  }
  msgRepo.listMessagesByContact(ws, contactId)
    .then(data => res.json({ data }))
    .catch(err => res.status(500).json({ error: 'DB_ERROR', message: (err as Error).message }));
});

function renderTemplate(body: string, vars: Record<string, string> = {}): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => (vars[k] ?? ''));
}

router.post('/', async (req, res) => {
  const ws = req.workspaceId!;
  const parse = SendInput.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parse.error.flatten() });
  const { contactId, type, text, channelId, templateId, variables } = parse.data;
  const pool = getPool();
  if (!pool) {
    const contact = findContactMem(ws, contactId);
    if (!contact) return res.status(404).json({ error: 'CONTACT_NOT_FOUND' });
    let finalText = text;
    if (type === 'template' && templateId) {
      const tpl = findTemplateMem(ws, templateId);
      if (!tpl) return res.status(404).json({ error: 'TEMPLATE_NOT_FOUND' });
      finalText = renderTemplate(tpl.body, variables || {});
    }
    const msg = addMessageMem(ws, { contactId, direction: 'outbound', mtype: type, text: finalText, channelId, templateId });
    emitWebhook('message.sent', { workspaceId: ws, message: msg }).catch(()=>{});
    return res.status(201).json(msg);
  }
  const c = await contactRepo.findContact(ws, contactId);
  if (!c) return res.status(404).json({ error: 'CONTACT_NOT_FOUND' });
  let finalText = text ?? '';
  if (type === 'template') {
    if (!templateId) return res.status(400).json({ error: 'MISSING_TEMPLATE_ID' });
    const tpl = await templateRepo.getTemplateById(ws, templateId);
    if (!tpl) return res.status(404).json({ error: 'TEMPLATE_NOT_FOUND' });
    finalText = renderTemplate(tpl.body, variables || {});
  }
  const msg = await msgRepo.addMessage(ws, {
    contactId,
    direction: 'outbound',
    mtype: type,
    text: finalText,
    channelId,
    templateId,
  });
  emitWebhook('message.sent', { workspaceId: ws, message: msg }).catch(()=>{});
  // Best-effort channel send (WhatsApp) if applicable
  try {
    if (channelId && finalText) {
      // channel lookup depending on storage mode
      const ch = await channelsRepo.getChannelById(ws, channelId) || findChannel(ws, channelId);
      if (ch?.type === 'whatsapp' && (c as any).phone && (ch as any).config?.token && (ch as any).config?.phoneId) {
        const resp = await sendWhatsAppText({ token: (ch as any).config.token, phoneId: (ch as any).config.phoneId, apiBase: (ch as any).config.apiBase }, (c as any).phone, finalText);
        if ((resp as any)?.ok && (resp as any)?.response?.messages?.[0]?.id) {
          const externalId = (resp as any).response.messages[0].id as string;
          await msgRepo.setExternal(ws, msg.id, externalId, 'sent');
        }
      }
    }
  } catch {}
  res.status(201).json(msg);
});

export default router;
