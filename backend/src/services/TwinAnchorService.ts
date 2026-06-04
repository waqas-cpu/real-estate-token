import { createHash } from 'node:crypto';
import { getSupabaseAdmin } from '../supabase.js';
import { loadTestnetDeployment } from '../integrations/blockchain.js';
import { resolveNetworkProfile } from '../../../src/lib/config/networkProfile.js';
import {
  enrichTwinWithPendingAnchor,
  markTwinAnchored,
  type OnChainTwinAnchor,
} from '../../../src/lib/integrations/twinAnchor.js';
import type { DigitalTwin } from '../../../src/lib/types/architecture.js';

export function assetIdToAnchorKey(assetId: string): string {
  return '0x' + createHash('sha256').update(assetId).digest('hex');
}

export class TwinAnchorService {
  getTwinAnchorContract(): string | null {
    const d = loadTestnetDeployment();
    return (d?.contracts as { twinAnchor?: string })?.twinAnchor ?? null;
  }

  async registerPendingAnchor(assetId: string, twin: DigitalTwin, actorId: string) {
    const profile = resolveNetworkProfile();
    const contractAddress = this.getTwinAnchorContract();
    const enriched = enrichTwinWithPendingAnchor(twin, assetId, contractAddress);

    const anchor = (enriched.schema as Record<string, unknown>)
      .onChainAnchor as OnChainTwinAnchor;

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('twin_on_chain_anchors').upsert(
      {
        asset_id: assetId,
        ipfs_cid: twin.cid,
        chain_id: profile.defaultChainId,
        contract_address: contractAddress,
        status: 'pending',
        tx_hash: null,
        anchored_at: null,
      },
      { onConflict: 'asset_id,chain_id' }
    );

    if (error && !error.message.includes('does not exist')) {
      throw error;
    }

    await supabase
      .from('digital_twins')
      .update({ schema: enriched.schema, last_updated: new Date().toISOString(), updated_by: actorId })
      .eq('asset_id', assetId);

    return {
      anchor,
      anchorKey: assetIdToAnchorKey(assetId),
      testnetScript:
        profile.name === 'testnet' && contractAddress
          ? `npm run anchor:twin --prefix contracts -- --assetId ${assetId} --cid ${twin.cid}`
          : null,
    };
  }

  async confirmAnchorTx(assetId: string, txHash: string, actorId: string) {
    const contractAddress = this.getTwinAnchorContract();
    if (!contractAddress) {
      throw new Error('Twin anchor contract not deployed — run deploy:testnet first');
    }

    const supabase = getSupabaseAdmin();
    const { data: twinRow } = await supabase
      .from('digital_twins')
      .select('cid, schema')
      .eq('asset_id', assetId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!twinRow) throw new Error('Digital twin not found');

    const schema = (twinRow.schema as Record<string, unknown>) ?? {};
    const twin: DigitalTwin = {
      id: '',
      assetId,
      cid: twinRow.cid as string,
      version: 1,
      schema,
      titleChain: [],
      encumbrances: [],
      valuationHistory: [],
      lastUpdated: new Date(),
      attestationQuorum: 2,
    };

    const updated = markTwinAnchored(twin, txHash, contractAddress);

    await supabase.from('twin_on_chain_anchors').upsert(
      {
        asset_id: assetId,
        ipfs_cid: twin.cid,
        chain_id: resolveNetworkProfile().defaultChainId,
        contract_address: contractAddress,
        status: 'anchored',
        tx_hash: txHash,
        anchored_at: new Date().toISOString(),
      },
      { onConflict: 'asset_id,chain_id' }
    );

    await supabase
      .from('digital_twins')
      .update({
        schema: updated.schema,
        last_updated: new Date().toISOString(),
        updated_by: actorId,
      })
      .eq('asset_id', assetId);

    return { status: 'anchored', txHash, contractAddress };
  }
}
