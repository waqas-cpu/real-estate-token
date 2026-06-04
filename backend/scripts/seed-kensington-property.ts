/**
 * Seed Kensington Palace Gardens listing via full RWA pipeline.
 * Run: npm run seed:kensington --prefix backend
 */
import 'dotenv/config';
import { assertSupabaseConfig } from '../src/config.js';
import { getSupabaseAdmin } from '../src/supabase.js';
import { PipelineService } from '../src/services/PipelineService.js';
import { OfferingService } from '../src/services/OfferingService.js';

const ACTOR = '00000000-0000-0000-0000-000000000099';
const WALLET = '0xKENSINGTON00000000000000000000000001';
const ADDRESS = 'Kensington Palace Gardens, London, UK';
const REF = 'KPG-LUXURY-001';

async function main() {
  assertSupabaseConfig();
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from('physical_assets')
    .select('id')
    .eq('address', ADDRESS)
    .maybeSingle();

  if (existing?.id) {
    console.log('✓ Property already exists:', existing.id);
    console.log('  Run supabase/seed_kensington_property.sql to refresh display fields if needed.');
    return;
  }

  const pipeline = new PipelineService();
  const symbol = `KPG${String(Date.now()).slice(-4)}`;

  console.log('Ingesting Kensington Palace Gardens via pipeline…');
  const full = await pipeline.runFullPipeline({
    registryType: 'HM_LAND_REGISTRY',
    referenceId: REF,
    createdBy: ACTOR,
    investorWallet: WALLET,
    jurisdiction: 'UK',
    symbol,
    userConfirmedEconomics: true,
    userConfirmedDeploy: process.env.ALLOW_SMART_CONTRACT_DEPLOY === 'true',
    network: 'sepolia',
    autoApproveIntelligence: true,
  });

  console.log('  assetId:', full.assetId);

  const offerings = new OfferingService();
  const start = new Date();
  const end = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const { offering } = await offerings.create({
    tokenId: full.layers.execution.token.id as string,
    assetId: full.assetId,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    userConfirmedEconomics: true,
  });

  await offerings.activate(offering.id as string);
  console.log('  offeringId:', offering.id);
  console.log('\n=== Kensington property seeded ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
