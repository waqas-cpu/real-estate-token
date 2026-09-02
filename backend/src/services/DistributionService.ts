import { getSupabaseAdmin } from '../supabase.js';
import { hashContent } from '../../../src/lib/utils/hash.js';
import { TokenEconomicsService } from './TokenEconomicsService.js';
import { PLATFORM_TOKEN_ECONOMICS } from '../config/platformTokenEconomics.js';
import { databaseManager } from './database/DatabaseLayerManager.js';

export interface CreateDistributionInput {
  tokenId: string;
  /** Gross monthly rental income in USDC micro-units */
  grossRentUsdcMicro: string;
  periodStart: string;
  periodEnd: string;
  distributionDate: string;
  userConfirmedEconomics: boolean;
}

export interface MonthlyDistributionPreview {
  grossRentUsdcMicro: string;
  platformFeeUsdcMicro: string;
  distributableUsdcMicro: string;
  holderSharePercent: number;
  platformFeePercent: number;
  frequency: string;
  perHolder: Array<{
    investorWallet: string;
    tokensHeld: number;
    payoutUsdcMicro: string;
  }>;
}

export class DistributionService {
  private economics = new TokenEconomicsService();

  async list(tokenId?: string) {
    let q = getSupabaseAdmin().from('income_distributions').select('*');
    if (tokenId) q = q.eq('token_id', tokenId);
    const { data, error } = await q.order('distribution_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Preview monthly split: 10% platform fee, 90% pro-rata to allocated token holders.
   */
  async previewMonthly(tokenId: string, grossRentUsdcMicro: string) {
    if (!/^[0-9]+$/.test(grossRentUsdcMicro)) {
      throw new Error('grossRentUsdcMicro must be integer string');
    }

    const gross = BigInt(grossRentUsdcMicro);
    const { platformFeeMicro, distributableMicro } =
      this.economics.splitMonthlyDistribution(gross);

    const { data: token } = await getSupabaseAdmin()
      .from('security_tokens')
      .select('id')
      .eq('id', tokenId)
      .single();

    if (!token) throw new Error('Token not found');

    const { data: offering } = await getSupabaseAdmin()
      .from('token_offerings')
      .select('id')
      .eq('token_id', tokenId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const subs = offering
      ? (
          await getSupabaseAdmin()
            .from('offering_subscriptions')
            .select('investor_wallet, tokens_amount, allocated_tokens')
            .eq('offering_id', offering.id)
            .in('status', ['CONFIRMED', 'ALLOCATED'])
        ).data ?? []
      : [];

    const perHolder = subs.map((s) => {
      const tokens = Number(s.allocated_tokens ?? s.tokens_amount ?? 0);
      const payout = this.economics.computeHolderDistributionMicro(
        distributableMicro,
        tokens
      );
      return {
        investorWallet: s.investor_wallet,
        tokensHeld: tokens,
        payoutUsdcMicro: payout.toString(),
      };
    });

    return {
      grossRentUsdcMicro: gross.toString(),
      platformFeeUsdcMicro: platformFeeMicro.toString(),
      distributableUsdcMicro: distributableMicro.toString(),
      holderSharePercent: PLATFORM_TOKEN_ECONOMICS.holderSharePercent,
      platformFeePercent: PLATFORM_TOKEN_ECONOMICS.platformFeePercent,
      frequency: PLATFORM_TOKEN_ECONOMICS.distributionFrequency,
      perHolder,
    } satisfies MonthlyDistributionPreview;
  }

  async create(input: CreateDistributionInput) {
    if (!input.userConfirmedEconomics) {
      throw new Error('userConfirmedEconomics: true required');
    }

    const preview = await this.previewMonthly(input.tokenId, input.grossRentUsdcMicro);

    const merklePayload = {
      tokenId: input.tokenId,
      grossRentUsdcMicro: input.grossRentUsdcMicro,
      distributableUsdcMicro: preview.distributableUsdcMicro,
      platformFeeUsdcMicro: preview.platformFeeUsdcMicro,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      frequency: PLATFORM_TOKEN_ECONOMICS.distributionFrequency,
    };
    const merkleRoot = hashContent(JSON.stringify(merklePayload));

    const { data, error } = await getSupabaseAdmin()
      .from('income_distributions')
      .insert({
        token_id: input.tokenId,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        net_income: preview.distributableUsdcMicro,
        distribution_date: input.distributionDate,
        merkle_root: merkleRoot,
        withheld_by_jurisdiction: {
          platform_fee_usdc_micro: preview.platformFeeUsdcMicro,
          gross_rent_usdc_micro: input.grossRentUsdcMicro,
          holder_share_percent: PLATFORM_TOKEN_ECONOMICS.holderSharePercent,
          per_holder: preview.perHolder,
        },
      })
      .select()
      .single();
    if (error) throw error;

    try {
      const distributableUsdc = Number(BigInt(preview.distributableUsdcMicro) / 1000000n);
      await databaseManager.analytics.recordDistributionMetric({
        tokenId: input.tokenId,
        periodLabel: `${input.periodStart.slice(0, 7)}`,
        totalDistributedUsdc: distributableUsdc,
        distributionRatePerToken: distributableUsdc / 30000,
        annualizedYieldPct: PLATFORM_TOKEN_ECONOMICS.annualYieldPercent,
        recipientCount: preview.perHolder.length,
        merkleRoot,
      });
    } catch {
      // Non-blocking sync
    }

    return { distribution: data, preview };
  }
}
