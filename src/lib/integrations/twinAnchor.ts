/**
 * Digital twin IPFS CID → on-chain anchor metadata (testnet pending → mainnet anchored).
 */

import { resolveNetworkProfile } from '../config/networkProfile.js';
import type { DigitalTwin } from '../types/architecture.js';

export type TwinAnchorStatus = 'pending' | 'anchored' | 'failed';

export interface OnChainTwinAnchor {
  assetId: string;
  cid: string;
  status: TwinAnchorStatus;
  chainId: number;
  contractAddress: string | null;
  txHash: string | null;
  anchoredAt: string | null;
}

export function enrichTwinWithPendingAnchor(
  twin: DigitalTwin,
  assetId: string,
  contractAddress?: string | null
): DigitalTwin {
  const profile = resolveNetworkProfile();
  const anchor: OnChainTwinAnchor = {
    assetId,
    cid: twin.cid,
    status: 'pending',
    chainId: profile.defaultChainId,
    contractAddress:
      contractAddress ??
      (profile.name === 'testnet' ? 'PENDING_TWIN_ANCHOR_DEPLOY' : null),
    txHash: null,
    anchoredAt: null,
  };

  return {
    ...twin,
    schema: {
      ...(twin.schema as Record<string, unknown>),
      onChainAnchor: anchor,
    },
  };
}

export function markTwinAnchored(
  twin: DigitalTwin,
  txHash: string,
  contractAddress: string
): DigitalTwin {
  const prev = (twin.schema as Record<string, unknown>)?.onChainAnchor as
    | OnChainTwinAnchor
    | undefined;
  const anchor: OnChainTwinAnchor = {
    assetId: prev?.assetId ?? twin.assetId,
    cid: twin.cid,
    status: 'anchored',
    chainId: prev?.chainId ?? resolveNetworkProfile().defaultChainId,
    contractAddress,
    txHash,
    anchoredAt: new Date().toISOString(),
  };
  return {
    ...twin,
    schema: { ...(twin.schema as Record<string, unknown>), onChainAnchor: anchor },
  };
}
