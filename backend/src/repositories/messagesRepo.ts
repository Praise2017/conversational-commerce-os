import { getPool, query } from '../db/pg.js';
import type { Message } from '../storage/db.js';

export async function listMessagesByContact(wsId: string, contactId: string): Promise<Message[]> {
  const res = await query<Message>(
    `SELECT id, contact_id as "contactId", direction, mtype,
            text, media_url as "mediaUrl", template_id as "templateId", channel_id as "channelId",
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"
       FROM messages WHERE workspace_id=$1 AND contact_id=$2 ORDER BY created_at ASC`,
    [wsId, contactId]
  );
  if (!res) return [];
  return res.rows as Message[];
}

export async function addMessage(wsId: string, input: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  const r = await p.query<Message>(
    `INSERT INTO messages (workspace_id, contact_id, direction, mtype, text, media_url, template_id, channel_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, contact_id as "contactId", direction, mtype,
               text, media_url as "mediaUrl", template_id as "templateId", channel_id as "channelId",
               to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"`,
    [wsId, input.contactId, input.direction, input.mtype, input.text ?? null, input.mediaUrl ?? null, input.templateId ?? null, input.channelId ?? null]
  );
  return r.rows[0] as Message;
}

export async function setExternal(wsId: string, id: string, externalId: string, status?: string): Promise<void> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  await p.query(
    `UPDATE messages SET metadata = jsonb_set(COALESCE(metadata,'{}'::jsonb),'{"externalId"}', to_jsonb($1::text), true), status=COALESCE($2,status)
      WHERE workspace_id=$3 AND id=$4`,
    [externalId, status ?? null, wsId, id]
  );
}

export async function updateStatusByExternal(wsId: string, externalId: string, status: string): Promise<void> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  await p.query(
    `UPDATE messages SET status=$1 WHERE workspace_id=$2 AND metadata->>'externalId' = $3`,
    [status, wsId, externalId]
  );
}
