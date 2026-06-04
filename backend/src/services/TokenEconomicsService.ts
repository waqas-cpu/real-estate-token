/**
 * Token economics — platform policy (30k tokens, USDC, 10% cap, yield, monthly dist).
 */

import { config } from '../config.js';
import { PLATFORM_TOKEN_ECONOMICS } from '../config/platformTokenEconomics.js';
import { getSupabaseAdmin } from '../supabase.js';

export class TokenEconomicsGuardError extends Error {
  readonly code = 'TOKEN_ECONOMICS_REQUIRES_OWNER_APPROVAL';

  constructor(message: string) {
    super(message);
    this.name = 'TokenEconomicsGuardError';
  }
}

export interface TokenEconomicsParams {
  totalSupply: string;
  tokenPrice: string;
  minRaise: string;
  maxRaise: string;
  decimals?: number;
}

export interface EconomicsPreviewInput {
  assetId: string;
}

export interface PlatformEconomicsBundle {
  totalSupply: string;
  tokenPriceUsdc: string;
  tokenPriceUsdcMicro: string;
  tokenPriceDisplay: string;
  maxRaiseUsdcMicro: string;
  minRaiseUsdcMicro: string;
  maxTokensPerInvestor: number;
  fullStakeDiscountPercent: number;
  annualYieldPercent: number;
  currency: string;
  distributionFrequency: string;
  holderSharePercent: number;
  platformFeePercent: number;
  fmvUsd: number | null;
  formulas: Record<string, string>;
}

export class TokenEconomicsService {
  getPlatformPolicy() {
    return {
      ...PLATFORM_TOKEN_ECONOMICS,
      approved: true,
      summary:
        '30,000 tokens per property · price = house FMV ÷ 30,000 USDC · max 3,000 tokens (10%) per investor · ' +
        '10% discount on full 10% stake · 10% annual yield on stake · monthly distribution 90/10 after fee',
    };
  }

  getDecisionsRequired() {
    return {
      parameters: [
        {
          key: 'totalSupply',
          question: 'Fixed platform supply per property',
          affects: 'Ownership denominator',
          example: '30,000 (fixed)',
        },
        {
          key: 'tokenPrice',
          question: 'USDC per token',
          affects: 'Subscription cost',
          example: 'property_fmv_usd / 30000',
        },
        {
          key: 'maxInvestorAllocation',
          question: 'Max tokens per investor',
          affects: 'Concentration risk',
          example: '3,000 tokens (10%)',
        },
        {
          key: 'fullStakeDiscount',
          question: 'Discount for buying full 10% in one go',
          affects: 'Investor incentive',
          example: '10% off USDC total',
        },
        {
          key: 'yield',
          question: 'Annual yield on stake',
          affects: 'Investor returns',
          example: '10% × (tokens / 30000) × property value',
        },
        {
          key: 'distribution',
          question: 'Income waterfall',
          affects: 'Cash flow to holders',
          example: 'Monthly · 10% platform fee · 90% to holders pro-rata',
        },
      ],
      note: 'These values are codified in platformTokenEconomics.ts per issuer approval.',
    };
  }

  assertOwnerConfirmed(userConfirmedEconomics?: boolean) {
    if (!userConfirmedEconomics) {
      throw new TokenEconomicsGuardError(
        'Set userConfirmedEconomics: true to apply platform token economics.'
      );
    }
    if (!config.allowTokenEconomicsApply) {
      throw new TokenEconomicsGuardError(
        'Set ALLOW_TOKEN_ECONOMICS_APPLY=true in backend .env to enable writes.'
      );
    }
  }

  validateSupply(totalSupply: string): void {
    const expected = String(PLATFORM_TOKEN_ECONOMICS.fixedTotalSupply);
    if (totalSupply !== expected) {
      throw new Error(
        `totalSupply must be exactly ${expected} tokens per platform policy`
      );
    }
  }

