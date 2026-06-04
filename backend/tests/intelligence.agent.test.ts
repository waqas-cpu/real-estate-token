import { describe, it, expect } from 'vitest';
import { runIntelligenceAgentLoop } from '../src/agents/intelligence/agentLoop.js';
import type { DigitalTwin, OracleAttestation } from '../../src/lib/types/architecture.js';

const twin: DigitalTwin = {
  id: 'twin-1',
  assetId: 'asset-1',
  cid: 'QmTestTwin',
  version: 1,
  schema: {
    physical: { squareFeet: 2000, bedrooms: 3, bathrooms: 2, yearBuilt: 1990 },
    location: { country: 'US' },
  },
  titleChain: [],
  encumbrances: [{ type: 'MORTGAGE', holder: 'Bank' }],
  valuationHistory: [],
  lastUpdated: new Date(),
  attestationQuorum: 2,
};

const attestations: OracleAttestation[] = [
  {
    id: 'a1',
    assetId: 'asset-1',
    source: 'CHAINLINK',
    dataType: 'VALUATION',
    value: '500000',
    confidence: 0.9,
    signedAt: new Date(),
    signatureML_DSA: 'sig1',
    expiresAt: new Date(Date.now() + 86400000),
  },
  {
    id: 'a2',
    assetId: 'asset-1',
    source: 'PYTH',
    dataType: 'MARKET',
    value: '495000',
    confidence: 0.85,
    signedAt: new Date(),
    signatureML_DSA: 'sig2',
    expiresAt: new Date(Date.now() + 86400000),
  },
];

describe('Agentic intelligence layer', () => {
  it('runs tool loop and proposes FMV + risk', async () => {
    const result = await runIntelligenceAgentLoop(
      {
        assetId: 'asset-1',
        twin,
        attestations,
        jurisdiction: 'US',
        investorWallet: '0xInvestor1',
        actorId: 'actor-1',
      },
      { requireHumanApproval: true }
    );

    expect(result.mode).toBe('AGENTIC');
    expect(result.steps.length).toBeGreaterThanOrEqual(5);
    expect(result.valuation.fmv).toBeGreaterThan(0);
    expect(result.valuation.method).toContain('AGENTIC');
    expect(result.riskScore.composite).toBeLessThanOrEqual(100);
    expect(result.status).toBe('PENDING_APPROVAL');
    expect(result.agentSummary.length).toBeGreaterThan(10);
  });

  it('auto-approves when configured', async () => {
    const result = await runIntelligenceAgentLoop(
      {
        assetId: 'asset-1',
        twin,
        attestations,
        jurisdiction: 'US',
        actorId: 'actor-1',
      },
      { requireHumanApproval: false }
    );
    expect(result.status).toBe('APPROVED');
  });
});
