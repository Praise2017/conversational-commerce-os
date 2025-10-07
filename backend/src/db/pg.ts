import { Pool, QueryResultRow } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool | null {
  if (pool !== null) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  pool = new Pool({ connectionString: url });
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: any[]): Promise<{ rows: T[] } | null> {
  const p = getPool();
  if (!p) return null;
  const result = await p.query<T>(text, params);
  return { rows: result.rows };
}
