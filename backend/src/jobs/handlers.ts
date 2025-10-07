import * as msgRepo from '../repositories/messagesRepo.js';
import * as contactRepo from '../repositories/contactsRepo.js';
import * as bRepo from '../repositories/broadcastsRepo.js';
import * as segmentsRepo from '../repositories/segmentsRepo.js';

export async function handleBroadcastRun(payload: { workspaceId: string; broadcastId: string; templateText: string; segmentId?: string | null }) {
  const { workspaceId: ws, broadcastId, templateText, segmentId } = payload;
  const contacts = segmentId ? await segmentsRepo.contactsForSegment(ws, segmentId) : await contactRepo.listContacts(ws);
  let targeted = contacts.length, sent = 0, failed = 0;
  for (const c of contacts) {
    try {
      await msgRepo.addMessage(ws, { contactId: c.id, direction: 'outbound', mtype: 'text', text: templateText });
      sent++;
    } catch {
      failed++;
    }
  }
  await bRepo.markCompleted(ws, broadcastId, { targeted, sent, failed });
}
