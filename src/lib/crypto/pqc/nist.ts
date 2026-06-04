/**
 * NIST PQC (FIPS 203/204/205) via @noble/post-quantum.
 * ML-DSA-87, ML-KEM-1024, SLH-DSA-SHA2-256f for RWA security layer.
 */

import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import { ml_kem1024 } from '@noble/post-quantum/ml-kem.js';
import { slh_dsa_sha2_256f } from '@noble/post-quantum/slh-dsa.js';
import { randomBytes } from '@noble/post-quantum/utils.js';
import { createHash } from 'node:crypto';
import {
  bytesToBase64Url,
  base64UrlToBytes,
  bytesToHex,
  hexToBytes,
  utf8ToBytes,
} from './encoding.js';

export const PQC_PREFIX = 'pqc1';

export type PqcAlgorithm = 'ML_DSA_87' | 'ML_KEM_1024' | 'SLH_DSA';

export interface PqcKeyPair {
  algorithm: PqcAlgorithm;
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  publicKeyEnc: string;
  publicKeyHash: string;
}

export interface EncodedSignature {
  algorithm: PqcAlgorithm;
  raw: Uint8Array;
  encoded: string;
}

function hashPublicKey(publicKey: Uint8Array): string {
  return createHash('sha256').update(publicKey).digest('hex');
}

function encodePublicKey(algorithm: PqcAlgorithm, publicKey: Uint8Array): string {
  return `${PQC_PREFIX}:${algorithm.toLowerCase()}:pk:${bytesToBase64Url(publicKey)}`;
}

export function encodeSignature(algorithm: PqcAlgorithm, signature: Uint8Array): string {
  return `${PQC_PREFIX}:${algorithm.toLowerCase()}:sig:${bytesToBase64Url(signature)}`;
}

export function parseEncodedSignature(encoded: string): EncodedSignature | null {
  const parts = encoded.split(':');
  if (parts[0] !== PQC_PREFIX || parts[2] !== 'sig') return null;
  const alg = parts[1]?.toUpperCase().replace('ML-DSA-87', 'ML_DSA_87').replace('ML-KEM-1024', 'ML_KEM_1024');
  const algorithm =
    alg === 'ML_DSA_87' || alg === 'ml_dsa_87'
      ? 'ML_DSA_87'
      : alg === 'SLH_DSA' || alg === 'slh_dsa'
        ? 'SLH_DSA'
        : null;
  if (!algorithm) return null;
  return {
    algorithm,
    raw: base64UrlToBytes(parts.slice(3).join(':')),
    encoded,
  };
}

export function parseEncodedPublicKey(encoded: string): { algorithm: PqcAlgorithm; publicKey: Uint8Array } | null {
  const parts = encoded.split(':');
  if (parts[0] !== PQC_PREFIX || parts[2] !== 'pk') return null;
  const tag = parts[1];
  const algorithm: PqcAlgorithm | null =
    tag === 'ml_dsa_87'
      ? 'ML_DSA_87'
      : tag === 'ml_kem_1024'
        ? 'ML_KEM_1024'
        : tag === 'slh_dsa'
          ? 'SLH_DSA'
          : null;
  if (!algorithm) return null;
  return { algorithm, publicKey: base64UrlToBytes(parts.slice(3).join(':')) };
}

export function mlDsa87Keygen(seed?: Uint8Array): PqcKeyPair {
  const keys = ml_dsa87.keygen(seed ?? randomBytes(32));
  const publicKeyEnc = encodePublicKey('ML_DSA_87', keys.publicKey);
  return {
    algorithm: 'ML_DSA_87',
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
    publicKeyEnc,
    publicKeyHash: hashPublicKey(keys.publicKey),
  };
}

export function mlDsa87Sign(message: Uint8Array, secretKey: Uint8Array): EncodedSignature {
  const raw = ml_dsa87.sign(message, secretKey);
  return { algorithm: 'ML_DSA_87', raw, encoded: encodeSignature('ML_DSA_87', raw) };
}

export function mlDsa87Verify(
  signature: Uint8Array | string,
  message: Uint8Array,
  publicKey: Uint8Array | string
): boolean {
  const sigBytes =
    typeof signature === 'string'
      ? (parseEncodedSignature(signature)?.raw ?? base64UrlToBytes(signature))
      : signature;
  const pkBytes =
    typeof publicKey === 'string'
      ? (parseEncodedPublicKey(publicKey)?.publicKey ?? base64UrlToBytes(publicKey))
      : publicKey;
  return ml_dsa87.verify(sigBytes, message, pkBytes);
}