  /** FMV in USD → USDC micro-units per token (6 decimals). */
  computeTokenPriceUsdcMicro(fmvUsd: number): bigint {
    if (fmvUsd <= 0) throw new Error('FMV must be positive');
    const supply = BigInt(PLATFORM_TOKEN_ECONOMICS.fixedTotalSupply);
    const fmvMicro = BigInt(Math.round(fmvUsd * 10 ** PLATFORM_TOKEN_ECONOMICS.usdcDecimals));
    return fmvMicro / supply;
  }

  /** Build offering economics from property valuation. */
  async buildEconomicsForAsset(assetId: string): Promise<PlatformEconomicsBundle> {
    const { data: valuation } = await getSupabaseAdmin()
      .from('valuations')
      .select('*')
      .eq('asset_id', assetId)
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const fmvUsd = valuation ? Number(valuation.fmv) : null;
    if (!fmvUsd || fmvUsd <= 0) {
      throw new Error(
        'Property FMV required. Run intelligence pipeline (POST /api/assets/:id/intelligence) first.'
      );
    }

    const tokenPriceMicro = this.computeTokenPriceUsdcMicro(fmvUsd);
    const supply = BigInt(PLATFORM_TOKEN_ECONOMICS.fixedTotalSupply);
    const maxRaiseMicro = tokenPriceMicro * supply;
    const minRaiseMicro = (maxRaiseMicro * 80n) / 100n;

    const priceDisplay = Number(tokenPriceMicro) / 10 ** PLATFORM_TOKEN_ECONOMICS.usdcDecimals;

    return {
      totalSupply: String(PLATFORM_TOKEN_ECONOMICS.fixedTotalSupply),
      tokenPriceUsdc: priceDisplay.toFixed(6),
      tokenPriceUsdcMicro: tokenPriceMicro.toString(),
      tokenPriceDisplay: `${priceDisplay.toFixed(2)} USDC`,
      maxRaiseUsdcMicro: maxRaiseMicro.toString(),
      minRaiseUsdcMicro: minRaiseMicro.toString(),
      maxTokensPerInvestor: PLATFORM_TOKEN_ECONOMICS.maxTokensPerInvestor,
      fullStakeDiscountPercent: PLATFORM_TOKEN_ECONOMICS.fullStakeDiscountPercent,
      annualYieldPercent: PLATFORM_TOKEN_ECONOMICS.annualYieldPercent,
      currency: PLATFORM_TOKEN_ECONOMICS.currency,
      distributionFrequency: PLATFORM_TOKEN_ECONOMICS.distributionFrequency,
      holderSharePercent: PLATFORM_TOKEN_ECONOMICS.holderSharePercent,
      platformFeePercent: PLATFORM_TOKEN_ECONOMICS.platformFeePercent,
      fmvUsd,
      formulas: {
        totalSupply: '30,000 (fixed per property)',
        tokenPrice: 'property_fmv_usdc / 30,000',
        maxPerInvestor: '3,000 tokens (10% of supply)',
        fullStakeDiscount: '10% off when buying exactly 3,000 tokens',
        annualYield: '10% × (tokensHeld × tokenPrice) = 10% of USDC invested',
        monthlyDistribution: 'monthly_net × 90% × (tokensHeld / 30000)',
        platformFee: '10% of gross rental income',
      },
    };
  }

  /**
   * USDC cost for token purchase; 10% discount if buying full 10% stake (3,000 tokens).
   */
  computeSubscriptionUsdcMicro(
    tokenCount: number,
    tokenPriceUsdcMicro: bigint
  ): { usdcMicro: bigint; discountPercent: number; listUsdcMicro: bigint } {
    if (tokenCount <= 0 || tokenCount > PLATFORM_TOKEN_ECONOMICS.maxTokensPerInvestor) {
      throw new Error(
        `tokenCount must be between 1 and ${PLATFORM_TOKEN_ECONOMICS.maxTokensPerInvestor}`
      );
    }

    const listUsdcMicro = tokenPriceUsdcMicro * BigInt(tokenCount);
    let discountPercent = 0;
    let usdcMicro = listUsdcMicro;

    if (tokenCount === PLATFORM_TOKEN_ECONOMICS.maxTokensPerInvestor) {
      discountPercent = PLATFORM_TOKEN_ECONOMICS.fullStakeDiscountPercent;
      usdcMicro =
        (listUsdcMicro * BigInt(100 - discountPercent)) / 100n;
    }

    return { usdcMicro, discountPercent, listUsdcMicro };
  }

