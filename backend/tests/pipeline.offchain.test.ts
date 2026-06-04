/**
 * Off-chain pipeline smoke test (no Supabase) — layers + gates only.
 */
import { describe, it, expect } from 'vitest';
import { DataLayerOrchestrator } from '../../src/lib/layers/DataLayer.js';
import { IntelligenceLayerOrchestrator } from '../../src/lib/layers/IntelligenceLayer.js';
import { SecurityLayerOrchestrator } from '../../src/lib/layers/SecurityLayer.js';
import { crossGate } from '../../src/lib/gates/integrationGates.js';
import { TokenEconomicsService } from '../src/services/TokenEconomicsService.js';
import { PLATFORM_TOKEN_ECONOMICS } from '../src/config/platformTokenEconomics.js';

describe('Off-chain pipeline (layers + gates)', () => {
  it('runs DATA → INTELLIGENCE gate with ingest output', async () => {
    const data = new DataLayerOrchestrator();
    const { asset, twin, attestations } = await data.ingestAsset(
      'HM_LAND_REGISTRY',
      'PIPELINE-TEST-001'
    );

    const boundary = await crossGate({
      fromLayer: 'DATA',
      toLayer: 'INTELLIGENCE',
      data: { asset, twin: { ...twin, verified: true }, oracleAttestations: attestations },
      actor: 'test-actor',
      timestamp: new Date(),
    });

    expect(boundary.allPassed).toBe(true);

    const intel = new IntelligenceLayerOrchestrator();
    const { valuation, riskScore } = await intel.processAssetIntelligence(twin, attestations);
    expect(valuation.fmv).toBeGreaterThan(0);
    expect(riskScore.composite).toBeLessThanOrEqual(100);
  });

  it('runs INTELLIGENCE → SECURITY gate', async () => {
    const intel = new IntelligenceLayerOrchestrator();
    const { kyc } = await intel.processInvestor('0xInvestor', 'US');

    const boundary = await crossGate({
      fromLayer: 'INTELLIGENCE',
      toLayer: 'SECURITY',
      data: {
        kycRecord: kyc,
        riskScore: { composite: 70 },
        valuation: { computedAt: new Date() },
        jurisdiction: 'US',
      },
      actor: 'test-actor',
      timestamp: new Date(),
    });
    expect(boundary.allPassed).toBe(true);
  });

  it('runs SECURITY → EXECUTION gate', async () => {
    const security = new SecurityLayerOrchestrator();
    const keys = await security.processSecuritySetup();
    const { kyc } = await new IntelligenceLayerOrchestrator().processInvestor('0xInv', 'US');
    const credential = await security.zkEngine.issueZKCredential(kyc, 'COMPOSITE');
    const audit = await security.auditManager.recordAuditEvent(
      'PIPELINE_TEST',
      'actor',
      'SECURITY',
      {},
      security.keyManager
    );

    const boundary = await crossGate({
      fromLayer: 'SECURITY',
      toLayer: 'EXECUTION',
      data: {
        signingKeys: [keys.signingKey],
        zkCredential: credential,
        auditEvents: [audit],
        recoveryModule: { status: 'CLOSED' },
      },
      actor: 'test-actor',
      timestamp: new Date(),
    });
    expect(boundary.allPassed).toBe(true);
  });

  it('runs EXECUTION → DATA feedback gate', async () => {
    const boundary = await crossGate({
      fromLayer: 'EXECUTION',
      toLayer: 'DATA',
      data: {
        transferEventHash: '0xabc123settlement',
        twinUpdatedAt: new Date(),
        merkleRoot: '0xmerkle',
        distributionContractAddr: '0xoffering',
        verifiedAt: new Date(),
      },
      actor: 'test-actor',
      timestamp: new Date(),
    });
    expect(boundary.allPassed).toBe(true);
    expect(boundary.gateName).toBe('GATE_EXEC_DATA');
  });

  it('enforces platform token economics constants', () => {
    const svc = new TokenEconomicsService();
    const policy = svc.getPlatformPolicy();
    expect(policy.fixedTotalSupply).toBe(30_000);
    expect(policy.maxTokensPerInvestor).toBe(3_000);
    expect(PLATFORM_TOKEN_ECONOMICS.currency).toBe('USDC');
  });
});
