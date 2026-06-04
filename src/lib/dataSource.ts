/**
 * Unified data access: Supabase (dev) or Express backend (VITE_API_BASE_URL).
 */

import * as direct from './api';
import * as backend from './backendClient';

const useBackend = backend.isBackendApiEnabled();

export type {
  PhysicalAsset,
  SecurityToken,
  Valuation,
  RiskScore,
  KYCRecord,
  GovernanceProposal,
  IncomeDistribution,
  TokenOffering,
} from './api';

export type AssetDetail = backend.AssetDetail;
export type InvestQuote = backend.InvestQuote;

export const isUsingBackend = () => useBackend;

export type MarketplaceSummary = backend.MarketplaceSummary;

export const getAssets = async (verifiedOnly = false) => {
  if (useBackend) {
    const { assets, summaries } = await backend.getMarketplaceAssets(verifiedOnly);
    return { assets, summaries };
  }
  const assets = await direct.getAssets();
  return { assets, summaries: {} as Record<string, MarketplaceSummary> };
};

export const getAssetDetail = (id: string): Promise<AssetDetail> => {
  if (useBackend) return backend.getMarketplaceAssetById(id);
  return (async () => {
    const asset = await direct.getAssetById(id);
    if (!asset) throw new Error('Asset not found');
    const [valuation, risk] = await Promise.all([
      direct.getAssetValuation(id),
      direct.getAssetRiskScore(id),
    ]);
    return { asset, valuation, risk, token: null, offering: null };
  })();
};

export const getAssetById = async (id: string) => {
  const { asset } = await getAssetDetail(id);
  return asset;
};

export const getAssetValuation = async (assetId: string) => {
  const { valuation } = await getAssetDetail(assetId);
  return valuation;
};

export const getAssetRiskScore = async (assetId: string) => {
  const { risk } = await getAssetDetail(assetId);
  return risk;
};

export const getSecurityTokens = () =>
  useBackend ? backend.getAdminTokens() : direct.getSecurityTokens();

export const getTokenOffering = (tokenId: string) =>
  useBackend ? backend.getTokenOffering(tokenId) : direct.getTokenOffering(tokenId);

export const getKYCStatus = (wallet: string) =>
  useBackend ? backend.getKYCFromBackend(wallet) : direct.getKYCStatus(wallet);

export const startKYCVerification = (wallet: string, jurisdiction: string) => {
  if (!useBackend) throw new Error('KYC verification requires the API backend');
  return backend.startKYCVerification(wallet, jurisdiction);
};

export const getProposals = (tokenId?: string) =>
  useBackend ? backend.getProposalsFromBackend(tokenId) : tokenId ? direct.getProposals(tokenId) : [];

export const getGovernanceVotes = (opts?: { voterWallet?: string; proposalId?: string }) => {
  if (!useBackend) return Promise.resolve([]);
  return backend.getGovernanceVotesFromBackend(opts);
};

export type { GovernanceVote } from './backendClient';

export const getDistributions = (tokenId: string) =>
  useBackend ? backend.getDistributionsFromBackend(tokenId) : direct.getDistributions(tokenId);

export const getPortfolioMetrics = () => {
  if (!useBackend) {
    return Promise.resolve({ verifiedAssets: 0, securityTokens: 0, distributions: 0 });
  }
  return backend.getPortfolioMetrics();
};

export const getInvestmentQuote = (assetId: string, tokenCount: number) => {
  if (!useBackend) throw new Error('Quotes require the API backend');
  return backend.getInvestmentQuote(assetId, tokenCount);
};

export const subscribeToOffering = (
  offeringId: string,
  investorWallet: string,
  tokenCount: number
) => {
  if (!useBackend) throw new Error('Invest requires the API backend');
  return backend.subscribeToOffering(offeringId, investorWallet, tokenCount);
};

export {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  onAuthStateChange,
} from './api';