  /**
   * Annual yield (USDC micro) = 10% × (tokensHeld / 30000) × property FMV.
   */
  computeAnnualYieldUsdcMicro(tokensHeld: number, fmvUsd: number): bigint {
    if (tokensHeld <= 0) return 0n;
    const fmvMicro = BigInt(Math.round(fmvUsd * 10 ** PLATFORM_TOKEN_ECONOMICS.usdcDecimals));
    const yieldMicro =
      (fmvMicro * BigInt(tokensHeld) * BigInt(PLATFORM_TOKEN_ECONOMICS.annualYieldPercent)) /
      (BigInt(PLATFORM_TOKEN_ECONOMICS.fixedTotalSupply) * 100n);
    return yieldMicro;
  }

  /** Monthly yield = annual / 12 */
  computeMonthlyYieldUsdcMicro(tokensHeld: number, fmvUsd: number): bigint {
    return this.computeAnnualYieldUsdcMicro(tokensHeld, fmvUsd) / 12n;
  }

  /**
   * Split monthly gross rent: 10% fee, 90% to holders pro-rata by tokens.
   */
  splitMonthlyDistribution(grossRentUsdcMicro: bigint): {
    platformFeeMicro: bigint;
    distributableMicro: bigint;
  } {
    const fee =
      (grossRentUsdcMicro * BigInt(PLATFORM_TOKEN_ECONOMICS.platformFeePercent)) / 100n;
    const distributable = grossRentUsdcMicro - fee;
    return { platformFeeMicro: fee, distributableMicro: distributable };
  }

  /** Holder share for one investor in a monthly distribution. */
  computeHolderDistributionMicro(
    distributableMicro: bigint,
    tokensHeld: number
  ): bigint {
    return (
      (distributableMicro * BigInt(tokensHeld)) /
      BigInt(PLATFORM_TOKEN_ECONOMICS.fixedTotalSupply)
    );
  }

  validateOfferingParams(tokenPrice: string, minRaise: string, maxRaise: string): void {
    for (const [name, v] of [
      ['tokenPrice', tokenPrice],
      ['minRaise', minRaise],
      ['maxRaise', maxRaise],
    ] as const) {
      if (!/^[0-9]+$/.test(v) || BigInt(v) <= 0n) {
        throw new Error(`Invalid ${name}: must be a positive integer string (USDC micro-units)`);
      }
    }
    if (BigInt(minRaise) > BigInt(maxRaise)) {
      throw new Error('minRaise cannot exceed maxRaise');
    }
  }

  async previewEconomics(input: EconomicsPreviewInput) {
    const bundle = await this.buildEconomicsForAsset(input.assetId);
    return {
      status: 'PLATFORM_POLICY' as const,
      message: 'Approved platform economics applied from property FMV.',
      ...bundle,
      suggested: {
        totalSupply: bundle.totalSupply,
        tokenPrice: bundle.tokenPriceUsdcMicro,
        minRaise: bundle.minRaiseUsdcMicro,
        maxRaise: bundle.maxRaiseUsdcMicro,
        decimals: PLATFORM_TOKEN_ECONOMICS.tokenDecimals,
      },
    };
  }

  computeProRataAllocations(
    subscriptions: Array<{ investorWallet: string; tokensAmount: number }>,
    offerableSupply: number
  ): Array<{ investorWallet: string; allocatedTokens: string }> {
    const totalTokens = subscriptions.reduce((s, x) => s + x.tokensAmount, 0);
    if (totalTokens === 0) return [];

    return subscriptions.map((sub) => {
      const allocated = Math.floor(
        (sub.tokensAmount * offerableSupply) / totalTokens
      );
      return {
        investorWallet: sub.investorWallet,
        allocatedTokens: String(allocated),
      };
    });
  }
}
