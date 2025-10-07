import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool | null {
  if (pool !== null) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  pool = new Pool({ connectionString: url });
  return pool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] } | null> {
  const p = getPool();
  if (!p) return null;
  return p.query(text, params);
}
