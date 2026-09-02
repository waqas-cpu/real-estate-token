-- ============================================================================
-- Migration: 006_rwa_multi_database_layers.sql
-- Implements the 4-layer enterprise database architecture:
-- 1. Property Database: Address, parcel ID, valuation, property type, units, SPV (PostgreSQL + PostGIS)
-- 2. Legal / Document Database: Deeds, title, leases, contracts, KYC/KYB references (PostgreSQL + Object Storage)
-- 3. Investor Database: Profile, jurisdiction, accreditation tier, KYC/KYB status (PostgreSQL)
-- 4. Tokenization Database: Token ID, property ID, SPV, issuances, cap table, supply (PostgreSQL)
-- ============================================================================

-- Try enabling PostGIS extension (supported natively on Supabase / PostgreSQL)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS postgis;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'PostGIS extension could not be enabled automatically (proceeding with fallback spatial coordinates)';
END $$;

-- ----------------------------------------------------------------------------
-- LAYER 1: PROPERTY DATABASE (SPVs, Parcels, Units, PostGIS Geometries)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS property_spvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL DEFAULT 'LLC' CHECK (entity_type IN ('LLC', 'LTD', 'CORP', 'SPV', 'TRUST')),
  jurisdiction TEXT NOT NULL,
  registration_number TEXT NOT NULL UNIQUE,
  tax_id TEXT,
  registered_agent TEXT,
  formation_date DATE,
  operating_agreement_cid TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enhance physical_assets with parcel ID, property type, units count, SPV reference, and PostGIS geometry
ALTER TABLE physical_assets
  ADD COLUMN IF NOT EXISTS parcel_id TEXT,
  ADD COLUMN IF NOT EXISTS property_type TEXT CHECK (property_type IN ('RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'MIXED_USE', 'LAND')) DEFAULT 'RESIDENTIAL',
  ADD COLUMN IF NOT EXISTS units_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS spv_id UUID REFERENCES property_spvs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS zoning_code TEXT,
  ADD COLUMN IF NOT EXISTS assessed_valuation NUMERIC(20,2);

-- Conditionally add geometry column and index if PostGIS is installed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'physical_assets' AND column_name = 'geom'
    ) THEN
      ALTER TABLE physical_assets ADD COLUMN geom GEOMETRY(Point, 4326);
      UPDATE physical_assets SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) WHERE geom IS NULL;
      CREATE INDEX IF NOT EXISTS idx_physical_assets_geom ON physical_assets USING GIST (geom);
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_physical_assets_parcel ON physical_assets(parcel_id);
CREATE INDEX IF NOT EXISTS idx_physical_assets_spv ON physical_assets(spv_id);
CREATE INDEX IF NOT EXISTS idx_physical_assets_prop_type ON physical_assets(property_type);

-- ----------------------------------------------------------------------------
-- LAYER 2: LEGAL / DOCUMENT DATABASE (Deeds, Titles, Leases, Object Storage)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES physical_assets(id) ON DELETE CASCADE,
  spv_id UUID REFERENCES property_spvs(id) ON DELETE SET NULL,
  investor_wallet TEXT,
  document_type TEXT NOT NULL CHECK (
    document_type IN (
      'DEED',
      'TITLE_INSURANCE',
      'LEASE_AGREEMENT',
      'SPV_OPERATING_AGREEMENT',
      'APPRAISAL_REPORT',
      'CONTRACT',
      'KYC_DOCUMENT',
      'KYB_DOCUMENT',
      'TAX_RETURN',
      'SURVEY_PLAT'
    )
  ),
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  storage_provider TEXT NOT NULL DEFAULT 'SUPABASE_STORAGE' CHECK (storage_provider IN ('SUPABASE_STORAGE', 'S3', 'IPFS', 'LOCAL')),
  storage_bucket TEXT NOT NULL DEFAULT 'rwa-legal-documents',
  storage_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  signature_ml_dsa TEXT,
  verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED')),
  notarized BOOLEAN DEFAULT FALSE,
  notarized_at TIMESTAMPTZ,
  notary_ref TEXT,
  effective_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_docs_asset ON legal_documents(asset_id);
CREATE INDEX IF NOT EXISTS idx_legal_docs_spv ON legal_documents(spv_id);
CREATE INDEX IF NOT EXISTS idx_legal_docs_wallet ON legal_documents(investor_wallet);
CREATE INDEX IF NOT EXISTS idx_legal_docs_type ON legal_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_legal_docs_hash ON legal_documents(content_hash);

