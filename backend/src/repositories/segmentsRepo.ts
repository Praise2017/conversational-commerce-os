import { getPool } from '../db/pg.js';
import type { Contact } from '../storage/db.js';

export type Segment = { id: string; name: string; filter: any; createdAt: string };

export async function createSegment(wsId: string, input: { name: string; filter: any }): Promise<Segment> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  const r = await p.query<any>(
    `INSERT INTO segments (workspace_id, name, filter)
     VALUES ($1,$2,COALESCE($3,'{}'::jsonb))
     RETURNING id, name, filter, to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"`,
    [wsId, input.name, input.filter ?? {}]
  );
  return r.rows[0] as Segment;
}

export async function listSegments(wsId: string): Promise<Segment[]> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  const r = await p.query<any>(
    `SELECT id, name, filter, to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"
       FROM segments WHERE workspace_id=$1 ORDER BY created_at DESC`,
    [wsId]
  );
  return r.rows as Segment[];
}

export async function contactsForSegment(wsId: string, segmentId: string): Promise<Contact[]> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  const seg = await p.query<any>(`SELECT filter FROM segments WHERE workspace_id=$1 AND id=$2`, [wsId, segmentId]);
  if (!seg.rows[0]) return [];
  const filter = seg.rows[0].filter || {};
  // Simple implementation: if filter.tagsAny is present (array), return contacts with any overlapping tag; else all contacts.
  if (Array.isArray(filter.tagsAny) && filter.tagsAny.length > 0) {
    const r = await p.query<any>(
      `SELECT id, display_name as "displayName", email, phone, fields, tags,
              to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
              to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
         FROM contacts WHERE workspace_id=$1 AND (tags && $2::text[])`,
      [wsId, filter.tagsAny]
    );
    return r.rows as Contact[];
  } else {
    const r = await p.query<any>(
      `SELECT id, display_name as "displayName", email, phone, fields, tags,
              to_char(created_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt",
              to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "updatedAt"
         FROM contacts WHERE workspace_id=$1`,
      [wsId]
    );
    return r.rows as Contact[];
  }
}
