/**
 * Comparable sales — MLS/API on mainnet; structured testnet comps for agent tools.
 */

import { resolveNetworkProfile } from '../config/networkProfile.js';

export interface ComparableSale {
  address: string;
  sqft: number;
  soldPrice: number;
  soldDate: string;
  distanceKm?: number;
}

export interface CompsResult {
  comps: ComparableSale[];
  medianCompPrice: number;
  method: string;
  dataSource: 'live_api' | 'testnet_fixture';
}

export async function fetchComparableSales(input: {
  lat: number;
  lng: number;
  squareFeet: number;
  assetId: string;
}): Promise<CompsResult> {
  const profile = resolveNetworkProfile();
  const mlsUrl = process.env?.MLS_API_URL;

  if (mlsUrl && !profile.useIntegrationFixtures) {
    try {
      const res = await fetch(
        `${mlsUrl.replace(/\/$/, '')}/comps?lat=${input.lat}&lng=${input.lng}&sqft=${input.squareFeet}`
      );
      if (res.ok) {
        const body = (await res.json()) as { comps?: ComparableSale[] };
        const comps = body.comps ?? [];
        const prices = comps.map((c) => c.soldPrice).sort((a, b) => a - b);
        const median = prices[Math.floor(prices.length / 2)] ?? 0;
        return {
          comps,
          medianCompPrice: median,
          method: 'MLS_API',
          dataSource: 'live_api',
        };
      }
    } catch {
      /* fall through to fixture */
    }
  }

  const sqft = input.squareFeet || 1500;
  const basePpsf = 220;
  const comps: ComparableSale[] = [
    {
      address: 'Comp A (testnet)',
      sqft: Math.round(sqft * 0.95),
      soldPrice: Math.round(sqft * 0.95 * basePpsf),
      soldDate: new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10),
      distanceKm: 0.4,
    },
    {
      address: 'Comp B (testnet)',
      sqft: Math.round(sqft * 1.05),
      soldPrice: Math.round(sqft * 1.05 * basePpsf * 1.02),
      soldDate: new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10),
      distanceKm: 0.8,
    },
    {
      address: 'Comp C (testnet)',
      sqft: sqft,
      soldPrice: Math.round(sqft * basePpsf * 0.98),
      soldDate: new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10),
      distanceKm: 1.2,
    },
  ];
  const prices = comps.map((c) => c.soldPrice).sort((a, b) => a - b);
  return {
    comps,
    medianCompPrice: prices[1]!,
    method: profile.name === 'testnet' ? 'TESTNET_MLS_FIXTURE' : 'MLS_FALLBACK',
    dataSource: 'testnet_fixture',
  };
}
