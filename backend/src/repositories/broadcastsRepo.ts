import { getPool } from '../db/pg.js';
import { randomUUID } from 'node:crypto';
import type { Broadcast } from '../storage/db.js';

export type DbBroadcast = Broadcast & { workspaceId: string };

export async function createWithTemplate(wsId: string, input: { name: string; templateText: string; scheduledAt?: string | null; segmentId?: string | null }): Promise<Broadcast> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  await p.query('BEGIN');
  try {
    const t = await p.query<any>(
      `INSERT INTO templates (workspace_id, name, channel_type, body, variables)
       VALUES ($1, $2, 'whatsapp', $3, '{}')
       RETURNING id, to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"`,
      [wsId, `${input.name} ${new Date().toISOString()}`, input.templateText]
    );
    const templateId = t.rows[0].id as string;
    const status = input.scheduledAt ? 'scheduled' : 'running';
    const b = await p.query<any>(
      `INSERT INTO broadcasts (workspace_id, name, template_id, segment_id, status, scheduled_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, name, status, scheduled_at as "scheduledAt", metrics,
                 to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
                 to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"`,
      [wsId, input.name, templateId, input.segmentId ?? null, status, input.scheduledAt ?? null]
    );
    await p.query('COMMIT');
    const row = b.rows[0];
    const out: Broadcast = {
      id: row.id,
      name: row.name,
      templateText: input.templateText,
      status: row.status,
      scheduledAt: row.scheduledAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      metrics: row.metrics ?? { targeted: 0, sent: 0, failed: 0 }
    };
    return out;
  } catch (e) {
    await p.query('ROLLBACK');
    throw e;
  }
}

export async function list(wsId: string): Promise<Broadcast[]> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  const r = await p.query<any>(
    `SELECT b.id, b.name, b.status, b.scheduled_at as "scheduledAt",
            to_char(b.created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
            to_char(b.updated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt",
            b.metrics,
            t.body as "templateText"
       FROM broadcasts b
       LEFT JOIN templates t ON t.id=b.template_id
      WHERE b.workspace_id=$1
      ORDER BY b.created_at DESC`,
    [wsId]
  );
  return (r.rows as any[]).map(row => ({
    id: row.id,
    name: row.name,
    templateText: row.templateText || '',
    status: row.status,
    scheduledAt: row.scheduledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    metrics: row.metrics ?? { targeted: 0, sent: 0, failed: 0 }
  }));
}

export async function listDue(nowIso: string): Promise<Array<{ workspaceId: string; id: string; name: string; templateText: string }>> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  const r = await p.query<any>(
    `SELECT b.id, b.workspace_id as "workspaceId", b.name, t.body as "templateText", b.segment_id as "segmentId"
       FROM broadcasts b
       LEFT JOIN templates t ON t.id=b.template_id
      WHERE b.status='scheduled' AND b.scheduled_at IS NOT NULL AND b.scheduled_at <= $1
      ORDER BY b.created_at ASC`,
    [nowIso]
  );
  return r.rows as Array<{ workspaceId: string; id: string; name: string; templateText: string; segmentId?: string | null }>;
}

export async function markCompleted(wsId: string, id: string, metrics: { targeted: number; sent: number; failed: number }) {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  await p.query('UPDATE broadcasts SET status=\'completed\', metrics=$3::jsonb, updated_at=now() WHERE workspace_id=$1 AND id=$2', [wsId, id, metrics]);
}

export async function markRunning(wsId: string, id: string) {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  await p.query('UPDATE broadcasts SET status=\'running\', updated_at=now() WHERE workspace_id=$1 AND id=$2', [wsId, id]);
}
