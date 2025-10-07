import { getPool } from '../db/pg.js';

export type JobRecord = {
  id: string;
  workspaceId: string;
  jtype: string;
  status: 'queued' | 'running' | 'success' | 'failed';
  payload: any;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export async function enqueue(wsId: string, jtype: string, payload: any): Promise<string> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  const r = await p.query<{ id: string }>(
    `INSERT INTO jobs (workspace_id, jtype, payload) VALUES ($1,$2,$3) RETURNING id`,
    [wsId, jtype, payload]
  );
  return r.rows[0].id;
}

export async function claimNext(): Promise<JobRecord | null> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const sel = await client.query<any>(
      `SELECT id FROM jobs WHERE status='queued' ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`
    );
    if (!sel.rows[0]) { await client.query('COMMIT'); return null; }
    const id = sel.rows[0].id;
    await client.query(`UPDATE jobs SET status='running', updated_at=now(), attempts=attempts+1 WHERE id=$1`, [id]);
    const r = await client.query<any>(
      `SELECT id, workspace_id as "workspaceId", jtype, status, payload, attempts,
              to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
              to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
         FROM jobs WHERE id=$1`, [id]
    );
    await client.query('COMMIT');
    return r.rows[0] as JobRecord;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

export async function markSuccess(id: string): Promise<void> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  await p.query(`UPDATE jobs SET status='success', updated_at=now() WHERE id=$1`, [id]);
}

export async function markFailed(id: string, requeue: boolean): Promise<void> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  if (requeue) {
    await p.query(`UPDATE jobs SET status='queued', updated_at=now() WHERE id=$1`, [id]);
  } else {
    await p.query(`UPDATE jobs SET status='failed', updated_at=now() WHERE id=$1`, [id]);
  }
}
