import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getPool } from './db/pg.js';

async function main() {
  const pool = getPool();
  if (!pool) {
    console.log('No DATABASE_URL set. Skipping migrations.');
    return;
  }
  const schemaPath = path.resolve(process.cwd(), '..', 'docs', 'schema.sql');
  const sql = await readFile(schemaPath, 'utf8');
  console.log(`Applying schema from ${schemaPath}...`);
  await pool.query(sql);
  console.log('Migrations applied.');
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
