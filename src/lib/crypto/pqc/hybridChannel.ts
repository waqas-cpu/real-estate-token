/**
 * Hybrid classical + post-quantum KEM for secure channels to L2 sequencers / relayers.
 * Uses ML-KEM-768 + X25519 (CG framework, same construction as XWing).
 */

import { ml_kem768_x25519 } from '@noble/post-quantum/hybrid.js';
import { randomBytes } from '@noble/post-quantum/utils.js';
import { bytesToBase64Url, base64UrlToBytes, bytesToHex } from './encoding.js';

export const HYBRID_PREFIX = 'pqc1:hybrid:x25519_ml_kem768';

export interface HybridKemKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  publicKeyEnc: string;
}

export function hybridKemKeygen(seed?: Uint8Array): HybridKemKeyPair {
  const keys = ml_kem768_x25519.keygen(seed);
  return {
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
    publicKeyEnc: `${HYBRID_PREFIX}:pk:${bytesToBase64Url(keys.publicKey)}`,
  };
}

export function hybridKemEncapsulate(publicKeyEnc: string): {
  cipherTextEnc: string;
  sharedSecretHex: string;
} {
  const pk = parseHybridPublicKey(publicKeyEnc);
  const { cipherText, sharedSecret } = ml_kem768_x25519.encapsulate(pk);
  return {
    cipherTextEnc: `${HYBRID_PREFIX}:ct:${bytesToBase64Url(cipherText)}`,
    sharedSecretHex: bytesToHex(sharedSecret),
  };
}

export function hybridKemDecapsulate(cipherTextEnc: string, secretKey: Uint8Array): string {
  const ct = parseHybridCipherText(cipherTextEnc);
  const shared = ml_kem768_x25519.decapsulate(ct, secretKey);
  return bytesToHex(shared);
}

function parseHybridPublicKey(publicKeyEnc: string): Uint8Array {
  if (!publicKeyEnc.startsWith(HYBRID_PREFIX)) {
    throw new Error('Invalid hybrid public key encoding');
  }
  const marker = ':pk:';
  const idx = publicKeyEnc.indexOf(marker);
  if (idx === -1) throw new Error('Invalid hybrid public key encoding');
  return base64UrlToBytes(publicKeyEnc.slice(idx + marker.length));
}

function parseHybridCipherText(cipherTextEnc: string): Uint8Array {
  const marker = ':ct:';
  const idx = cipherTextEnc.indexOf(marker);
  if (idx === -1) throw new Error('Invalid hybrid ciphertext encoding');
  return base64UrlToBytes(cipherTextEnc.slice(idx + marker.length));
}
