import { describe, it, expect } from 'vitest';
import { KycKybWhitelistingService } from '../src/services/KycKybWhitelistingService.js';
import { MultiSigAdminService } from '../src/services/MultiSigAdminService.js';
import { EmergencyService } from '../src/services/EmergencyService.js';
import { TransferComplianceEngine } from '../src/services/regulatory/TransferComplianceEngine.js';
import { PropertySpvVerificationService } from '../src/services/database/PropertySpvVerificationService.js';
import { OracleIntegrityService } from '../src/services/OracleIntegrityService.js';
import { TransactionMonitoringService } from '../src/services/monitoring/TransactionMonitoringService.js';
import { ImmutableAuditService } from '../src/services/audit/ImmutableAuditService.js';
import { requireRole } from '../src/middleware/rbac.js';
import { securityHeaders } from '../src/middleware/production.js';

describe('RWA 10 Critical Security Features Test Suite', () => {
  // --------------------------------------------------------------------------
  // 1. KYC/KYB + Wallet Whitelisting
  // --------------------------------------------------------------------------
  describe('Feature 1: KYC/KYB + Wallet Whitelisting', () => {
    const kycKybSvc = new KycKybWhitelistingService();
    const testWallet = '0x1111222233334444555566667777888899990000';

    it('submits corporate KYB with UBOs and processes whitelisting lifecycle', async () => {
      // 1. Submit KYB
      const kybRes = await kycKybSvc.submitKyb({
        walletAddress: testWallet,
        companyName: 'Apex Prime Capital Fund LP',
        companyJurisdiction: 'US',
        registrationNumber: 'DE-994821',
        beneficialOwners: [
          {
            fullName: 'Alexander Vance',
            citizenship: 'US',
            ownershipPercentage: 60.0,
            isPep: false,
          },
          {
            fullName: 'Elena Rostova',
            citizenship: 'UK',
            ownershipPercentage: 40.0,
            isPep: false,
          },
        ],
      });
      expect(kybRes.kybStatus).toBe('PENDING');

      // 2. Review & approve
      const reviewRes = await kycKybSvc.reviewKyb(testWallet, 'APPROVED', 'admin-001');
      expect(reviewRes.kybStatus).toBe('APPROVED');

      // 3. Whitelist wallet
      const wlRes = await kycKybSvc.whitelistWallet(testWallet, { countryCode: 840 });
      expect(wlRes.isWhitelisted).toBe(true);
      expect(wlRes.txHash).toContain('0x_wl_');

      // 4. Check status
      const status = await kycKybSvc.getStatus(testWallet);
      expect(status.isWhitelisted).toBe(true);
      expect(status.kybStatus).toBe('APPROVED');
      expect(status.beneficialOwnersCount).toBe(2);

      // 5. Revoke whitelist
      const revokeRes = await kycKybSvc.revokeWhitelist(testWallet, 'Annual re-certification required');
      expect(revokeRes.isWhitelisted).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Smart Contract Role-Based Access & RBAC Middleware
  // --------------------------------------------------------------------------
  describe('Feature 2: Role-Based Access Control (RBAC)', () => {
    it('blocks unauthorized roles and admits authorized roles', () => {
      const guard = requireRole('ADMIN', 'COMPLIANCE');
      let nextCalled = false;
      let statusResult = 0;
      let jsonResult: any = null;

      const mockRes: any = {
        status: (code: number) => {
          statusResult = code;
          return {
            json: (data: any) => {
              jsonResult = data;
            },
          };
        },
      };

      // Case A: Unauthenticated -> 401
      guard({} as any, mockRes, () => { nextCalled = true; });
      expect(statusResult).toBe(401);

      // Case B: Authenticated as INVESTOR -> 403 Forbidden
      statusResult = 0;
      nextCalled = false;
      guard({ user: { id: 'usr-1' }, headers: { 'x-user-role': 'INVESTOR' } } as any, mockRes, () => { nextCalled = true; });
      expect(statusResult).toBe(403);
      expect(jsonResult.error).toContain('Forbidden');
      expect(nextCalled).toBe(false);

      // Case C: Authenticated as COMPLIANCE -> Allowed
      statusResult = 0;
      nextCalled = false;
      guard({ user: { id: 'usr-2' }, headers: { 'x-user-role': 'COMPLIANCE' } } as any, mockRes, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
      expect(statusResult).toBe(0);

      // Case D: Authenticated as ADMIN -> Allowed (Root bypass)
      nextCalled = false;
      guard({ user: { id: 'usr-3' }, headers: { 'x-user-role': 'ADMIN' } } as any, mockRes, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Multisig Administration
  // --------------------------------------------------------------------------
  describe('Feature 3: Multisig Administration', () => {
    const multisigSvc = new MultiSigAdminService();

    it('requires M-of-N threshold signatures to execute governance proposals', async () => {
      const proposal = await multisigSvc.propose({
        multisigContractAddress: '0x_multisig_contract',
        destination: '0x_treasury_vault',
        value: '1000000',
        data: '0xa9059cbb',
        description: 'Authorize quarterly yield distribution withdrawal',
        proposer: '0x_admin_signer_1',
        requiredConfirmations: 2, // 2-of-3
      });

      expect(proposal.status).toBe('PROPOSED');
      expect(proposal.confirmations.length).toBe(1);

      // Attempt execution before threshold -> fails
      await expect(multisigSvc.execute(proposal.id, '0x_admin_signer_1')).rejects.toThrow(
        'Insufficient confirmations'
      );

      // 2nd signature confirms
      const confirmed = await multisigSvc.confirm(proposal.id, '0x_admin_signer_2');
      expect(confirmed.status).toBe('CONFIRMED');
      expect(confirmed.confirmations.length).toBe(2);

      // Execute now succeeds
      const executed = await multisigSvc.execute(proposal.id, '0x_admin_signer_1');
      expect(executed.status).toBe('EXECUTED');
      expect(executed.executionTxHash).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // 4. Emergency Pause / Freeze
  // --------------------------------------------------------------------------
  describe('Feature 4: Emergency Pause / Freeze', () => {
    const emergencySvc = new EmergencyService();

    it('triggers circuit breaker pause on offerings and freezes compromised wallets', async () => {
      const offering = '0x_primary_offering_001';
      const token = '0x_rwa_token_001';
      const compromisedWallet = '0x_attacker_wallet_001';

      // 1. Pause offering
      await emergencySvc.pauseOffering(offering, 'Unusual volume spike', 'operator-1');
      expect(emergencySvc.isOfferingPaused(offering)).toBe(true);

      // 2. Freeze attacker wallet
      await emergencySvc.freezeWallet(token, compromisedWallet, 'Court ordered asset freeze', 'operator-1');
      expect(emergencySvc.isWalletFrozen(token, compromisedWallet)).toBe(true);

      // 3. Status check
      const status = emergencySvc.getStatus();
      expect(status.pausedOfferings).toContain(offering.toLowerCase());
      expect(status.totalEmergencyEvents).toBeGreaterThanOrEqual(2);

      // 4. Unpause offering
      await emergencySvc.unpauseOffering(offering, 'admin-root');
      expect(emergencySvc.isOfferingPaused(offering)).toBe(false);

      // 5. Unfreeze wallet
      await emergencySvc.unfreezeWallet(token, compromisedWallet, 'admin-root');
      expect(emergencySvc.isWalletFrozen(token, compromisedWallet)).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Transfer Compliance Engine
  // --------------------------------------------------------------------------
  describe('Feature 5: Transfer Compliance Engine', () => {
    const engine = new TransferComplianceEngine();

    it('validates compliant transfer successfully', () => {
      const result = engine.simulateTransfer({
        fromWallet: '0x_sender',
        toWallet: '0x_receiver',
        tokenAmount: 20, // 20 * $100 = $2,000 USD (below $3,000 Travel Rule threshold)
        fromWhitelisted: true,
        toWhitelisted: true,
        fromBalance: 1000,
        toBalance: 500,
        totalSupply: 30000,
        fromJurisdiction: 'US',
        toJurisdiction: 'UK',
      });

      expect(result.canTransfer).toBe(true);
      expect(result.resultingRecipientOwnershipPct).toBeLessThan(10);
    });

    it('blocks transfer if recipient would exceed 10% maximum balance ceiling', () => {
      const result = engine.simulateTransfer({
        fromWallet: '0x_sender',
        toWallet: '0x_whale_receiver',
        tokenAmount: 2000,
        fromWhitelisted: true,
        toWhitelisted: true,
        fromBalance: 5000,
        toBalance: 2500, // 2500 + 2000 = 4500 > 3000 (10% of 30,000)
        totalSupply: 30000,
      });

      expect(result.canTransfer).toBe(false);
      expect(result.blockReason).toContain('10% maximum balance ceiling');
    });

    it('blocks transfer if sender tokens are within Reg S / Reg D holding period lockup', () => {
      const futureDate = new Date(Date.now() + 86400000 * 180).toISOString(); // 180 days in future
      const result = engine.simulateTransfer({
        fromWallet: '0x_locked_sender',
        toWallet: '0x_receiver',
        tokenAmount: 100,
        fromBalance: 500,
        fromLockupUntil: futureDate,
      });

      expect(result.canTransfer).toBe(false);
      expect(result.blockReason).toContain('holding period');
    });

    it('blocks transfer involving sanctioned jurisdictions', () => {
      const result = engine.simulateTransfer({
        fromWallet: '0x_sender',
        toWallet: '0x_sanctioned_country_receiver',
        tokenAmount: 100,
        fromJurisdiction: 'US',
        toJurisdiction: 'KP', // North Korea
      });

      expect(result.canTransfer).toBe(false);
      expect(result.blockReason).toContain('restricted jurisdiction');
    });

    it('requires Travel Rule VASP data for transfers over $3,000 threshold', () => {
      const withoutVasp = engine.simulateTransfer({
        fromWallet: '0x_sender',
        toWallet: '0x_receiver',
        tokenAmount: 50,
        tokenPriceUsd: 100, // $5,000 USD value
      });
      expect(withoutVasp.canTransfer).toBe(false);
      expect(withoutVasp.travelRuleRequired).toBe(true);

      const withVasp = engine.simulateTransfer({
        fromWallet: '0x_sender',
        toWallet: '0x_receiver',
        tokenAmount: 50,
        tokenPriceUsd: 100,
        originatorVasp: 'Coinbase Custody Trust',
        beneficiaryVasp: 'Fidelity Digital Assets',
      });
      expect(withVasp.canTransfer).toBe(true);
      expect(withVasp.travelRuleSatisfied).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Property / SPV Verification Pipeline
  // --------------------------------------------------------------------------
  describe('Feature 6: Property/SPV Verification', () => {
    const verifSvc = new PropertySpvVerificationService();

    it('progresses through 5-stage legal verification to make property tokenization-ready', async () => {
      const propertyId = 'prop-kensington-test-01';

      const initial = await verifSvc.getVerificationDossier(propertyId);
      expect(initial.overallStatus).toBe('IN_PROGRESS');
      expect(initial.readyForTokenization).toBe(false);

      // Run full automated verification across all 5 stages
      const completed = await verifSvc.runFullAutomatedVerification(
        propertyId,
        'Kensington Real Estate SPV LLC',
        'Senior Compliance Counsel'
      );

      expect(completed.overallStatus).toBe('VERIFIED');
      expect(completed.readyForTokenization).toBe(true);
      expect(completed.digitalTwinCid).toContain('bafybei_');
      expect(completed.onChainAnchorTx).toContain('0x_anchor_');
      expect(completed.stages.every((s) => s.status === 'PASSED')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Oracle & Data Integrity Controls
  // --------------------------------------------------------------------------
  describe('Feature 7: Oracle & Data Integrity Controls', () => {
    const oracleSvc = new OracleIntegrityService();
    const assetId = 'prop-kensington-001';

    it('accepts valid attestation within tolerance bands', () => {
      const res = oracleSvc.validateAndIngestAttestation({
        assetId,
        source: 'CHAINLINK',
        valuationUsd: 3100000, // ~3.3% change from 3M
        confidence: 0.98,
        timestamp: new Date().toISOString(),
        signature: 'valid_ml_dsa_signature_hash_001',
      });

      expect(res.accepted).toBe(true);
      expect(res.circuitBreakerTripped).toBe(false);
    });

    it('rejects stale attestation older than 24 hours', () => {
      const twoDaysAgo = new Date(Date.now() - 48 * 3600000).toISOString();
      const res = oracleSvc.validateAndIngestAttestation({
        assetId,
        source: 'PYTH',
        valuationUsd: 3100000,
        confidence: 0.95,
        timestamp: twoDaysAgo,
        signature: 'valid_signature_stale',
      });

      expect(res.accepted).toBe(false);
      expect(res.isStale).toBe(true);
    });

    it('trips circuit breaker if price deviates > 10%', () => {
      const res = oracleSvc.validateAndIngestAttestation({
        assetId,
        source: 'PYTH',
        valuationUsd: 4500000, // 50% jump from 3M
        confidence: 0.95,
        timestamp: new Date().toISOString(),
        signature: 'valid_signature_spike',
      });

      expect(res.accepted).toBe(false);
      expect(res.circuitBreakerTripped).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 8. Backend / API Security
  // --------------------------------------------------------------------------
  describe('Feature 8: Backend & API Security', () => {
    it('sets OWASP enterprise security headers on response', () => {
      const headers: Record<string, string> = {};
      const mockRes: any = {
        setHeader: (k: string, v: string) => {
          headers[k.toLowerCase()] = v;
        },
      };

      securityHeaders({} as any, mockRes, () => {});

      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['strict-transport-security']).toBeDefined();
      expect(headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  // --------------------------------------------------------------------------
  // 9. Transaction Monitoring (AML / CFT)
  // --------------------------------------------------------------------------
  describe('Feature 9: Transaction Monitoring', () => {
    const monitoringSvc = new TransactionMonitoringService();

    it('detects structuring just below $10,000 BSA threshold', () => {
      const res = monitoringSvc.evaluateTransaction({
        txHash: '0x_tx_structuring_001',
        walletAddress: '0x_test_structurer',
        amountUsd: 9850, // Just below $10,000 threshold
      });

      expect(res.isFlagged).toBe(true);
      expect(res.riskScore).toBeGreaterThanOrEqual(75);
      expect(res.alerts.some((a) => a.alertType === 'STRUCTURING_DETECTED')).toBe(true);
    });

    it('flags interaction with sanctioned wallet address', () => {
      const res = monitoringSvc.evaluateTransaction({
        txHash: '0x_tx_sanction_001',
        walletAddress: '0x8589427373d6d84e98730d7795d8f6f8731fda16', // Sanctioned Tornado Cash address
        amountUsd: 1000,
      });

      expect(res.isFlagged).toBe(true);
      expect(res.riskScore).toBe(100);
      expect(res.alerts.some((a) => a.alertType === 'SANCTIONS_MATCH')).toBe(true);
    });

    it('detects velocity spike when wallet submits rapid transfers', () => {
      const wallet = '0x_velocity_wallet_001';
      // Simulate 4 transactions
      monitoringSvc.evaluateTransaction({ txHash: '0x_v1', walletAddress: wallet, amountUsd: 2000 });
      monitoringSvc.evaluateTransaction({ txHash: '0x_v2', walletAddress: wallet, amountUsd: 2000 });
      monitoringSvc.evaluateTransaction({ txHash: '0x_v3', walletAddress: wallet, amountUsd: 2000 });
      const fourth = monitoringSvc.evaluateTransaction({ txHash: '0x_v4', walletAddress: wallet, amountUsd: 2000 });

      expect(fourth.isFlagged).toBe(true);
      expect(fourth.alerts.some((a) => a.alertType === 'VELOCITY_SPIKE')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 10. Immutable Audit Trail
  // --------------------------------------------------------------------------
  describe('Feature 10: Immutable Audit Trail', () => {
    it('creates tamper-evident hash-chained audit records and detects tampering', async () => {
      const auditSvc = new ImmutableAuditService();

      // Record several events
      await auditSvc.recordEvent('SECURITY', 'actor-admin-1', 'KYC_APPROVED', {
        wallet: '0x_alice',
        jurisdiction: 'US',
      });
      await auditSvc.recordEvent('EXECUTION', 'actor-admin-1', 'TOKEN_OFFERING_ACTIVATED', {
        tokenId: 'rwa-token-01',
        tokenPriceUsdc: 100,
      });
      await auditSvc.recordEvent('SECURITY', 'actor-compliance-1', 'WHITELIST_GRANTED', {
        wallet: '0x_alice',
      });

      // 1. Initial chain integrity verification
      const verifyRes = auditSvc.verifyChainIntegrity();
      expect(verifyRes.isValid).toBe(true);
      expect(verifyRes.totalEventsVerified).toBe(3);
      expect(verifyRes.latestChainHash).toBeDefined();

      // 2. Simulate malicious database tampering (someone altered event 1 details)
      auditSvc._simulateTamper(1, { tokenId: 'rwa-token-01', tokenPriceUsdc: 10 }); // changed price from 100 to 10

      // 3. Chain verification must detect tamper!
      const tamperedRes = auditSvc.verifyChainIntegrity();
      expect(tamperedRes.isValid).toBe(false);
      expect(tamperedRes.error).toContain('Tampered payload at event');
    });
  });
});
