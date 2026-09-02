import { getSupabaseAdmin } from '../supabase.js';
import { TokenEconomicsService } from './TokenEconomicsService.js';
import { PLATFORM_TOKEN_ECONOMICS } from '../config/platformTokenEconomics.js';
import { databaseManager } from './database/DatabaseLayerManager.js';

export class InvestmentService {
  private economics = new TokenEconomicsService();

  /**
   * Subscribe by token count (USDC). Max 3,000 tokens (10%) per investor per offering.
   * 10% USDC discount when buying full 3,000-token stake.
   */
  async subscribe(
    offeringId: string,
    investorWallet: string,
    tokenCount: number
  ) {
    if (!Number.isInteger(tokenCount) || tokenCount <= 0) {
      throw new Error('tokenCount must be a positive integer');
    }
    if (tokenCount > PLATFORM_TOKEN_ECONOMICS.maxTokensPerInvestor) {
      throw new Error(
        `Maximum ${PLATFORM_TOKEN_ECONOMICS.maxTokensPerInvestor} tokens (10% of supply) per investor per property`
      );
    }

    const { data: offering, error: offErr } = await getSupabaseAdmin()
      .from('token_offerings')
      .select('*')
      .eq('id', offeringId)
      .single();
    if (offErr || !offering) throw new Error('Offering not found');

    const { data: tokenRow } = await getSupabaseAdmin()
      .from('security_tokens')
      .select('asset_id')
      .eq('id', offering.token_id)
      .single();
    const assetId = tokenRow?.asset_id;
    if (!assetId) throw new Error('Token asset not linked');

    const bundle = await this.economics.buildEconomicsForAsset(assetId);
    const tokenPriceMicro = BigInt(bundle.tokenPriceUsdcMicro);

    const { data: existing } = await getSupabaseAdmin()
      .from('offering_subscriptions')
      .select('tokens_amount')
      .eq('offering_id', offeringId)
      .eq('investor_wallet', investorWallet)
      .eq('status', 'CONFIRMED')
      .maybeSingle();

    const priorTokens = existing?.tokens_amount ?? 0;
    if (priorTokens + tokenCount > PLATFORM_TOKEN_ECONOMICS.maxTokensPerInvestor) {
      throw new Error(
        `Would exceed 10% cap: already ${priorTokens} tokens, requested ${tokenCount}, max ${PLATFORM_TOKEN_ECONOMICS.maxTokensPerInvestor}`
      );
    }

    if (offering.status !== 'ACTIVE') {
      throw new Error(`Offering is not active (status: ${offering.status})`);
    }

    const now = new Date();
    if (now < new Date(offering.start_date) || now > new Date(offering.end_date)) {
      throw new Error('Offering is outside subscription window');
    }

    const { usdcMicro, discountPercent, listUsdcMicro } =
      this.economics.computeSubscriptionUsdcMicro(tokenCount, tokenPriceMicro);

    const newTotal = BigInt(offering.total_raised ?? '0') + usdcMicro;
    if (newTotal > BigInt(offering.max_raise)) {
      throw new Error('Subscription would exceed max_raise (full property USDC cap)');
    }

    const annualYieldMicro = this.economics.computeAnnualYieldUsdcMicro(
      tokenCount,
      bundle.fmvUsd!
    );
    const monthlyYieldMicro = this.economics.computeMonthlyYieldUsdcMicro(
      tokenCount,
      bundle.fmvUsd!
    );

    const { data: sub, error: subErr } = await getSupabaseAdmin()
      .from('offering_subscriptions')
      .upsert(
        {
          offering_id: offeringId,
          investor_wallet: investorWallet,
          amount_wei: usdcMicro.toString(),
          tokens_amount: tokenCount,
          usdc_amount_micro: usdcMicro.toString(),
          discount_percent: discountPercent,
          status: 'CONFIRMED',
        },
        { onConflict: 'offering_id,investor_wallet' }
      )
      .select()
      .single();
    if (subErr) throw subErr;

    const { count } = await getSupabaseAdmin()
      .from('offering_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('offering_id', offeringId)
      .eq('status', 'CONFIRMED');

    await getSupabaseAdmin()
      .from('token_offerings')
      .update({
        total_raised: newTotal.toString(),
        investor_count: count ?? 0,
      })
      .eq('id', offeringId);

    try {
      if (offering.token_id) {
        await databaseManager.tokenization.updateCapTableAllocation({
          tokenId: offering.token_id,
          investorWallet,
          balanceChange: BigInt(tokenCount),
        });

        await databaseManager.indexer.recordTransfer({
          chainId: 11155111,
          tokenAddress: offering.token_id,
          fromAddress: offering.escrow_contract_addr || offeringId,
          toAddress: investorWallet,
          amount: String(tokenCount),
          transactionHash: `sub-${sub?.id || Date.now()}`,
          blockNumber: 6200500,
          blockTimestamp: new Date().toISOString(),
        });

        await databaseManager.indexer.updateWalletBalance(
          offering.token_id,
          investorWallet,
          String(tokenCount)
        );
      }
    } catch {
      // Non-blocking sync
    }

    return {
      subscription: sub,
      tokenCount,
      currency: PLATFORM_TOKEN_ECONOMICS.currency,
      listPriceUsdcMicro: listUsdcMicro.toString(),
      paidUsdcMicro: usdcMicro.toString(),
      discountPercent,
      fullStakeDiscountApplied:
        tokenCount === PLATFORM_TOKEN_ECONOMICS.maxTokensPerInvestor,
      projectedAnnualYieldUsdcMicro: annualYieldMicro.toString(),
      projectedMonthlyYieldUsdcMicro: monthlyYieldMicro.toString(),
      maxTokensPerInvestor: PLATFORM_TOKEN_ECONOMICS.maxTokensPerInvestor,
      totalRaisedUsdcMicro: newTotal.toString(),
      note: 'Off-chain USDC subscription. On-chain USDC escrow requires contract deployment.',
    };
  }

  async listSubscriptions(offeringId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from('offering_subscriptions')
      .select('*')
      .eq('offering_id', offeringId);
    if (error) throw error;
    return data ?? [];
  }
}
