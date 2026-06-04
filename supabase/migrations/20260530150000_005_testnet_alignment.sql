-- Testnet alignment tables (mirror mainnet schema; populated during pipeline / transfers)

CREATE TABLE IF NOT EXISTS twin_on_chain_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES physical_assets(id) ON DELETE CASCADE,
  ipfs_cid TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  contract_address TEXT,
  tx_hash TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'anchored', 'failed')) DEFAULT 'pending',
  anchored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (asset_id, chain_id)
);

CREATE TABLE IF NOT EXISTS travel_rule_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_ref TEXT NOT NULL UNIQUE,
  originator_wallet TEXT NOT NULL,
  beneficiary_wallet TEXT NOT NULL,
  amount_usdc_micro BIGINT NOT NULL,
  asset_id UUID REFERENCES physical_assets(id),
  ivms101_json JSONB NOT NULL DEFAULT '{}',
  jurisdiction TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'acknowledged')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accreditation_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_wallet TEXT NOT NULL,
  registry_source TEXT NOT NULL CHECK (registry_source IN ('SEC_EDGAR', 'FCA', 'MANUAL', 'TESTNET_FIXTURE')),
  accredited BOOLEAN NOT NULL,
  checked_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  evidence_ref TEXT,
  UNIQUE (investor_wallet, registry_source)
);

CREATE INDEX IF NOT EXISTS idx_travel_rule_beneficiary ON travel_rule_packets(beneficiary_wallet);
CREATE INDEX IF NOT EXISTS idx_accreditation_wallet ON accreditation_checks(investor_wallet);
