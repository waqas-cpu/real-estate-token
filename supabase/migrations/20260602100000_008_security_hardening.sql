-- ============================================================================
-- Migration: 008_security_hardening.sql
-- Implements enterprise security features:
-- 1. KYB (Know Your Business) & Corporate UBO profiles with on-chain whitelisting
-- 2. MultiSig governance proposals & signature aggregation ledger
-- 3. AML / CFT Transaction Monitoring & Automated Alerts
-- 4. Tamper-evident, cryptographically hash-chained immutable audit trail
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. KYB & ON-CHAIN WHITELISTING ENHANCEMENTS
-- ----------------------------------------------------------------------------

ALTER TABLE investor_profiles
  ADD COLUMN IF NOT EXISTS entity_name TEXT,
  ADD COLUMN IF NOT EXISTS entity_jurisdiction TEXT,
  ADD COLUMN IF NOT EXISTS company_registration_number TEXT,
  ADD COLUMN IF NOT EXISTS beneficial_owners JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_whitelisted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whitelisted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whitelisted_tx_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_investor_profiles_whitelisted ON investor_profiles(is_whitelisted);
CREATE INDEX IF NOT EXISTS idx_investor_profiles_company_reg ON investor_profiles(company_registration_number);

-- ----------------------------------------------------------------------------
-- 2. MULTISIG PROPOSALS & CO-SIGNING LEDGER
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS multisig_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  multisig_contract_address TEXT NOT NULL,
  destination TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '0',
  data TEXT NOT NULL DEFAULT '0x',
  description TEXT NOT NULL,
  proposer TEXT NOT NULL,
  required_confirmations INTEGER NOT NULL DEFAULT 2,
  confirmations JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED', 'CONFIRMED', 'EXECUTED', 'REJECTED', 'CANCELLED')),
  execution_tx_hash TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_multisig_proposals_status ON multisig_proposals(status);
CREATE INDEX IF NOT EXISTS idx_multisig_proposals_contract ON multisig_proposals(multisig_contract_address);

-- ----------------------------------------------------------------------------
-- 3. TRANSACTION MONITORING & SUSPICIOUS ACTIVITY ALERTS (AML / CFT)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS transaction_monitoring_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (
    alert_type IN (
      'VELOCITY_SPIKE',
      'STRUCTURING_DETECTED',
      'SANCTIONS_MATCH',
      'LARGE_VOLUME',
      'UNAUTHORIZED_TRANSFER',
      'RAPID_CIRCULATION'
    )
  ),
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'DISMISSED', 'FROZEN_CONFIRMED')),
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_wallet ON transaction_monitoring_alerts(wallet_address);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_status ON transaction_monitoring_alerts(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity ON transaction_monitoring_alerts(severity);

-- ----------------------------------------------------------------------------
-- 4. TAMPER-EVIDENT HASH-CHAINED IMMUTABLE AUDIT TRAIL
-- ----------------------------------------------------------------------------

ALTER TABLE audit_events
  ADD COLUMN IF NOT EXISTS previous_event_hash TEXT,
  ADD COLUMN IF NOT EXISTS payload_hash TEXT,
  ADD COLUMN IF NOT EXISTS chain_hash TEXT,
  ADD COLUMN IF NOT EXISTS batch_merkle_root TEXT,
  ADD COLUMN IF NOT EXISTS pqc_signature TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_events_chain_hash ON audit_events(chain_hash);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------

ALTER TABLE multisig_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_monitoring_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Multisig proposals readable by authenticated"
  ON multisig_proposals FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Multisig proposals writable by admins"
  ON multisig_proposals FOR ALL TO authenticated
  USING (current_setting('app.is_admin', true)::text = 'true');

CREATE POLICY "Monitoring alerts readable by compliance & admin"
  ON transaction_monitoring_alerts FOR SELECT TO authenticated
  USING (
    current_setting('app.is_admin', true)::text = 'true'
    OR current_setting('app.is_compliance', true)::text = 'true'
  );
