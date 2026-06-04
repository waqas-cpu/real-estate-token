/**
 * Validates PostgREST exposes RWA columns (not a generic asset template).
 * Run: npx tsx scripts/verify-supabase-schema.ts
 */
import 'dotenv/config';

const REQUIRED_PHYSICAL_ASSETS = [
  'id',
  'address',
  'title',
  'latitude',
  'longitude',
  'registry_source',
  'content_hash',
  'created_by',
];

const REQUIRED_TABLES = [
  'physical_assets',
  'digital_twins',
  'oracle_attestations',
  'security_tokens',
  'token_offerings',
  'valuations',
  'risk_scores',
];

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    console.error('OpenAPI fetch failed:', res.status);
    process.exit(1);
  }

  const spec = (await res.json()) as {
    definitions?: Record<string, { properties?: Record<string, unknown> }>;
  };
  const defs = spec.definitions ?? {};
  let failed = 0;

  console.log('\n=== Supabase RWA schema verification ===\n');

  for (const table of REQUIRED_TABLES) {
    if (!defs[table]?.properties) {
      console.log(`[FAIL] ${table}: missing — run migrations 001–005`);
      failed++;
      continue;
    }
    console.log(`[OK] ${table}: present`);
  }

  const pa = defs.physical_assets?.properties ?? {};
  const cols = Object.keys(pa);
  const missing = REQUIRED_PHYSICAL_ASSETS.filter((c) => !cols.includes(c));
  if (missing.length) {
    console.log(`\n[FAIL] physical_assets wrong shape`);
    console.log(`  Found columns: ${cols.join(', ')}`);
    console.log(`  Missing RWA columns: ${missing.join(', ')}`);
    console.log('  Fix: run supabase/FIX_WRONG_PHYSICAL_ASSETS.sql then migrations 001–005');
    failed++;
  } else {
    console.log('\n[OK] physical_assets has RWA columns (address, title, …)');
  }

  process.exit(failed ? 1 : 0);
}

main();
