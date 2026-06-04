/**
 * Oracle quorum — Chainlink / Pyth live when keys set; testnet fixtures otherwise.
 * All attestations ML-DSA-87 signed (see OracleCoordinator).
 */

import { resolveNetworkProfile } from '../config/networkProfile.js';
import { getOracleSigningKeyPair } from '../crypto/pqc/keyStore.js';
import { signUtf8Message } from '../crypto/pqc/nist.js';
import type { OracleAttestation } from '../types/architecture.js';

export type OracleSource = 'CHAINLINK' | 'PYTH' | 'CUSTOM';

interface OracleFeedResult {
  value: string;
  confidence: number;
  source: OracleSource;
  dataSource: 'live_api' | 'testnet_fixture';
}

async function fetchChainlinkValuation(assetId: string): Promise<OracleFeedResult | null> {
  const key = process.env?.CHAINLINK_API_KEY;
  if (!key) return null;
  // Production: DECO / Functions endpoint per property feed
  const url = process.env.CHAINLINK_VALUATION_URL;
  if (!url) return null;
  try {
    const res = await fetch(`${url}?asset=${encodeURIComponent(assetId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { value?: string; confidence?: number };
    return {
      value: String(body.value ?? '500000'),
      confidence: Number(body.confidence ?? 0.85),
      source: 'CHAINLINK',
      dataSource: 'live_api',
    };
  } catch {
    return null;
  }
}

async function fetchPythValuation(assetId: string): Promise<OracleFeedResult | null> {
  const key = process.env?.PYTH_API_KEY;
  if (!key) return null;
  const url = process.env.PYTH_VALUATION_URL ?? 'https://hermes.pyth.network/v2/updates/price/latest';
  try {
    const res = await fetch(url, { headers: { 'X-API-Key': key } });
    if (!res.ok) return null;
    const body = (await res.json()) as { parsed?: Array<{ price?: { price?: string } }> };
    const price = body.parsed?.[0]?.price?.price ?? '500000';
    return {
      value: String(price),
      confidence: 0.82,
      source: 'PYTH',
      dataSource: 'live_api',
    };
  } catch {
    return null;
  }
}

function testnetFixture(source: OracleSource, assetId: string): OracleFeedResult {
  const jitter = source === 'CHAINLINK' ? 0.88 : source === 'PYTH' ? 0.84 : 0.8;
  return {
    value: String(480_000 + Math.floor(Math.random() * 40_000)),
    confidence: jitter,
    source,
    dataSource: 'testnet_fixture',
  };
}

export async function fetchOracleFeed(
  assetId: string,
  dataType: string,
  source: OracleSource
): Promise<OracleFeedResult> {
  const profile = resolveNetworkProfile();
  let feed: OracleFeedResult | null = null;

  if (source === 'CHAINLINK') feed = await fetchChainlinkValuation(assetId);
  else if (source === 'PYTH') feed = await fetchPythValuation(assetId);

  if (!feed && profile.useIntegrationFixtures) {
    feed = testnetFixture(source, assetId);
  }

  if (!feed) {
    throw new Error(
      `Oracle ${source} unavailable — set API keys or use RWA_NETWORK_PROFILE=testnet`
    );
  }

  return feed;
}

export function buildSignedAttestation(
  assetId: string,
  dataType: OracleAttestation['dataType'],
  feed: OracleFeedResult
): OracleAttestation {
  const oracleKey = getOracleSigningKeyPair();
  const payload = `${assetId}|${dataType}|${feed.value}|${feed.source}`;
  const signatureML_DSA = signUtf8Message(payload, oracleKey).encoded;

  return {
    id: `att_${feed.source}_${Date.now()}`,
    assetId,
    source: feed.source,
    dataType,
    value: feed.value,
    confidence: feed.confidence,
    signedAt: new Date(),
    signatureML_DSA,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  };
}
