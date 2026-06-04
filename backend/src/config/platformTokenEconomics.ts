/**
 * Approved platform token economics (issuer-confirmed).
 * Fixed 30,000 tokens per property · USDC · 10% max per investor · monthly yield.
 */

export const PLATFORM_TOKEN_ECONOMICS = {
  /** Fixed total supply per property token */
  fixedTotalSupply: 30_000,
  /** Max % of supply one investor may hold per property */
  maxInvestorPercent: 10,
  /** Max tokens per investor (10% of 30,000) */
  maxTokensPerInvestor: 3_000,
  /** Raise / price currency */
  currency: 'USDC' as const,
  /** USDC decimal places (on-chain) */
  usdcDecimals: 6,
  /** 10% discount when investor buys the full 10% stake (3,000 tokens) in one subscription */
  fullStakeDiscountPercent: 10,
  /** Annual yield rate applied to economic interest represented by tokens held */
  annualYieldPercent: 10,
  /** Platform fee on rental income before distribution */
  platformFeePercent: 10,
  /** Portion of net income distributed to token holders after fee */
  holderSharePercent: 90,
  /** Distribution cadence */
  distributionFrequency: 'MONTHLY' as const,
  /** Token uses whole units (1 token = 1 count) */
  tokenDecimals: 0,
} as const;

export type PlatformTokenEconomics = typeof PLATFORM_TOKEN_ECONOMICS;
