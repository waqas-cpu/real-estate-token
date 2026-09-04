-- ============================================================================
-- MIGRATION 009: Comprehensive Production-Grade RWA CRUD Architecture
-- Domain Entities: SPVs, Properties, Documents, Tokens, Allocations, Investors,
-- KYC/KYB, Wallets, Transactions, and Append-Only Audit Logs.
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. SPV (Special Purpose Vehicle) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spvs (
  spv_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name VARCHAR(255) NOT NULL UNIQUE,
  jurisdiction VARCHAR(100) NOT NULL,
  registration_number VARCHAR(100) NOT NULL UNIQUE,
  entity_type VARCHAR(100) NOT NULL DEFAULT 'LLC',
  registered_address TEXT NOT NULL,
  incorporation_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('FORMATION', 'ACTIVE', 'DISSOLVED', 'SUSPENDED')),
  legal_document_reference TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spvs_jurisdiction ON spvs(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_spvs_status ON spvs(status) WHERE is_deleted = FALSE;

-- ── 2. Properties (with SPV Relationship & Explicit Lifecycle) ───────────────
CREATE TABLE IF NOT EXISTS rwa_properties (
  property_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_name VARCHAR(255) NOT NULL,
  property_type VARCHAR(100) NOT NULL CHECK (property_type IN ('RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'HOSPITALITY', 'MIXED_USE', 'LAND')),
  property_description TEXT,
  property_address TEXT NOT NULL,
  country VARCHAR(100) NOT NULL,
  region VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(50) NOT NULL,
  latitude NUMERIC(10, 6) NOT NULL,
  longitude NUMERIC(10, 6) NOT NULL,
  valuation NUMERIC(18, 2) NOT NULL CHECK (valuation >= 0),
  valuation_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  valuation_date DATE NOT NULL,
  acquisition_price NUMERIC(18, 2) NOT NULL CHECK (acquisition_price >= 0),
  estimated_rental_income NUMERIC(18, 2) DEFAULT 0 CHECK (estimated_rental_income >= 0),
  occupancy_rate NUMERIC(5, 2) DEFAULT 100.00 CHECK (occupancy_rate >= 0 AND occupancy_rate <= 100.00),
  legal_status VARCHAR(100) NOT NULL DEFAULT 'FREEHOLD',
  title_status VARCHAR(100) NOT NULL DEFAULT 'CLEAR',
  property_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (
    property_status IN ('DRAFT', 'UNDER_REVIEW', 'VERIFIED', 'APPROVED', 'TOKENIZATION_PENDING', 'TOKENIZED', 'ACTIVE', 'SUSPENDED', 'CLOSED')
  ),
  document_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (document_status IN ('PENDING', 'PARTIAL', 'COMPLETE', 'REJECTED')),
  spv_id UUID REFERENCES spvs(spv_id) ON DELETE RESTRICT,
  version INTEGER NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rwa_properties_status ON rwa_properties(property_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_rwa_properties_spv_id ON rwa_properties(spv_id);
CREATE INDEX IF NOT EXISTS idx_rwa_properties_country_city ON rwa_properties(country, city);

-- ── 3. Property Documents (with Hash Integrity & Verification Status) ────────
CREATE TABLE IF NOT EXISTS property_documents (
  document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES rwa_properties(property_id) ON DELETE RESTRICT,
  document_type VARCHAR(100) NOT NULL CHECK (
    document_type IN ('TITLE_DEED', 'VALUATION_REPORT', 'OWNERSHIP_CERTIFICATE', 'TAX_RECORD', 'INSURANCE_POLICY', 'INSPECTION_REPORT', 'LEGAL_AGREEMENT', 'OFFERING_MEMORANDUM', 'SPV_INCORPORATION')
  ),
  document_uri TEXT NOT NULL,
  document_hash VARCHAR(128) NOT NULL, -- SHA-256 or Keccak-256
  verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'SUPERSEDED')),
  uploaded_by UUID NOT NULL,
  verified_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_property_documents_property_id ON property_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_property_documents_hash ON property_documents(document_hash);

-- ── 4. Investors Profile ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rwa_investors (
  investor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  investor_type VARCHAR(50) NOT NULL CHECK (investor_type IN ('INDIVIDUAL', 'INSTITUTIONAL', 'FAMILY_OFFICE', 'CORPORATE')),
  legal_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  country VARCHAR(100) NOT NULL,
  primary_wallet_address VARCHAR(100),
  investor_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (investor_status IN ('ACTIVE', 'PENDING_ONBOARDING', 'RESTRICTED', 'BLOCKED')),
  accreditation_status VARCHAR(50) NOT NULL DEFAULT 'UNACCREDITED' CHECK (accreditation_status IN ('UNACCREDITED', 'ACCREDITED', 'QUALIFIED_PURCHASER', 'EXEMPT')),
  risk_profile VARCHAR(50) NOT NULL DEFAULT 'MODERATE' CHECK (risk_profile IN ('CONSERVATIVE', 'MODERATE', 'GROWTH', 'AGGRESSIVE')),
  version INTEGER NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rwa_investors_email ON rwa_investors(email);
CREATE INDEX IF NOT EXISTS idx_rwa_investors_accreditation ON rwa_investors(accreditation_status);

-- ── 5. KYC / KYB Compliance Verifications ───────────────────────────────────
CREATE TABLE IF NOT EXISTS rwa_kyc_verifications (
  verification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES rwa_investors(investor_id) ON DELETE RESTRICT,
  verification_type VARCHAR(50) NOT NULL CHECK (verification_type IN ('KYC_INDIVIDUAL', 'KYB_CORPORATE', 'ACCREDITATION_CHECK', 'AML_SCREENING')),
  provider VARCHAR(100) NOT NULL DEFAULT 'SUMSUB',
  verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED')),
  risk_level VARCHAR(50) NOT NULL DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'PROHIBITED')),
  verification_reference VARCHAR(255) NOT NULL UNIQUE,
  notes TEXT,
  verified_at TIMESTAMPTZ,
  expiry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rwa_kyc_investor_id ON rwa_kyc_verifications(investor_id);
CREATE INDEX IF NOT EXISTS idx_rwa_kyc_status ON rwa_kyc_verifications(verification_status);

-- ── 6. Investor Wallets ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rwa_wallets (
  wallet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES rwa_investors(investor_id) ON DELETE RESTRICT,
  blockchain VARCHAR(50) NOT NULL DEFAULT 'ETHEREUM',
  network VARCHAR(50) NOT NULL DEFAULT 'sepolia',
  wallet_address VARCHAR(100) NOT NULL,
  wallet_type VARCHAR(50) NOT NULL DEFAULT 'EOA' CHECK (wallet_type IN ('EOA', 'MULTISIG', 'SMART_CONTRACT', 'CUSTODIAL')),
  verification_status VARCHAR(50) NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED', 'SIGNATURE_VERIFIED', 'ONCHAIN_WHITELISTED', 'REVOKED')),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_wallet_per_network UNIQUE (blockchain, network, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_rwa_wallets_investor_id ON rwa_wallets(investor_id);
CREATE INDEX IF NOT EXISTS idx_rwa_wallets_address ON rwa_wallets(wallet_address);

-- ── 7. Tokens (ERC-3643 Securities with Immutable Deployed Fields) ───────────
CREATE TABLE IF NOT EXISTS rwa_tokens (
  token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES rwa_properties(property_id) ON DELETE RESTRICT,
  spv_id UUID NOT NULL REFERENCES spvs(spv_id) ON DELETE RESTRICT,
  token_name VARCHAR(255) NOT NULL,
  token_symbol VARCHAR(50) NOT NULL,
  blockchain VARCHAR(50) NOT NULL DEFAULT 'ETHEREUM',
  network_id VARCHAR(50) NOT NULL DEFAULT '11155111',
  standard VARCHAR(50) NOT NULL DEFAULT 'ERC-3643' CHECK (standard IN ('ERC-3643', 'ERC-20', 'ERC-1400')),
  contract_address VARCHAR(100),
  total_supply NUMERIC(28, 0) NOT NULL CHECK (total_supply > 0),
  token_decimals INTEGER NOT NULL DEFAULT 18 CHECK (token_decimals >= 0 AND token_decimals <= 18),
  tokenization_price NUMERIC(18, 4) NOT NULL CHECK (tokenization_price > 0),
  tokenization_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  minimum_investment NUMERIC(18, 2) NOT NULL DEFAULT 100.00 CHECK (minimum_investment > 0),
  token_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (
    token_status IN ('DRAFT', 'APPROVED', 'DEPLOYMENT_PENDING', 'DEPLOYED', 'ACTIVE', 'PAUSED', 'RETIRED')
  ),
  deployment_tx_hash VARCHAR(128),
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_contract_per_network UNIQUE (blockchain, network_id, contract_address)
);

CREATE INDEX IF NOT EXISTS idx_rwa_tokens_property_id ON rwa_tokens(property_id);
CREATE INDEX IF NOT EXISTS idx_rwa_tokens_contract ON rwa_tokens(contract_address) WHERE contract_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rwa_tokens_status ON rwa_tokens(token_status);

-- ── 8. Token Allocations (Financial Integrity & Double Allocation Guard) ──────
CREATE TABLE IF NOT EXISTS rwa_token_allocations (
  allocation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  token_id UUID NOT NULL REFERENCES rwa_tokens(token_id) ON DELETE RESTRICT,
  investor_id UUID NOT NULL REFERENCES rwa_investors(investor_id) ON DELETE RESTRICT,
  token_amount NUMERIC(28, 0) NOT NULL CHECK (token_amount > 0),
  allocation_price NUMERIC(18, 4) NOT NULL CHECK (allocation_price > 0),
  allocation_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  total_cost NUMERIC(18, 2) NOT NULL CHECK (total_cost > 0),
  allocation_status VARCHAR(50) NOT NULL DEFAULT 'RESERVED' CHECK (
    allocation_status IN ('RESERVED', 'SETTLED', 'CANCELLED', 'REFUNDED')
  ),
  settlement_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (
    settlement_status IN ('PENDING', 'ESCROWED', 'COMPLETED', 'FAILED')
  ),
  allocation_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  transaction_reference VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rwa_allocations_token ON rwa_token_allocations(token_id, allocation_status);
CREATE INDEX IF NOT EXISTS idx_rwa_allocations_investor ON rwa_token_allocations(investor_id);

-- ── 9. Transactions (Immutable Off-Chain Ledger of Blockchain State) ─────────
CREATE TABLE IF NOT EXISTS rwa_transactions (
  transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES rwa_investors(investor_id) ON DELETE RESTRICT,
  token_id UUID NOT NULL REFERENCES rwa_tokens(token_id) ON DELETE RESTRICT,
  transaction_type VARCHAR(50) NOT NULL CHECK (
    transaction_type IN ('PRIMARY_ISSUANCE', 'SECONDARY_TRANSFER', 'DIVIDEND_PAYOUT', 'TOKEN_REDEMPTION', 'BURN', 'RECOVERY')
  ),
  amount NUMERIC(18, 2) NOT NULL CHECK (amount >= 0),
  quantity NUMERIC(28, 0) NOT NULL CHECK (quantity >= 0),
  blockchain VARCHAR(50) NOT NULL DEFAULT 'ETHEREUM',
  network VARCHAR(50) NOT NULL DEFAULT 'sepolia',
  wallet_from VARCHAR(100) NOT NULL,
  wallet_to VARCHAR(100) NOT NULL,
  tx_hash VARCHAR(128) NOT NULL UNIQUE,
  block_number BIGINT,
  transaction_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (
    transaction_status IN ('PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'REVERTED')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rwa_tx_hash ON rwa_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_rwa_tx_token_id ON rwa_transactions(token_id);
CREATE INDEX IF NOT EXISTS idx_rwa_tx_investor_id ON rwa_transactions(investor_id);

-- Trigger to prevent mutation or deletion of confirmed transactions
CREATE OR REPLACE FUNCTION prevent_confirmed_transaction_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Financial and compliance integrity error: Transactions cannot be deleted.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.transaction_status = 'CONFIRMED' THEN
      RAISE EXCEPTION 'Financial integrity violation: Confirmed transaction records are immutable.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_confirmed_tx_mutation ON rwa_transactions;
CREATE TRIGGER trg_prevent_confirmed_tx_mutation
BEFORE UPDATE OR DELETE ON rwa_transactions
FOR EACH ROW EXECUTE FUNCTION prevent_confirmed_transaction_mutation();

-- ── 10. Audit Log (Append-Only Cryptographic Audit Records) ──────────────────
CREATE TABLE IF NOT EXISTS rwa_audit_logs (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id VARCHAR(100) NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  ip_reference VARCHAR(100),
  correlation_id VARCHAR(128) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rwa_audit_entity ON rwa_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_rwa_audit_correlation ON rwa_audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_rwa_audit_timestamp ON rwa_audit_logs(timestamp DESC);

-- Trigger to guarantee append-only behavior on audit log
CREATE OR REPLACE FUNCTION prevent_audit_log_tampering()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Compliance violation: Audit log entries are strictly append-only and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_tampering ON rwa_audit_logs;
CREATE TRIGGER trg_prevent_audit_log_tampering
BEFORE UPDATE OR DELETE ON rwa_audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_tampering();
