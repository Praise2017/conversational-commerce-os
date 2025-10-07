import { query } from '../db/pg.js';
import type { Workflow } from '../workflows/types.js';

export async function listByTrigger(wsId: string, trigger: 'message.received'): Promise<Workflow[]> {
  const res = await query<any>(
    `SELECT id, name, version, dsl
       FROM workflows
      WHERE workspace_id=$1 AND status='active'`,
    [wsId]
  );
  if (!res) return [];
  // dsl is stored as JSONB with { trigger, start, nodes, edges }
  const wfs: Workflow[] = [];
  for (const row of res.rows as any[]) {
    const dsl = row.dsl || {};
    if (dsl.trigger === trigger) {
      wfs.push({
        id: row.id,
        name: row.name,
        version: row.version,
        trigger: dsl.trigger,
        start: dsl.start,
        nodes: dsl.nodes || [],
        edges: dsl.edges || []
      });
    }
  }
  return wfs;
}
