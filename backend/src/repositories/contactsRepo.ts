import { getPool, query } from '../db/pg.js';
import type { Contact } from '../storage/db.js';

const TIMESTAMP_SQL = 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"';

export async function listContacts(wsId: string): Promise<Contact[]> {
  const res = await query<Contact>(
    `SELECT id, display_name as "displayName", email, phone, fields, tags,
            to_char(created_at, '${TIMESTAMP_SQL}') as "createdAt",
            to_char(updated_at, '${TIMESTAMP_SQL}') as "updatedAt"
       FROM contacts WHERE workspace_id=$1 ORDER BY created_at DESC`,
    [wsId]
  );
  if (!res) {
    // fallback handled by in-memory layer; callers may still use storage functions directly if needed
    return [];
  }
  return res.rows;
}

export async function addContact(wsId: string, input: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Contact> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  const r = await p.query<Contact>(
    `INSERT INTO contacts (workspace_id, display_name, email, phone, fields, tags)
     VALUES ($1,$2,$3,$4,COALESCE($5,'{}'::jsonb),COALESCE($6,'{}'::text[]))
     RETURNING id, display_name as "displayName", email, phone, fields, tags,
               to_char(created_at, '${TIMESTAMP_SQL}') as "createdAt",
               to_char(updated_at, '${TIMESTAMP_SQL}') as "updatedAt"`,
    [wsId, input.displayName, input.email ?? null, input.phone ?? null, input.fields ?? {}, input.tags ?? []]
  );
  return r.rows[0];
}

export async function findContact(wsId: string, id: string): Promise<Contact | null> {
  const res = await query<Contact>(
    `SELECT id, display_name as "displayName", email, phone, fields, tags,
            to_char(created_at, '${TIMESTAMP_SQL}') as "createdAt",
            to_char(updated_at, '${TIMESTAMP_SQL}') as "updatedAt"
       FROM contacts WHERE workspace_id=$1 AND id=$2`,
    [wsId, id]
  );
  if (!res) return null;
  return res.rows[0] || null;
}

export async function getOrCreateContactByExternal(wsId: string, externalId: string): Promise<Contact> {
  const p = getPool();
  if (!p) throw new Error('NO_DB');
  const found = await p.query<Contact>(
    `SELECT id, display_name as "displayName", email, phone, fields, tags,
            to_char(created_at, '${TIMESTAMP_SQL}') as "createdAt",
            to_char(updated_at, '${TIMESTAMP_SQL}') as "updatedAt"
       FROM contacts WHERE workspace_id=$1 AND fields->>'externalId' = $2 LIMIT 1`,
    [wsId, externalId]
  );
  if (found.rows[0]) return found.rows[0];
  const r = await p.query<Contact>(
    `INSERT INTO contacts (workspace_id, display_name, fields)
     VALUES ($1,$2,$3)
     RETURNING id, display_name as "displayName", email, phone, fields, tags,
               to_char(created_at, '${TIMESTAMP_SQL}') as "createdAt",
               to_char(updated_at, '${TIMESTAMP_SQL}') as "updatedAt"`,
    [wsId, `Guest ${externalId.slice(0,6)}`, { externalId }]
  );
  return r.rows[0];
}
