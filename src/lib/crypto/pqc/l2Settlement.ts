/**
 * Post-quantum settlement intents for L2 networks (Base, Arbitrum, Optimism, Sepolia).
 * Off-chain ML-DSA-87 authorization digest consumed by relayers / custody before on-chain mint.
 */

import { signUtf8Message, verifyUtf8Message, type PqcKeyPair } from './nist.js';
import { utf8ToBytes } from './encoding.js';
import { createHash } from 'node:crypto';
import { bytesToHex } from './encoding.js';

export type L2NetworkId =
  | 'sepolia'
  | 'base-sepolia'
  | 'arbitrum-sepolia'
  | 'optimism-sepolia';

export const L2_CHAIN_IDS: Record<L2NetworkId, number> = {
  sepolia: 11155111,
  'base-sepolia': 84532,
  'arbitrum-sepolia': 421614,
  'optimism-sepolia': 11155420,
};

export type L2SettlementAction = 'REGISTER_TOKEN' | 'MINT' | 'TRANSFER' | 'DISTRIBUTE';

export interface L2SettlementIntent {
  version: 1;
  network: L2NetworkId;
  chainId: number;
  assetId: string;
  symbol: string;
  investorWallet: string;
  action: L2SettlementAction;
  contractAddress?: string | null;
  nonce: string;
  issuedAt: string;
}

export function buildSettlementCanonical(intent: L2SettlementIntent): string {
  return [
    'RWA_L2_SETTLEMENT_V1',
    String(intent.chainId),
    intent.network,
    intent.assetId,
    intent.symbol,
    intent.investorWallet.toLowerCase(),
    intent.action,
    intent.contractAddress ?? '',
    intent.nonce,
    intent.issuedAt,
  ].join('|');
}

export function settlementIntentHash(intent: L2SettlementIntent): string {
  const canonical = buildSettlementCanonical(intent);
  const hash = createHash('sha256').update(canonical).digest();
  return '0x' + bytesToHex(new Uint8Array(hash));
}

export function signL2SettlementIntent(
  intent: L2SettlementIntent,
  signingKey: PqcKeyPair
): { intentHash: string; signatureML_DSA: string; canonical: string } {
  const canonical = buildSettlementCanonical(intent);
  const sig = signUtf8Message(canonical, signingKey);
  return {
    intentHash: settlementIntentHash(intent),
    signatureML_DSA: sig.encoded,
    canonical,
  };
}

export function verifyL2SettlementIntent(
  intent: L2SettlementIntent,
  signatureML_DSA: string,
  publicKeyEnc: string
): boolean {
  const canonical = buildSettlementCanonical(intent);
  return verifyUtf8Message(canonical, signatureML_DSA, publicKeyEnc);
}

export function resolveL2Network(network?: string): L2NetworkId {
  const n = (network ?? 'sepolia').toLowerCase() as L2NetworkId;
  if (n in L2_CHAIN_IDS) return n;
  return 'sepolia';
}
