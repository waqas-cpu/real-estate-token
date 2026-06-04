import { getSupabaseAdmin } from '../supabase.js';
import { TokenEconomicsService } from './TokenEconomicsService.js';
import { PLATFORM_TOKEN_ECONOMICS } from '../config/platformTokenEconomics.js';

export interface CreateOfferingInput {
  tokenId: string;
  assetId: string;
  startDate: string;
  endDate: string;
  escrowContractAddr?: string;
  userConfirmedEconomics: boolean;
}

export class OfferingService {
  private economics = new TokenEconomicsService();

  async list(tokenId?: string) {
    let q = getSupabaseAdmin().from('token_offerings').select('*');
    if (tokenId) q = q.eq('token_id', tokenId);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async getById(id: string) {
    const { data, error } = await getSupabaseAdmin()
      .from('token_offerings')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  /** Creates offering from platform policy: FMV/30000 USDC per token, max raise = full FMV. */
  async create(input: CreateOfferingInput) {
    this.economics.assertOwnerConfirmed(input.userConfirmedEconomics);
    const bundle = await this.economics.buildEconomicsForAsset(input.assetId);

    this.economics.validateOfferingParams(
      bundle.tokenPriceUsdcMicro,
      bundle.minRaiseUsdcMicro,
      bundle.maxRaiseUsdcMicro
    );

    const { data, error } = await getSupabaseAdmin()
      .from('token_offerings')
      .insert({
        token_id: input.tokenId,
        min_raise: bundle.minRaiseUsdcMicro,
        max_raise: bundle.maxRaiseUsdcMicro,
        token_price: bundle.tokenPriceUsdcMicro,
        start_date: input.startDate,
        end_date: input.endDate,
        status: 'PENDING',
        escrow_contract_addr:
          input.escrowContractAddr ??
          `PENDING_USDC_ESCROW_${PLATFORM_TOKEN_ECONOMICS.currency}`,
      })
      .select()
      .single();

    if (error) throw error;
    return { offering: data, economics: bundle };
  }

  async activate(offeringId: string) {
    const offering = await this.getById(offeringId);
    if (!offering) throw new Error('Offering not found');

    const { data, error } = await getSupabaseAdmin()
      .from('token_offerings')
      .update({ status: 'ACTIVE' })
      .eq('id', offeringId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async closeAndAllocate(offeringId: string, userConfirmedEconomics: boolean) {
    this.economics.assertOwnerConfirmed(userConfirmedEconomics);

    const offering = await this.getById(offeringId);
    if (!offering) throw new Error('Offering not found');

    const { data: subs, error: subsErr } = await getSupabaseAdmin()
      .from('offering_subscriptions')
      .select('*')
      .eq('offering_id', offeringId)
      .eq('status', 'CONFIRMED');
    if (subsErr) throw subsErr;

    const totalRaised = (subs ?? []).reduce(
      (sum, s) => sum + BigInt(s.usdc_amount_micro ?? s.amount_wei ?? '0'),
      0n
    );
    const minRaise = BigInt(offering.min_raise);

    if (totalRaised < minRaise) {
      await getSupabaseAdmin()
        .from('token_offerings')
        .update({ status: 'CANCELLED', total_raised: totalRaised.toString() })
        .eq('id', offeringId);
      throw new Error(`Minimum raise not met: raised ${totalRaised}, required ${minRaise}`);
    }

    const allocations = (subs ?? []).map((s) => ({
      investorWallet: s.investor_wallet,
      allocatedTokens: String(s.tokens_amount ?? 0),
    }));

    for (const alloc of allocations) {
      await getSupabaseAdmin()
        .from('offering_subscriptions')
        .update({
          status: 'ALLOCATED',
          allocated_tokens: alloc.allocatedTokens,
        })
        .eq('offering_id', offeringId)
        .eq('investor_wallet', alloc.investorWallet);
    }

    const { data, error } = await getSupabaseAdmin()
      .from('token_offerings')
      .update({
        status: 'SETTLED',
        total_raised: totalRaised.toString(),
        investor_count: subs?.length ?? 0,
      })
      .eq('id', offeringId)
      .select()
      .single();
    if (error) throw error;
    return { offering: data, allocations };
  }
}
