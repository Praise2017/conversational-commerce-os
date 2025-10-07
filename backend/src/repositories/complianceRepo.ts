import { getPool } from '../db/pg.js';
import type { Contact, Message } from '../storage/db.js';

export async function exportContactBundle(wsId: string, contactId: string): Promise<{ contact: Contact | null; messages: Message[] }> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  const c = await p.query<any>(
    `SELECT id, display_name as "displayName", email, phone, fields, tags,
            to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
            to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
       FROM contacts WHERE workspace_id=$1 AND id=$2 LIMIT 1`,
    [wsId, contactId]
  );
  const m = await p.query<any>(
    `SELECT id, contact_id as "contactId", direction, mtype,
            text, media_url as "mediaUrl", template_id as "templateId", channel_id as "channelId",
            to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"
       FROM messages WHERE workspace_id=$1 AND contact_id=$2 ORDER BY created_at ASC`,
    [wsId, contactId]
  );
  return { contact: (c.rows[0] as Contact) || null, messages: (m.rows as unknown as Message[]) };
}

export async function deleteContactBundle(wsId: string, contactId: string): Promise<void> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  await p.query('BEGIN');
  try {
    await p.query('DELETE FROM messages WHERE workspace_id=$1 AND contact_id=$2', [wsId, contactId]);
    await p.query('DELETE FROM contacts WHERE workspace_id=$1 AND id=$2', [wsId, contactId]);
    await p.query('COMMIT');
  } catch (e) {
    await p.query('ROLLBACK');
    throw e;
  }
}
