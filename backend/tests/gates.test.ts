/**
 * IMPLEMENTATION_GUIDE Phase 6 — Integration gate unit tests
 */
import { describe, it, expect } from 'vitest';
import { crossGate } from '../../src/lib/gates/integrationGates.js';
import { hashAssetIntegrity } from '../../src/lib/utils/hash.js';

const mockAsset = {
  id: 'asset_test',
  address: '1 Test St',
  title: 'Test Property',
  lat: 51.5,
  lng: -0.12,
  squareFeet: 2000,
  bedrooms: 3,
  bathrooms: 2,
  yearBuilt: 2000,
  registrySource: 'HM_LAND_REGISTRY' as const,
  contentHash: '',
  verified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

mockAsset.contentHash = hashAssetIntegrity(mockAsset);

const mockTwin = {
  id: 'twin_test',
  assetId: mockAsset.id,
  cid: 'QmTestCid123',
  version: 1,
  schema: {
    onChainAnchor: {
      assetId: mockAsset.id,
      cid: 'QmTestCid123',
      status: 'pending',
      chainId: 11155111,
      contractAddress: '0xTwinAnchorTestnet',
      txHash: null,
      anchoredAt: null,
    },
  },
  titleChain: [],
  encumbrances: [],
  valuationHistory: [],
  lastUpdated: new Date(),
  attestationQuorum: 2,
  verified: true,
};

const future = new Date(Date.now() + 86400000 * 30);

describe('Integration Gates (Phase 6)', () => {
  it('crosses DATA → INTELLIGENCE with valid quorum', async () => {
    const boundary = await crossGate({
      fromLayer: 'DATA',
      toLayer: 'INTELLIGENCE',
      data: {
        asset: mockAsset,
        twin: mockTwin,
        oracleAttestations: [
          {
            confidence: 0.85,
            expiresAt: future,
            value: '1',
            signatureML_DSA: 'sig_a',
          },
          {
            confidence: 0.8,
            expiresAt: future,
            value: '2',
            signatureML_DSA: 'sig_b',
          },
        ],
      },
      actor: 'user-test',
      timestamp: new Date(),
    });
    expect(boundary.allPassed).toBe(true);
    expect(boundary.gateName).toBe('GATE_DATA_INTEL');
  });

  it('blocks DATA → INTELLIGENCE with insufficient attestations', async () => {
    await expect(
      crossGate({
        fromLayer: 'DATA',
        toLayer: 'INTELLIGENCE',
        data: {
          asset: mockAsset,
          twin: mockTwin,
          oracleAttestations: [{ confidence: 0.9, expiresAt: future }],
        },
        actor: 'user-test',
        timestamp: new Date(),
      })
    ).rejects.toThrow(/Gate crossing failed/);
  });

  it('blocks INTELLIGENCE → SECURITY when risk exceeds US threshold', async () => {
    await expect(
      crossGate({
        fromLayer: 'INTELLIGENCE',
        toLayer: 'SECURITY',
        data: {
          jurisdiction: 'US',
          riskScore: { composite: 90 },
          valuation: { computedAt: new Date() },
          kycRecord: {
            accreditated: true,
            amlClearedAt: new Date(),
            amlExpiresAt: future,
          },
        },
        actor: 'user-test',
        timestamp: new Date(),
      })
    ).rejects.toThrow(/Gate crossing failed/);
  });
});
