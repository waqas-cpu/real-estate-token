import { supabase } from './supabase';

export interface Asset {
  id: string;
  title: string;
  address: string;
  square_feet?: number;
  bedrooms?: number;
  bathrooms?: number;
  year_built?: number;
  verified: boolean;
}

export interface PhysicalAsset extends Asset {
  latitude: number;
  longitude: number;
  registry_source: string;
  content_hash: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SecurityToken {
  id: string;
  asset_id: string;
  symbol: string;
  total_supply: string;
  decimals: number;
  contract_address: string;
  trex_identity_registry?: string;
  compliance_modules: string[];
  creator: string;
  created_at: string;
}

export interface Valuation {
  id: string;
  asset_id: string;
  fmv: number;
  confidence_low?: number;
  confidence_high?: number;
  method: string;
  factors?: Record<string, unknown>;
  model_version?: string;
  computed_at: string;
  expires_at: string;
  created_at: string;
}

export interface RiskScore {
  id: string;
  asset_id: string;
  credit_risk?: number;
  liquidity_risk?: number;
  operational_risk?: number;
  jurisdictional_risk?: number;
  composite?: number;
  last_updated: string;
  created_at: string;
}

export interface KYCRecord {
  id: string;
  investor_wallet: string;
  accreditated: boolean;
  jurisdictions: string[];
  aml_cleared_at?: string;
  aml_expires_at: string;
  zk_commitment_hash: string;
  zk_verifier_circuit?: string;
  created_at: string;
  updated_at: string;
}

export interface GovernanceProposal {
  id: string;
  token_id: string;
  proposer: string;
  title: string;
  description?: string;
  proposal_type: string;
  voting_power?: string;
  start_block?: number;
  end_block?: number;
  status: string;
  timelock_until?: string;
  created_at: string;
}

export interface IncomeDistribution {
  id: string;
  token_id: string;
  period_start: string;
  period_end: string;
  net_income: string;
  distribution_date: string;
  merkle_root: string;
  withheld_by_jurisdiction?: Record<string, unknown>;
  created_at: string;
}

export interface TokenOffering {
  id: string;
  token_id: string;
  min_raise: string;
  max_raise: string;
  token_price: string;
  start_date: string;
  end_date: string;
  status: string;
  total_raised: string;
  investor_count: number;
  escrow_contract_addr: string;
  created_at: string;
}

// Asset API
export async function getAssets() {
  const { data, error } = await supabase
    .from('physical_assets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as PhysicalAsset[];
}

export async function getAssetById(id: string) {
  const { data, error } = await supabase
    .from('physical_assets')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as PhysicalAsset | null;
}

export async function getAssetValuation(assetId: string) {
  const { data, error } = await supabase
    .from('valuations')
    .select('*')
    .eq('asset_id', assetId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as Valuation | null;
}

export async function getAssetRiskScore(assetId: string) {
  const { data, error } = await supabase
    .from('risk_scores')
    .select('*')
    .eq('asset_id', assetId)
    .maybeSingle();

  if (error) throw error;
  return data as RiskScore | null;
}

// Security Token API
export async function getSecurityTokens() {
  const { data, error } = await supabase
    .from('security_tokens')
    .select('*');

  if (error) throw error;
  return data as SecurityToken[];
}

export async function getSecurityTokenById(id: string) {
  const { data, error } = await supabase
    .from('security_tokens')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as SecurityToken | null;
}

export async function getTokenOffering(tokenId: string) {
  const { data, error } = await supabase
    .from('token_offerings')
    .select('*')
    .eq('token_id', tokenId)
    .maybeSingle();

  if (error) throw error;
  return data as TokenOffering | null;
}

// KYC API
export async function getKYCStatus(wallet: string) {
  const { data, error } = await supabase
    .from('kyc_records')
    .select('*')
    .eq('investor_wallet', wallet)
    .maybeSingle();

  if (error) throw error;
  return data as KYCRecord | null;
}

export async function updateKYCStatus(wallet: string, updates: Partial<KYCRecord>) {
  const { data, error } = await supabase
    .from('kyc_records')
    .update(updates)
    .eq('investor_wallet', wallet)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as KYCRecord | null;
}

// Governance API
export async function getProposals(tokenId: string) {
  const { data, error } = await supabase
    .from('governance_proposals')
    .select('*')
    .eq('token_id', tokenId);

  if (error) throw error;
  return data as GovernanceProposal[];
}

export async function getProposalById(id: string) {
  const { data, error } = await supabase
    .from('governance_proposals')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as GovernanceProposal | null;
}

export async function createProposal(proposal: Omit<GovernanceProposal, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('governance_proposals')
    .insert([proposal])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as GovernanceProposal | null;
}

// Income Distributions API
export async function getDistributions(tokenId: string) {
  const { data, error } = await supabase
    .from('income_distributions')
    .select('*')
    .eq('token_id', tokenId)
    .order('distribution_date', { ascending: false });

  if (error) throw error;
  return data as IncomeDistribution[];
}

export async function getDistributionById(id: string) {
  const { data, error } = await supabase
    .from('income_distributions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as IncomeDistribution | null;
}

// Authentication
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function onAuthStateChange(callback: (event: string, session: any) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
}
