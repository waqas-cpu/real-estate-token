/**
 * Shamir secret sharing (t-of-n) over GF(256) for ceremony seed distribution.
 * Used for platform key ceremony metadata — full ML-DSA MPC requires HSM/MPC in production.
 */

const PRIME = 257;

function modAdd(a: number, b: number): number {
  const s = a + b;
  return s >= PRIME ? s - PRIME : s;
}

function modSub(a: number, b: number): number {
  const s = a - b;
  return s < 0 ? s + PRIME : s;
}

function modMul(a: number, b: number): number {
  return (a * b) % PRIME;
}

function modInv(x: number): number {
  if (x === 0) throw new Error('Cannot invert 0');
  let t = 0;
  let r = PRIME;
  let newT = 1;
  let newR = x;
  while (newR !== 0) {
    const q = Math.floor(r / newR);
    [t, newT] = [newT, t - q * newT];
    [r, newR] = [newR, r - q * newR];
  }
  if (r > 1) throw new Error('Not invertible');
  return t < 0 ? t + PRIME : t;
}

function evalPoly(coeffs: number[], x: number): number {
  let result = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) {
    result = modAdd(modMul(result, x), coeffs[i]!);
  }
  return result;
}

function randomCoeff(): number {
  const buf = new Uint8Array(1);
  crypto.getRandomValues(buf);
  return (buf[0]! % 256) + 1;
}

/** Split secret bytes into n shares; any t shares reconstruct the secret. */
export function splitSecret(
  secret: Uint8Array,
  threshold: number,
  totalShares: number
): string[] {
  if (threshold < 1 || threshold > totalShares) {
    throw new Error(`Invalid threshold ${threshold} for ${totalShares} shares`);
  }
  const shares: string[] = [];
  for (let byteIdx = 0; byteIdx < secret.length; byteIdx++) {
    const coeffs = [secret[byteIdx]!];
    while (coeffs.length < threshold) coeffs.push(randomCoeff());
    for (let x = 1; x <= totalShares; x++) {
      const y = evalPoly(coeffs, x);
      const existing = shares[x - 1] ?? '';
      shares[x - 1] = existing + String.fromCharCode(y);
    }
  }
  return shares.map((payload, i) => `shamir:${threshold}:${totalShares}:${i + 1}:${bytesToBase64Url(utf8ToBytes(payload))}`);
}

export function combineShares(shares: string[]): Uint8Array {
  if (shares.length === 0) throw new Error('No shares provided');
  const parsed = shares.map(parseShare);
  const threshold = parsed[0]!.threshold;
  const payloads = parsed.map((p) => p.payload);
  const len = payloads[0]!.length;
  const out = new Uint8Array(len);
  for (let byteIdx = 0; byteIdx < len; byteIdx++) {
    let secret = 0;
    const used: number[] = [];
    const values: number[] = [];
    for (const p of parsed.slice(0, threshold)) {
      used.push(p.index);
      values.push(p.payload.charCodeAt(byteIdx)!);
    }
    for (let i = 0; i < threshold; i++) {
      let numerator = 1;
      let denominator = 1;
      for (let j = 0; j < threshold; j++) {
        if (i === j) continue;
        numerator = modMul(numerator, modSub(0, used[j]!));
        denominator = modMul(denominator, modSub(used[i]!, used[j]!));
      }
      const lagrange = modMul(numerator, modInv(denominator));
      secret = modAdd(secret, modMul(values[i]!, lagrange));
    }
    out[byteIdx] = secret;
  }
  return out;
}

function parseShare(share: string): { threshold: number; index: number; payload: string } {
  const parts = share.split(':');
  if (parts[0] !== 'shamir' || parts.length < 5) {
    throw new Error('Invalid shamir share format');
  }
  return {
    threshold: Number(parts[1]),
    index: Number(parts[3]),
    payload: base64UrlToUtf8(parts.slice(4).join(':')),
  };
}

function utf8ToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function base64UrlToUtf8(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, 'base64').toString('utf8');
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const b64 = Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