export function mlKem1024Keygen(seed?: Uint8Array): PqcKeyPair {
  const keys = ml_kem1024.keygen(seed ?? randomBytes(64));
  const publicKeyEnc = encodePublicKey('ML_KEM_1024', keys.publicKey);
  return {
    algorithm: 'ML_KEM_1024',
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
    publicKeyEnc,
    publicKeyHash: hashPublicKey(keys.publicKey),
  };
}

export function mlKem1024Encapsulate(publicKey: Uint8Array | string): {
  cipherText: Uint8Array;
  cipherTextEnc: string;
  sharedSecret: Uint8Array;
  sharedSecretHex: string;
} {
  const pk =
    typeof publicKey === 'string'
      ? (parseEncodedPublicKey(publicKey)?.publicKey ?? base64UrlToBytes(publicKey))
      : publicKey;
  const { cipherText, sharedSecret } = ml_kem1024.encapsulate(pk);
  return {
    cipherText,
    cipherTextEnc: `${PQC_PREFIX}:ml_kem_1024:ct:${bytesToBase64Url(cipherText)}`,
    sharedSecret,
    sharedSecretHex: bytesToHex(sharedSecret),
  };
}

export function mlKem1024Decapsulate(
  cipherText: Uint8Array | string,
  secretKey: Uint8Array
): Uint8Array {
  const ct =
    typeof cipherText === 'string'
      ? (() => {
          const marker = ':ct:';
          const idx = cipherText.indexOf(marker);
          if (idx === -1) return base64UrlToBytes(cipherText);
          return base64UrlToBytes(cipherText.slice(idx + marker.length));
        })()
      : cipherText;
  return ml_kem1024.decapsulate(ct, secretKey);
}

export function slhDsaKeygen(seed?: Uint8Array): PqcKeyPair {
  const keys = slh_dsa_sha2_256f.keygen(seed ?? randomBytes(96));
  const publicKeyEnc = encodePublicKey('SLH_DSA', keys.publicKey);
  return {
    algorithm: 'SLH_DSA',
    publicKey: keys.publicKey,
    secretKey: keys.secretKey,
    publicKeyEnc,
    publicKeyHash: hashPublicKey(keys.publicKey),
  };
}

export function slhDsaSign(message: Uint8Array, secretKey: Uint8Array): EncodedSignature {
  const raw = slh_dsa_sha2_256f.sign(message, secretKey);
  return { algorithm: 'SLH_DSA', raw, encoded: encodeSignature('SLH_DSA', raw) };
}

export function slhDsaVerify(
  signature: Uint8Array | string,
  message: Uint8Array,
  publicKey: Uint8Array | string
): boolean {
  const sigBytes =
    typeof signature === 'string'
      ? (parseEncodedSignature(signature)?.raw ?? base64UrlToBytes(signature))
      : signature;
  const pkBytes =
    typeof publicKey === 'string'
      ? (parseEncodedPublicKey(publicKey)?.publicKey ?? base64UrlToBytes(publicKey))
      : publicKey;
  return slh_dsa_sha2_256f.verify(sigBytes, message, pkBytes);
}

export function signUtf8Message(
  text: string,
  keyPair: PqcKeyPair
): EncodedSignature {
  const msg = utf8ToBytes(text);
  if (keyPair.algorithm === 'ML_DSA_87') return mlDsa87Sign(msg, keyPair.secretKey);
  if (keyPair.algorithm === 'SLH_DSA') return slhDsaSign(msg, keyPair.secretKey);
  throw new Error(`Algorithm ${keyPair.algorithm} cannot sign messages`);
}

export function verifyUtf8Message(
  text: string,
  signature: string,
  publicKeyEnc: string
): boolean {
  const parsed = parseEncodedSignature(signature);
  const pk = parseEncodedPublicKey(publicKeyEnc);
  if (!parsed || !pk) return false;
  const msg = utf8ToBytes(text);
  if (parsed.algorithm === 'ML_DSA_87') return mlDsa87Verify(parsed.raw, msg, pk.publicKey);
  if (parsed.algorithm === 'SLH_DSA') return slhDsaVerify(parsed.raw, msg, pk.publicKey);
  return false;
}

export function seedFromEnv(hexEnv: string | undefined, byteLength: number): Uint8Array | undefined {
  if (!hexEnv?.trim()) return undefined;
  const bytes = hexToBytes(hexEnv.trim());
  if (bytes.length < byteLength) {
    const out = new Uint8Array(byteLength);
    out.set(bytes);
    return out;
  }
  return bytes.slice(0, byteLength);
}
