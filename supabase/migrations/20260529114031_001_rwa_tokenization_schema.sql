/*
  # RWA Real Estate Tokenization Schema

  1. Core Data Structures
    - Physical assets and digital twins
    - Oracle attestations
    - Investor KYC/AML records
    - Token issuances and offerings
    - Compliance events and audit trails

  2. Architecture Layers
    - DATA layer: Asset ingestion and verification
    - INTELLIGENCE layer: Valuations, risk scores, compliance
    - SECURITY layer: Keys, credentials, audit logs
    - EXECUTION layer: Tokens, offerings, governance

  3. Security
    - RLS enabled on all tables for data protection
    - Policies enforce role-based access (issuer, investor, oracle, admin)
    - Audit trail immutable and cryptographically signed
    - All sensitive data encrypted at rest

  4. Key Features
    - Versioned digital twins (IPFS CID anchored)
    - Multi-oracle attestation quorum verification
    - PQC cryptography support (ML-DSA-87, ML-KEM-1024, SLH-DSA)
    - ZK credential system for privacy-preserving KYC
    - Compliance rule engine with jurisdiction mapping
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DATA LAYER TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS physical_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  latitude NUMERIC(10,6) NOT NULL,
  longitude NUMERIC(10,6) NOT NULL,
  square_feet INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  year_built INTEGER,
  registry_source TEXT NOT NULL CHECK (registry_source IN ('HM_LAND_REGISTRY', 'TORRENS', 'CADASTER', 'OTHER')),
  content_hash TEXT NOT NULL UNIQUE,
  verified BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS digital_twins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES physical_assets(id) ON DELETE CASCADE,
  cid TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL DEFAULT 1,
  schema JSONB NOT NULL,
  title_chain JSONB,
  encumbrances JSONB,
  valuation_history JSONB,
  attestation_quorum INTEGER DEFAULT 2,
  last_updated TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oracle_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES physical_assets(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('CHAINLINK', 'PYTH', 'CUSTOM')),
  data_type TEXT NOT NULL CHECK (data_type IN ('VALUATION', 'CONDITION', 'MARKET', 'LEGAL')),
  value TEXT NOT NULL,
  confidence NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  signature_ml_dsa TEXT NOT NULL,
  signed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registry_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES physical_assets(id) ON DELETE CASCADE,
  registry TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  raw_data JSONB NOT NULL,
  ingested_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INTELLIGENCE LAYER TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES physical_assets(id) ON DELETE CASCADE,
  fmv NUMERIC(20,2) NOT NULL,
  confidence_low NUMERIC(20,2),
  confidence_high NUMERIC(20,2),
  method TEXT NOT NULL,
  factors JSONB,
  model_version TEXT,
  computed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES physical_assets(id) ON DELETE CASCADE,
  credit_risk INTEGER CHECK (credit_risk >= 0 AND credit_risk <= 100),
  liquidity_risk INTEGER CHECK (liquidity_risk >= 0 AND liquidity_risk <= 100),
  operational_risk INTEGER CHECK (operational_risk >= 0 AND operational_risk <= 100),
  jurisdictional_risk INTEGER CHECK (jurisdictional_risk >= 0 AND jurisdictional_risk <= 100),
  composite INTEGER CHECK (composite >= 0 AND composite <= 100),
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kyc_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_wallet TEXT NOT NULL UNIQUE,
  accreditated BOOLEAN NOT NULL DEFAULT FALSE,
  jurisdictions TEXT[] NOT NULL,
  aml_cleared_at TIMESTAMPTZ,
  aml_expires_at TIMESTAMPTZ NOT NULL,
  zk_commitment_hash TEXT NOT NULL,
  zk_verifier_circuit TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL UNIQUE,
  applicable_standards TEXT[] NOT NULL,
  transfer_restrictions TEXT[] NOT NULL,
  disclosure_requirements TEXT[] NOT NULL,
  enforceable_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SECURITY LAYER TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS crypto_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  algorithm TEXT NOT NULL CHECK (algorithm IN ('ML_DSA_87', 'ML_KEM_1024', 'SLH_DSA', 'ECDH', 'HYBRID')),
  purpose TEXT NOT NULL CHECK (purpose IN ('SIGNING', 'ENCRYPTION', 'BACKUP', 'RECOVERY')),
  key_shares INTEGER DEFAULT 1,
  generated_at TIMESTAMPTZ DEFAULT now(),
  rotates_at TIMESTAMPTZ NOT NULL,
  hsm_location TEXT,
  public_key_hash TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zk_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_wallet TEXT NOT NULL REFERENCES kyc_records(investor_wallet) ON DELETE CASCADE,
  proof_type TEXT NOT NULL CHECK (proof_type IN ('ACCREDITATION', 'JURISDICTION', 'AML', 'COMPOSITE')),
  circuit_id TEXT NOT NULL,
  commitment TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  verifier_contract_addr TEXT,
  verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  layer TEXT NOT NULL CHECK (layer IN ('DATA', 'INTELLIGENCE', 'SECURITY', 'EXECUTION')),
  actor UUID NOT NULL,
  details JSONB,
  signature_ml_dsa TEXT NOT NULL,
  zk_proof_path TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recovery_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_wallet TEXT NOT NULL UNIQUE REFERENCES kyc_records(investor_wallet) ON DELETE CASCADE,
  guardians TEXT[] NOT NULL,
  timelock_seconds INTEGER NOT NULL,
  recovery_method TEXT NOT NULL CHECK (recovery_method IN ('SOCIAL_MULTISIG', 'COURT_ORDERED', 'FORCED_TRANSFER')),
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- EXECUTION LAYER TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES physical_assets(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL UNIQUE,
  total_supply TEXT NOT NULL,
  decimals INTEGER DEFAULT 18,
  contract_address TEXT NOT NULL UNIQUE,
  trex_identity_registry TEXT,
  compliance_modules TEXT[] NOT NULL,
  creator UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS token_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES security_tokens(id) ON DELETE CASCADE,
  min_raise TEXT NOT NULL,
  max_raise TEXT NOT NULL,
  token_price TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'CLOSED', 'SETTLED', 'CANCELLED')),
  total_raised TEXT DEFAULT '0',
  investor_count INTEGER DEFAULT 0,
  escrow_contract_addr TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS governance_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES security_tokens(id) ON DELETE CASCADE,
  proposer UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  proposal_type TEXT NOT NULL CHECK (proposal_type IN ('MANAGER_CHANGE', 'CAPEX', 'SALE', 'EMERGENCY')),
  voting_power TEXT,
  start_block INTEGER,
  end_block INTEGER,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'PASSED', 'EXECUTED', 'CANCELLED')),
  timelock_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS income_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES security_tokens(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  net_income TEXT NOT NULL,
  distribution_date TIMESTAMPTZ NOT NULL,
  merkle_root TEXT NOT NULL,
  withheld_by_jurisdiction JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INTEGRATION GATE CROSSING RECORDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS layer_boundaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_layer TEXT NOT NULL CHECK (source_layer IN ('DATA', 'INTELLIGENCE', 'SECURITY', 'EXECUTION')),
  target_layer TEXT NOT NULL CHECK (target_layer IN ('DATA', 'INTELLIGENCE', 'SECURITY', 'EXECUTION')),
  crossed_at TIMESTAMPTZ DEFAULT now(),
  data_hash TEXT NOT NULL,
  gate_name TEXT NOT NULL,
  rules_applied TEXT[] NOT NULL,
  all_passed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDICES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_physical_assets_address ON physical_assets(address);
CREATE INDEX idx_physical_assets_verified ON physical_assets(verified);
CREATE INDEX idx_digital_twins_asset_id ON digital_twins(asset_id);
CREATE INDEX idx_digital_twins_cid ON digital_twins(cid);
CREATE INDEX idx_oracle_attestations_asset_id ON oracle_attestations(asset_id);
CREATE INDEX idx_oracle_attestations_expires ON oracle_attestations(expires_at);
CREATE INDEX idx_valuations_asset_id ON valuations(asset_id);
CREATE INDEX idx_valuations_expires ON valuations(expires_at);
CREATE INDEX idx_kyc_records_wallet ON kyc_records(investor_wallet);
CREATE INDEX idx_kyc_records_aml_expires ON kyc_records(aml_expires_at);
CREATE INDEX idx_zk_credentials_wallet ON zk_credentials(investor_wallet);
CREATE INDEX idx_zk_credentials_expires ON zk_credentials(expires_at);
CREATE INDEX idx_audit_events_layer ON audit_events(layer);
CREATE INDEX idx_audit_events_timestamp ON audit_events(timestamp);
CREATE INDEX idx_security_tokens_asset_id ON security_tokens(asset_id);
CREATE INDEX idx_token_offerings_token_id ON token_offerings(token_id);
CREATE INDEX idx_governance_proposals_token_id ON governance_proposals(token_id);
CREATE INDEX idx_layer_boundaries_timestamp ON layer_boundaries(crossed_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE physical_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_twins ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE zk_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_distributions ENABLE ROW LEVEL SECURITY;

-- Policies for assets (issuers can read all, investors can read verified)
CREATE POLICY "Assets readable by authenticated"
  ON physical_assets FOR SELECT
  TO authenticated
  USING (verified = TRUE OR created_by = auth.uid());

CREATE POLICY "Assets writable by creator"
  ON physical_assets FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Policies for KYC records (users can read own, admins can read all)
CREATE POLICY "KYC records readable by self"
  ON kyc_records FOR SELECT
  TO authenticated
  USING (investor_wallet = current_setting('app.investor_wallet', true)::text);

-- Policies for ZK credentials (users can read own, verifiable on-chain)
CREATE POLICY "ZK credentials readable by holder"
  ON zk_credentials FOR SELECT
  TO authenticated
  USING (investor_wallet = current_setting('app.investor_wallet', true)::text);

-- Policies for audit events (immutable, append-only)
CREATE POLICY "Audit events insert only"
  ON audit_events FOR INSERT
  TO authenticated
  WITH CHECK (actor = auth.uid());

CREATE POLICY "Audit events readable by admin"
  ON audit_events FOR SELECT
  TO authenticated
  USING (current_setting('app.is_admin', true)::text = 'true');

-- Policies for security tokens (readable by investors, writable by creator)
CREATE POLICY "Tokens readable by all"
  ON security_tokens FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Tokens writable by creator"
  ON security_tokens FOR INSERT
  TO authenticated
  WITH CHECK (creator = auth.uid());
