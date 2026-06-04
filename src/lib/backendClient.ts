/**
 * Production API client — all investor-facing backend routes.
 */

import type {
  PhysicalAsset,
  SecurityToken,
  Valuation,
  RiskScore,
  KYCRecord,
  GovernanceProposal,
  IncomeDistribution,
  TokenOffering,
} from './api';

/** Same-origin when UI is served by Express (npm run start); else VITE_API_BASE_URL */
export function apiBaseUrl(): string {
  const env = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
  if (env) return env;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

let accessToken: string | null = null;

export function setBackendAccessToken(token: string | null) {
  accessToken = token;
}

export function isBackendApiEnabled(): boolean {
  return Boolean(apiBaseUrl());
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${apiBaseUrl()}${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(url, { ...init, headers: { ...headers, ...init?.headers } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? `API ${res.status}`);
  }
  return json as T;
}

export type AssetDetail = {
  asset: PhysicalAsset;
  valuation: Valuation | null;
  risk: RiskScore | null;
  twin?: Record<string, unknown> | null;
  token: SecurityToken | null;
  offering: TokenOffering | null;
};

export type InvestQuote = {
  assetId: string;
  tokenCount: number;
  paidUsdcMicro: string;
  listUsdcMicro: string;
  discountPercent: number;
  projectedAnnualYieldUsdcMicro?: string;
};

export type MarketplaceSummary = {
  valuationFmv: number | null;
  totalSupply: string | null;
  tokenSymbol: string | null;
  offering: TokenOffering | null;
};

export async function getMarketplaceAssets(verifiedOnly = false): Promise<{
  assets: PhysicalAsset[];
  summaries: Record<string, MarketplaceSummary>;
}> {
  const q = verifiedOnly ? '?verified=true' : '';
  const { assets, summaries } = await request<{
    assets: PhysicalAsset[];
    summaries?: Record<string, MarketplaceSummary>;
  }>(`/api/marketplace/assets${q}`);
  return { assets, summaries: summaries ?? {} };
}

export async function getMarketplaceAssetById(id: string): Promise<AssetDetail> {
  return request<AssetDetail>(`/api/marketplace/assets/${id}`);
}

export async function getAdminTokens(): Promise<SecurityToken[]> {
  const { tokens } = await request<{ tokens: SecurityToken[] }>('/api/admin/tokens');
  return tokens;
}

export async function getKYCFromBackend(wallet: string): Promise<KYCRecord | null> {
  const { kyc } = await request<{ kyc: KYCRecord | null }>(
    `/api/kyc/status?wallet=${encodeURIComponent(wallet)}`
  );
  return kyc;
}

export async function startKYCVerification(wallet: string, jurisdiction: string) {
  return request<{ kyc: KYCRecord }>('/api/kyc/verify', {
    method: 'POST',
    body: JSON.stringify({ investorWallet: wallet, jurisdiction }),
  });
}

export async function getProposalsFromBackend(tokenId?: string): Promise<GovernanceProposal[]> {
  const q = tokenId ? `?tokenId=${encodeURIComponent(tokenId)}` : '';
  const { proposals } = await request<{ proposals: GovernanceProposal[] }>(
    `/api/governance/proposals${q}`
  );
  return proposals;
}

export interface GovernanceVote {
  id: string;
  proposal_id: string;
  voter_wallet: string;
  support: boolean;
  voting_power: string;
  created_at: string;
}

export async function getGovernanceVotesFromBackend(opts?: {
  voterWallet?: string;
  proposalId?: string;
}): Promise<GovernanceVote[]> {
  const params = new URLSearchParams();
  if (opts?.voterWallet) params.set('voterWallet', opts.voterWallet);
  if (opts?.proposalId) params.set('proposalId', opts.proposalId);
  const q = params.toString() ? `?${params}` : '';
  const { votes } = await request<{ votes: GovernanceVote[] }>(`/api/governance/votes${q}`);
  return votes;
}

export async function getDistributionsFromBackend(tokenId?: string): Promise<IncomeDistribution[]> {
  const q = tokenId ? `?tokenId=${encodeURIComponent(tokenId)}` : '';
  const { distributions } = await request<{ distributions: IncomeDistribution[] }>(
    `/api/distributions${q}`
  );
  return distributions;
}

export async function getPortfolioMetrics() {
  return request<{
    verifiedAssets: number;
    securityTokens: number;
    distributions: number;
  }>('/api/portfolio/metrics');
}

export async function getTokenOffering(tokenId: string) {
  const { offerings } = await request<{ offerings: TokenOffering[] }>(
    `/api/offerings?tokenId=${encodeURIComponent(tokenId)}`
  );
  return offerings[0] ?? null;
}

export async function getInvestmentQuote(assetId: string, tokenCount: number): Promise<InvestQuote> {
  return request<InvestQuote>('/api/token-economics/quote', {
    method: 'POST',
    body: JSON.stringify({ assetId, tokenCount }),
  });
}

export async function subscribeToOffering(
  offeringId: string,
  investorWallet: string,
  tokenCount: number
) {
  return request<{ paidUsdcMicro: string; subscriptionId?: string }>('/api/investments/subscribe', {
    method: 'POST',
    body: JSON.stringify({ offeringId, investorWallet, tokenCount }),
  });
}

export async function getHealthReady(): Promise<{ ready: boolean }> {
  const data = await request<{ ready: boolean }>('/health/ready');
  return data;
}
