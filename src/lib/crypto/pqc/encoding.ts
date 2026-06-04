/** Base64url helpers for PQC key/signature wire format. */

export function bytesToBase64Url(bytes: Uint8Array): string {
  const b64 = Buffer.from(bytes).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64UrlToBytes(encoded: string): Uint8Array {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return new Uint8Array(Buffer.from(padded + pad, 'base64'));
}

export function utf8ToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, '').trim();
  if (clean.length % 2 !== 0) throw new Error('Invalid hex length');
  return new Uint8Array(Buffer.from(clean, 'hex'));
}
