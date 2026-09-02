-- ============================================================================
-- Migration: 007_indexer_and_analytics_layers.sql
-- Implements:
-- 5. Blockchain Indexer: Wallet balances, transfers, contract events (The Graph indexer + PostgreSQL)
-- 6. Analytics Database: NAV, rental yield, distributions, liquidity, investor metrics (PostgreSQL / ClickHouse)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- LAYER 5: BLOCKCHAIN INDEXER DATABASE (The Graph Indexer & Sync Cache)
-- ----------------------------------------------------------------------------

-- Contract events stream
CREATE TABLE IF NOT EXISTS blockchain_indexed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id INTEGER NOT NULL DEFAULT 11155111, -- Sepolia testnet default
  contract_address TEXT NOT NULL,
  event_name TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  transaction_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL DEFAULT 0,
  parameters JSONB NOT NULL DEFAULT '{}',
  block_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (chain_id, transaction_hash, log_index)
);

-- Token transfers ledger (ERC-3643 / ERC-20)
CREATE TABLE IF NOT EXISTS token_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id INTEGER NOT NULL DEFAULT 11155111,
  token_address TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount TEXT NOT NULL, -- wei or atomic token units
  transaction_hash TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  block_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Wallet balance snapshots
CREATE TABLE IF NOT EXISTS wallet_balance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  balance TEXT NOT NULL DEFAULT '0',
  locked_balance TEXT NOT NULL DEFAULT '0',
  block_number BIGINT NOT NULL,
  snapshot_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (token_address, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_indexed_events_contract ON blockchain_indexed_events(contract_address);
CREATE INDEX IF NOT EXISTS idx_indexed_events_name ON blockchain_indexed_events(event_name);
CREATE INDEX IF NOT EXISTS idx_indexed_events_block ON blockchain_indexed_events(block_number DESC);
CREATE INDEX IF NOT EXISTS idx_token_transfers_token ON token_transfers(token_address);
CREATE INDEX IF NOT EXISTS idx_token_transfers_from ON token_transfers(from_address);
CREATE INDEX IF NOT EXISTS idx_token_transfers_to ON token_transfers(to_address);
CREATE INDEX IF NOT EXISTS idx_token_transfers_tx ON token_transfers(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_wallet_balances_wallet ON wallet_balance_snapshots(wallet_address);

-- ----------------------------------------------------------------------------
-- LAYER 6: ANALYTICS DATABASE (NAV, Rental Yield, Distributions, Liquidity, Investors)
-- ----------------------------------------------------------------------------

-- Net Asset Value (NAV) snapshots
CREATE TABLE IF NOT EXISTS analytics_nav_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id TEXT NOT NULL,
  property_id TEXT,
  total_asset_valuation_usd NUMERIC(20,2) NOT NULL,
  total_liabilities_usd NUMERIC(20,2) NOT NULL DEFAULT 0,
  net_asset_value_usd NUMERIC(20,2) NOT NULL,
  total_token_supply TEXT NOT NULL,
  nav_per_token_usd NUMERIC(20,6) NOT NULL,
  valuation_method TEXT NOT NULL DEFAULT 'INDEPENDENT_APPRAISAL',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rental yield & property operating cashflow
CREATE TABLE IF NOT EXISTS analytics_rental_yields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id TEXT NOT NULL,
  token_id TEXT,
  gross_annual_rent_usd NUMERIC(20,2) NOT NULL,
  annual_operating_expenses_usd NUMERIC(20,2) NOT NULL DEFAULT 0,
  net_operating_income_usd NUMERIC(20,2) NOT NULL,
  property_valuation_usd NUMERIC(20,2) NOT NULL,
  gross_rental_yield_pct NUMERIC(8,4) NOT NULL,
  net_rental_yield_pct NUMERIC(8,4) NOT NULL,
  distribution_apy_pct NUMERIC(8,4) NOT NULL,
  occupancy_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Income distribution performance metrics
CREATE TABLE IF NOT EXISTS analytics_distribution_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id TEXT NOT NULL,
  period_label TEXT NOT NULL, -- e.g., '2026-Q1', '2026-M05'
  total_distributed_usdc NUMERIC(20,2) NOT NULL,
  distribution_rate_per_token NUMERIC(20,6) NOT NULL,
  annualized_yield_pct NUMERIC(8,4) NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  payout_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  merkle_root TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Secondary market liquidity & trading volume
CREATE TABLE IF NOT EXISTS analytics_liquidity_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id TEXT NOT NULL,
  volume_24h_usd NUMERIC(20,2) NOT NULL DEFAULT 0,
  trades_count_24h INTEGER NOT NULL DEFAULT 0,
  turnover_rate_pct NUMERIC(8,4) NOT NULL DEFAULT 0,
  bid_ask_spread_pct NUMERIC(8,4),
  order_book_depth_usd NUMERIC(20,2) DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Investor analytics & cohort metrics
CREATE TABLE IF NOT EXISTS analytics_investor_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id TEXT, -- NULL for platform-wide metrics
  total_active_investors INTEGER NOT NULL DEFAULT 0,
  average_check_size_usd NUMERIC(20,2) NOT NULL DEFAULT 0,
  median_check_size_usd NUMERIC(20,2) NOT NULL DEFAULT 0,
  retail_investor_count INTEGER NOT NULL DEFAULT 0,
  institutional_investor_count INTEGER NOT NULL DEFAULT 0,
  retention_rate_pct NUMERIC(8,4) DEFAULT 100.00,
  geographic_breakdown JSONB DEFAULT '{}',
  cohort_metrics JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nav_snapshots_token ON analytics_nav_snapshots(token_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_rental_yields_prop ON analytics_rental_yields(property_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_distributions_token ON analytics_distribution_metrics(token_id, payout_date DESC);
CREATE INDEX IF NOT EXISTS idx_liquidity_token ON analytics_liquidity_metrics(token_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_investor_metrics_token ON analytics_investor_metrics(token_id, recorded_at DESC);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

ALTER TABLE blockchain_indexed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_balance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_nav_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_rental_yields ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_distribution_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_liquidity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_investor_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Indexed events readable by authenticated"
  ON blockchain_indexed_events FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Token transfers readable by authenticated"
  ON token_transfers FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Wallet balances readable by authenticated"
  ON wallet_balance_snapshots FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "NAV analytics readable by authenticated"
  ON analytics_nav_snapshots FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Rental yields readable by authenticated"
  ON analytics_rental_yields FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Distributions readable by authenticated"
  ON analytics_distribution_metrics FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Liquidity metrics readable by authenticated"
  ON analytics_liquidity_metrics FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Investor metrics readable by authenticated"
  ON analytics_investor_metrics FOR SELECT TO authenticated USING (TRUE);
