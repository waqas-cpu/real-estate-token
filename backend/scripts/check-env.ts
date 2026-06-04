/**
 * Quick env + connectivity check (no secrets printed).
 * Run: npx tsx scripts/check-env.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const checks: { name: string; ok: boolean; detail: string }[] = [];

function set(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
}

set('SUPABASE_URL', !!process.env.SUPABASE_URL, process.env.SUPABASE_URL ? 'set' : 'missing');
set(
  'SUPABASE_SERVICE_ROLE_KEY',
  !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing'
);
set('SUPABASE_ANON_KEY', !!process.env.SUPABASE_ANON_KEY, process.env.SUPABASE_ANON_KEY ? 'set' : 'missing');
const anonKey = process.env.SUPABASE_ANON_KEY ?? '';
if (anonKey.startsWith('sb_secret_')) {
  set(
    'SUPABASE_ANON_KEY type',
    false,
    'looks like a secret key — use publishable/anon key for SUPABASE_ANON_KEY & VITE_SUPABASE_ANON_KEY'
  );
} else if (anonKey) {
  set('SUPABASE_ANON_KEY type', true, 'not a service secret prefix');
}
set(
  'ALLOW_TOKEN_ECONOMICS_APPLY',
  process.env.ALLOW_TOKEN_ECONOMICS_APPLY === 'true',
  process.env.ALLOW_TOKEN_ECONOMICS_APPLY ?? 'unset'
);
set(
  'OPENAI/GROQ',
  !!(process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY),
  process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY ? 'set' : 'missing'
);
set('PINATA_JWT', !!process.env.PINATA_JWT, process.env.PINATA_JWT ? 'set' : 'missing');
set('PQC_PLATFORM_SEED', (process.env.PQC_PLATFORM_SEED?.length ?? 0) === 64, '64 hex chars');
set('SUMSUB (optional)', true, process.env.SUMSUB_APP_TOKEN ? 'set' : 'skipped — OK for testnet');

async function testSupabase() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !serviceKey) {
    set('Supabase ping (service)', false, 'missing url or service key');
    return;
  }
  try {
    const client = createClient(url, serviceKey);
    const { error } = await client.from('physical_assets').select('id').limit(1);
    if (error) {
      const hint =
        error.code === 'PGRST205'
          ? ' — run migrations 001–005 (Supabase SQL editor or: supabase link && supabase db push)'
          : '';
      set('Supabase schema (service)', false, error.message + hint);
    } else {
      try {
        const specRes = await fetch(`${url}/rest/v1/`, {
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        });
        const spec = (await specRes.json()) as {
          definitions?: Record<string, { properties?: Record<string, unknown> }>;
        };
        const cols = Object.keys(spec.definitions?.physical_assets?.properties ?? {});
        const needs = ['address', 'title', 'registry_source', 'content_hash'];
        const missing = needs.filter((c) => !cols.includes(c));
        if (missing.length) {
          set(
            'Supabase schema (service)',
            false,
            `physical_assets wrong template (missing ${missing.join(', ')}) — run supabase/FIX_WRONG_PHYSICAL_ASSETS.sql then migrations 001–005`
          );
        } else {
          set('Supabase schema (service)', true, 'physical_assets RWA columns OK');
        }
      } catch {
        set('Supabase schema (service)', true, 'physical_assets reachable (column check skipped)');
      }
    }
  } catch (e) {
    set('Supabase ping (service)', false, e instanceof Error ? e.message : 'failed');
  }

  if (!anonKey) {
    set('Supabase anon client', false, 'SUPABASE_ANON_KEY missing');
    return;
  }
  try {
    const anon = createClient(url, anonKey);
    const { error } = await anon.from('physical_assets').select('id').limit(1);
    set(
      'Supabase anon client',
      !error,
      error ? error.message : 'anon key accepted by API'
    );
  } catch (e) {
    set('Supabase anon client', false, e instanceof Error ? e.message : 'failed');
  }
}

async function testPinata() {
  if (!process.env.PINATA_JWT) {
    set('Pinata pin test', true, 'skipped — no JWT (simulated IPFS OK)');
    return;
  }
  try {
    const res = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
    });
    set('Pinata auth', res.ok, res.ok ? 'JWT valid' : `HTTP ${res.status}`);
  } catch (e) {
    set('Pinata auth', false, e instanceof Error ? e.message : 'failed');
  }
}

async function main() {
  await testSupabase();
  await testPinata();

  console.log('\n=== Backend env check ===\n');
  let failed = 0;
  for (const c of checks) {
    const icon = c.ok ? 'OK' : 'FAIL';
    if (!c.ok) failed++;
    console.log(`[${icon}] ${c.name}: ${c.detail}`);
  }
  console.log(failed ? `\n${failed} issue(s) — fix before smoke:e2e` : '\nAll critical checks passed.');
  process.exit(failed ? 1 : 0);
}

main();
