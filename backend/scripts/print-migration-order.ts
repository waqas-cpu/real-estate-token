/**
 * Lists migration files in apply order (for Supabase SQL editor or db push).
 * Run: npx tsx scripts/print-migration-order.ts
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDir = join(import.meta.dirname, '../../../supabase/migrations');
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

console.log('Apply these SQL files in order (Dashboard → SQL → New query):\n');
for (const f of files) {
  console.log(`  supabase/migrations/${f}`);
}
console.log('\nOr from repo root:');
console.log('  npx supabase link --project-ref wjliwhjrfnnfqygflgqj');
console.log('  npx supabase db push');
