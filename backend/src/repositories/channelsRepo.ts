import { getPool, query } from '../db/pg.js';
import type { Channel } from '../storage/db.js';

export async function listChannels(wsId: string): Promise<Channel[]> {
  const res = await query<Channel>(
    `SELECT id, type, name, status,
            credentials as "config",
            to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
            to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
       FROM channels WHERE workspace_id=$1 ORDER BY created_at DESC`,
    [wsId]
  );
  if (!res) return [];
  return res.rows as Channel[];
}

export async function addChannel(wsId: string, input: Omit<Channel,'id'|'createdAt'|'updatedAt'>): Promise<Channel> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  const r = await p.query<Channel>(
    `INSERT INTO channels (workspace_id, type, name, status, credentials)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING id, type, name, status,
              credentials as "config",
              to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
              to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"`,
    [wsId, input.type, input.name, input.status, (input as any).config ?? {}]
  );
  return r.rows[0] as Channel;
}

export async function setChannelStatus(wsId: string, id: string, status: Channel['status']): Promise<Channel|null> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  const r = await p.query<Channel>(
    `UPDATE channels SET status=$3, updated_at=now() WHERE workspace_id=$1 AND id=$2
     RETURNING id, type, name, status,
               credentials as "config",
               to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
               to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"`,
    [wsId, id, status]
  );
  const row = r.rows[0];
  if (!row) return null;
  return row as Channel;
}

export async function getChannelById(wsId: string, id: string): Promise<Channel|null> {
  const res = await query<Channel>(
    `SELECT id, type, name, status,
            credentials as "config",
            to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
            to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
       FROM channels WHERE workspace_id=$1 AND id=$2 LIMIT 1`,
    [wsId, id]
  );
  if (!res || !res.rows[0]) return null;
  return res.rows[0] as Channel;
}
