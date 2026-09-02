-- Run in Supabase SQL Editor if smoke:e2e fails with missing column "address".
-- Your physical_assets table was created from a different template (name, serial_number, etc.).
-- This renames it and frees the name for the RWA schema in migrations 001–005.

ALTER TABLE IF EXISTS public.physical_assets
  RENAME TO physical_assets_legacy_template;

-- Then run ALL files in order from supabase/migrations/:
--   20260529114031_001_rwa_tokenization_schema.sql
--   20260530120000_002_offering_subscriptions.sql
--   20260530130000_003_subscription_token_units.sql
--   20260530140000_004_intelligence_agent.sql
--   20260530150000_005_testnet_alignment.sql
--   20260601100000_006_rwa_multi_database_layers.sql
--   20260601100000_007_indexer_and_analytics_layers.sql
--
-- Or from repo root: npx supabase link --project-ref jvstdfjzszivkjrrsbbq && npx supabase db push
