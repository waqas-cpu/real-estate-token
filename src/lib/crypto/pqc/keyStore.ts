/**
 * Platform / oracle PQC key material.
 * Production: set PQC_PLATFORM_SEED and PQC_ORACLE_SEED (64-char hex) from HSM ceremony.
 */

import { mlDsa87Keygen, seedFromEnv, type PqcKeyPair } from './nist.js';
import { randomBytes } from '@noble/post-quantum/utils.js';

let platformSigning: PqcKeyPair | null = null;
let oracleSigning: PqcKeyPair | null = null;

function loadSeed(name: 'PQC_PLATFORM_SEED' | 'PQC_ORACLE_SEED'): Uint8Array | undefined {
  const hex =
    typeof process !== 'undefined' && process.env?.[name]
      ? process.env[name]
      : undefined;
  return seedFromEnv(hex, 32);
}

export function getPlatformSigningKeyPair(): PqcKeyPair {
  if (!platformSigning) {
    platformSigning = mlDsa87Keygen(loadSeed('PQC_PLATFORM_SEED') ?? randomBytes(32));
  }
  return platformSigning;
}

export function getOracleSigningKeyPair(): PqcKeyPair {
  if (!oracleSigning) {
    const platform = loadSeed('PQC_PLATFORM_SEED');
    const oracle = loadSeed('PQC_ORACLE_SEED');
    oracleSigning = mlDsa87Keygen(oracle ?? platform ?? randomBytes(32));
  }
  return oracleSigning;
}

/** Reset cached keys (unit tests only). */
export function resetPqcKeyStore(): void {
  platformSigning = null;
  oracleSigning = null;
}
