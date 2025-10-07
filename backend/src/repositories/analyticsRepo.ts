import { query } from '../db/pg.js';

export type Summary = { contacts: number; messages: number; inbound: number; outbound: number };

export async function getSummary(wsId: string): Promise<Summary> {
  const contactsRes = await query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM contacts WHERE workspace_id=$1',
    [wsId]
  );
  const msgsRes = await query<{ inbound: string; outbound: string }>(
    `SELECT
       COALESCE(SUM(CASE WHEN direction='inbound' THEN 1 ELSE 0 END),0)::text AS inbound,
       COALESCE(SUM(CASE WHEN direction='outbound' THEN 1 ELSE 0 END),0)::text AS outbound
     FROM messages WHERE workspace_id=$1`,
    [wsId]
  );
  const contacts = parseInt(contactsRes?.rows?.[0]?.count || '0', 10);
  const inbound = parseInt(msgsRes?.rows?.[0]?.inbound || '0', 10);
  const outbound = parseInt(msgsRes?.rows?.[0]?.outbound || '0', 10);
  const messages = inbound + outbound;
  return { contacts, messages, inbound, outbound };
}
