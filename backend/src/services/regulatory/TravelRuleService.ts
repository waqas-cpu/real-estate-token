/**
 * FATF Travel Rule — IVMS-101 packet draft/submit (testnet fixtures → mainnet VASP APIs).
 */

import { getSupabaseAdmin } from '../../supabase.js';
import { resolveNetworkProfile } from '../../../../src/lib/config/networkProfile.js';

export interface TravelRuleDraftInput {
  transferRef: string;
  originatorWallet: string;
  beneficiaryWallet: string;
  amountUsdcMicro: number;
  assetId?: string;
  jurisdiction?: string;
  originatorName?: string;
  beneficiaryName?: string;
}

export class TravelRuleService {
  buildIvms101(input: TravelRuleDraftInput): Record<string, unknown> {
    const profile = resolveNetworkProfile();
    return {
      version: 'IVMS101',
      originator: {
        accountNumber: input.originatorWallet,
        name: input.originatorName ?? (profile.name === 'testnet' ? 'Testnet Originator' : undefined),
      },
      beneficiary: {
        accountNumber: input.beneficiaryWallet,
        name: input.beneficiaryName ?? (profile.name === 'testnet' ? 'Testnet Beneficiary' : undefined),
      },
      transfer: {
        amount: input.amountUsdcMicro,
        currency: 'USDC',
        assetId: input.assetId ?? null,
      },
      jurisdiction: input.jurisdiction ?? 'US',
      profile: profile.name,
    };
  }

  async createDraft(input: TravelRuleDraftInput) {
    const ivms101 = this.buildIvms101(input);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('travel_rule_packets')
      .insert({
        transfer_ref: input.transferRef,
        originator_wallet: input.originatorWallet,
        beneficiary_wallet: input.beneficiaryWallet,
        amount_usdc_micro: input.amountUsdcMicro,
        asset_id: input.assetId ?? null,
        ivms101_json: ivms101,
        jurisdiction: input.jurisdiction ?? 'US',
        status: 'draft',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async submitPacket(transferRef: string) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('travel_rule_packets')
      .update({ status: 'submitted' })
      .eq('transfer_ref', transferRef)
      .select()
      .single();
    if (error) throw error;
    return {
      packet: data,
      mainnetNote:
        resolveNetworkProfile().name === 'mainnet'
          ? 'Wire to licensed VASP Travel Rule network'
          : 'Testnet: submitted status only — no external VASP',
    };
  }
}
