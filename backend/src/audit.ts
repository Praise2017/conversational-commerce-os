import { getPool } from './db/pg.js';

export async function logAudit(wsId: string, action: string, targetType: string, targetId?: string | null, metadata?: any) {
  const p = getPool();
  if (!p) return; // simply no-op in memory mode
  try {
    await p.query(
      `INSERT INTO audit_logs (workspace_id, action, target_type, target_id, metadata)
       VALUES ($1,$2,$3,$4,COALESCE($5,'{}'::jsonb))`,
      [wsId, action, targetType, targetId ?? null, metadata ?? {}]
    );
  } catch {
    // ignore audit errors
  }
}
