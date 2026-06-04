/**
 * Production smoke test — requires backend/.env with Supabase credentials.
 * Run: npm run smoke:e2e --prefix backend
 */
import 'dotenv/config';
import { assertSupabaseConfig } from '../src/config.js';
import { getSupabaseAdmin } from '../src/supabase.js';
import { PipelineService } from '../src/services/PipelineService.js';
import { OfferingService } from '../src/services/OfferingService.js';
import { InvestmentService } from '../src/services/InvestmentService.js';
import { PLATFORM_TOKEN_ECONOMICS } from '../src/config/platformTokenEconomics.js';
import { getNetworkProfile } from '../src/config.js';

const SMOKE_ACTOR = '00000000-0000-0000-0000-000000000099';
const SMOKE_WALLET = '0xSMOKE0000000000000000000000000000000001';

async function main() {
  console.log('=== RWA Production Smoke E2E ===\n');
  assertSupabaseConfig();

  const { error: pingError } = await getSupabaseAdmin()
    .from('physical_assets')
    .select('id')
    .limit(1);
  if (pingError) {
    console.error('Database schema check failed:', pingError.message);
    if (pingError.code === 'PGRST205') {
      console.error(
        '\nTable public.physical_assets is missing. Apply supabase/migrations 001–005:\n' +
          '  Supabase Dashboard → SQL → run files in order, or:\n' +
          '  supabase link --project-ref jvstdfjzszivkjrrsbbq && supabase db push'
      );
    }
    process.exit(1);
  }
  console.log('✓ Supabase schema OK (physical_assets)');

  if (process.env.ALLOW_TOKEN_ECONOMICS_APPLY !== 'true') {
    console.warn('⚠ ALLOW_TOKEN_ECONOMICS_APPLY is not true — token/offering steps may fail');
  }

  const pipeline = new PipelineService();
  const ref = `SMOKE-${Date.now()}`;

  const symbol = `SMK${String(Date.now()).slice(-4)}`;

  console.log('\n1. Full pipeline (DATA → INTELLIGENCE → SECURITY → EXECUTION)...');
  const full = await pipeline.runFullPipeline({
    registryType: 'HM_LAND_REGISTRY',
    referenceId: ref,
    createdBy: SMOKE_ACTOR,
    investorWallet: SMOKE_WALLET,
    jurisdiction: 'US',
    symbol,
    userConfirmedEconomics: true,
    userConfirmedDeploy: process.env.ALLOW_SMART_CONTRACT_DEPLOY === 'true',
    network: 'sepolia',
    autoApproveIntelligence: true,
  });
  console.log('   assetId:', full.assetId);
  console.log('   onChainLinked:', full.onChainLinked);
  const token = full.layers.execution.token;
  console.log('   tokenId:', token.id);

  const offerings = new OfferingService();
  const start = new Date();
  const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  console.log('\n3. Create & activate offering...');
  const { offering } = await offerings.create({
    tokenId: token.id as string,
    assetId: full.assetId,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    userConfirmedEconomics: true,
  });
  await offerings.activate(offering.id as string);
  console.log('   offeringId:', offering.id);

  console.log('\n4. Subscribe 100 tokens (USDC)...');
  const investments = new InvestmentService();
  const sub = await investments.subscribe(
    offering.id as string,
    SMOKE_WALLET,
    100
  );
  console.log('   paid USDC micro:', sub.paidUsdcMicro);

  console.log('\n=== SMOKE E2E PASSED ===');
  console.log('Asset:', full.assetId);
  console.log('Token:', token.id);
  console.log('Offering:', offering.id);
}

main().catch((err) => {
  console.error('\n=== SMOKE E2E FAILED ===');
  console.error(err);
  process.exit(1);
});
