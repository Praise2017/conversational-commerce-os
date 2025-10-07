import { getPool, query } from '../db/pg.js';
import type { Template } from '../storage/db.js';

export async function listTemplates(wsId: string): Promise<Template[]> {
  const res = await query<any>(
    `SELECT id, name, body, channel_type as "channelType", variables,
            to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"
       FROM templates WHERE workspace_id=$1 ORDER BY name`,
    [wsId]
  );
  if (!res) return [];
  return (res.rows as any[]).map(r => ({ ...r, updatedAt: r.createdAt })) as Template[];
}

export async function addTemplate(wsId: string, input: { name: string; body: string; channelType?: string; variables?: string[] }): Promise<Template> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  const channelType = input.channelType || 'whatsapp';
  const r = await p.query<any>(
    `INSERT INTO templates (workspace_id, name, channel_type, body, variables)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, name, body, channel_type as "channelType", variables,
               to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"`,
    [wsId, input.name, channelType, input.body, input.variables ?? []]
  );
  const row: any = r.rows[0];
  row.updatedAt = row.createdAt;
  return row as Template;
}

export async function getTemplateById(wsId: string, id: string): Promise<Template | null> {
  const res = await query<any>(
    `SELECT id, name, body, channel_type as "channelType", variables,
            to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"
       FROM templates WHERE workspace_id=$1 AND id=$2 LIMIT 1`,
    [wsId, id]
  );
  if (!res || !res.rows[0]) return null;
  const row = res.rows[0];
  return { id: row.id, name: row.name, body: row.body, channelType: row.channelType, variables: row.variables || [], createdAt: row.createdAt, updatedAt: row.createdAt } as Template;
}