-- ----------------------------------------------------------------------------
-- LAYER 3: INVESTOR DATABASE (Profiles, Jurisdictions, Accreditation, KYC/KYB)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS investor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  investor_type TEXT NOT NULL DEFAULT 'INDIVIDUAL' CHECK (investor_type IN ('INDIVIDUAL', 'INSTITUTIONAL', 'QUALIFIED_PURCHASER', 'FAMILY_OFFICE')),
  primary_jurisdiction TEXT NOT NULL DEFAULT 'US',
  tax_id_number TEXT,
  tax_classification TEXT DEFAULT 'W-9' CHECK (tax_classification IN ('W-9', 'W-8BEN', 'W-8BEN-E', 'OTHER')),
  accreditation_status TEXT NOT NULL DEFAULT 'RETAIL' CHECK (accreditation_status IN ('RETAIL', 'ACCREDITED', 'QUALIFIED_PURCHASER', 'EXEMPT')),
  accreditation_evidence_ref TEXT,
  accreditation_expires_at TIMESTAMPTZ,
  kyc_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (kyc_status IN ('UNVERIFIED', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
  kyb_status TEXT DEFAULT 'NOT_APPLICABLE' CHECK (kyb_status IN ('NOT_APPLICABLE', 'PENDING', 'APPROVED', 'REJECTED')),
  aml_risk_rating TEXT NOT NULL DEFAULT 'LOW' CHECK (aml_risk_rating IN ('LOW', 'MEDIUM', 'HIGH', 'PROHIBITED')),
  pep_check_passed BOOLEAN DEFAULT TRUE,
  sanctions_check_passed BOOLEAN DEFAULT TRUE,
  total_invested_usd NUMERIC(20,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investor_profiles_wallet ON investor_profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_investor_profiles_jurisdiction ON investor_profiles(primary_jurisdiction);
CREATE INDEX IF NOT EXISTS idx_investor_profiles_kyc ON investor_profiles(kyc_status);
CREATE INDEX IF NOT EXISTS idx_investor_profiles_accreditation ON investor_profiles(accreditation_status);

-- ----------------------------------------------------------------------------
-- LAYER 4: TOKENIZATION DATABASE (Tokens, SPVs, Issuance Tranches, Cap Table)
-- ----------------------------------------------------------------------------

-- Add spv_id reference to security_tokens if not present
ALTER TABLE security_tokens
  ADD COLUMN IF NOT EXISTS spv_id UUID REFERENCES property_spvs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS token_name TEXT,
  ADD COLUMN IF NOT EXISTS max_authorized_supply TEXT;

CREATE TABLE IF NOT EXISTS token_issuances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES security_tokens(id) ON DELETE CASCADE,
  spv_id UUID REFERENCES property_spvs(id) ON DELETE SET NULL,
  tranche_name TEXT NOT NULL DEFAULT 'Primary Offering',
  target_raise_usd NUMERIC(20,2) NOT NULL,
  minimum_raise_usd NUMERIC(20,2) NOT NULL,
  token_price_usd NUMERIC(20,6) NOT NULL,
  tokens_offered NUMERIC(30,0) NOT NULL,
  tokens_issued NUMERIC(30,0) DEFAULT 0,
  issuance_status TEXT NOT NULL DEFAULT 'UPCOMING' CHECK (issuance_status IN ('UPCOMING', 'ACTIVE', 'CLOSED', 'COMPLETED', 'CANCELLED')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cap_table_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES security_tokens(id) ON DELETE CASCADE,
  investor_wallet TEXT NOT NULL,
  token_balance NUMERIC(30,0) NOT NULL DEFAULT 0 CHECK (token_balance >= 0),
  locked_balance NUMERIC(30,0) NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
  ownership_percentage NUMERIC(8,5) NOT NULL DEFAULT 0 CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
  voting_weight NUMERIC(8,5) NOT NULL DEFAULT 0,
  claim_entitlement_share NUMERIC(8,5) NOT NULL DEFAULT 0,
  is_whitelisted BOOLEAN NOT NULL DEFAULT TRUE,
  lockup_until TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (token_id, investor_wallet)
);

CREATE INDEX IF NOT EXISTS idx_token_issuances_token ON token_issuances(token_id);
CREATE INDEX IF NOT EXISTS idx_cap_table_token ON cap_table_entries(token_id);
CREATE INDEX IF NOT EXISTS idx_cap_table_wallet ON cap_table_entries(investor_wallet);
CREATE INDEX IF NOT EXISTS idx_cap_table_ownership ON cap_table_entries(ownership_percentage DESC);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

ALTER TABLE property_spvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_issuances ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_table_entries ENABLE ROW LEVEL SECURITY;

-- Property SPVs: Publicly readable by authenticated users
CREATE POLICY "SPVs readable by authenticated"
  ON property_spvs FOR SELECT TO authenticated USING (TRUE);

-- Legal Documents: Property documents visible to authenticated, KYC documents only to owner/admin
CREATE POLICY "Public property documents readable"
  ON legal_documents FOR SELECT TO authenticated
  USING (
    document_type NOT IN ('KYC_DOCUMENT', 'KYB_DOCUMENT')
    OR investor_wallet = current_setting('app.investor_wallet', true)::text
    OR current_setting('app.is_admin', true)::text = 'true'
  );

-- Investor Profiles: Readable by self or admin
CREATE POLICY "Investor profile readable by self"
  ON investor_profiles FOR SELECT TO authenticated
  USING (
    wallet_address = current_setting('app.investor_wallet', true)::text
    OR current_setting('app.is_admin', true)::text = 'true'
  );

-- Token issuances: Publicly visible to all authenticated investors
CREATE POLICY "Token issuances readable by all"
  ON token_issuances FOR SELECT TO authenticated USING (TRUE);

-- Cap table entries: Visible to token holders & auditors
CREATE POLICY "Cap table readable by authenticated"
  ON cap_table_entries FOR SELECT TO authenticated USING (TRUE);
