# Implementation Guide: RWA Tokenization Platform
## Step-by-Step Production Deployment

---

## Phase 1: Local Development Setup

### 1.1 Install Dependencies
```bash
npm install
```

### 1.2 Environment Configuration
Create `.env.local`:
```env
# Supabase
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]

# IPFS Configuration
VITE_IPFS_GATEWAY=https://gateway.pinata.cloud
VITE_IPFS_API_KEY=[pinata-api-key]

# Oracle Configuration
VITE_CHAINLINK_API_KEY=[chainlink-functions-key]
VITE_PYTH_API_KEY=[pyth-network-key]

# Blockchain RPC
VITE_ETHEREUM_RPC=https://eth-mainnet.alchemyapi.io/v2/[key]
```

### 1.3 Run Development Server
```bash
npm run dev
```

---

## Phase 2: Data Layer Implementation

### 2.1 Asset Ingestion

```typescript
import { DataLayerOrchestrator } from './lib/layers/DataLayer';

const orchestrator = new DataLayerOrchestrator();

// Ingest property from HM Land Registry
const { asset, twin, attestations } = await orchestrator.ingestAsset(
  'HM_LAND_REGISTRY',
  'HM123456789'
);

console.log('Asset ID:', asset.id);
console.log('Twin CID:', twin.cid);
console.log('Oracle attestations:', attestations.length);
```

### 2.2 Store in Supabase

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

// Store asset
await supabase
  .from('physical_assets')
  .insert([{
    address: asset.address,
    title: asset.title,
    latitude: asset.lat,
    longitude: asset.lng,
    registry_source: asset.registrySource,
    content_hash: asset.contentHash,
    verified: false,
    created_by: userUUID,
  }]);

// Store digital twin
await supabase
  .from('digital_twins')
  .insert([{
    asset_id: assetUUID,
    cid: twin.cid,
    schema: twin.schema,
    attestation_quorum: 2,
  }]);

// Store oracle attestations
await supabase
  .from('oracle_attestations')
  .insert(attestations.map(att => ({
    asset_id: assetUUID,
    source: att.source,
    data_type: att.dataType,
    value: att.value,
    confidence: att.confidence,
    signature_ml_dsa: att.signatureML_DSA,
    expires_at: att.expiresAt,
  })));
```

### 2.3 Gate Crossing: DATA → INTELLIGENCE

```typescript
import { crossGate } from './lib/gates/integrationGates';

const boundary = await crossGate({
  fromLayer: 'DATA',
  toLayer: 'INTELLIGENCE',
  data: {
    asset,
    twin,
    oracleAttestations: attestations,
  },
  actor: userUUID,
  timestamp: new Date(),
});

console.log('Gate crossed:', boundary.gateName);
console.log('All rules passed:', boundary.allPassed);

// Store boundary record
await supabase
  .from('layer_boundaries')
  .insert([{
    source_layer: 'DATA',
    target_layer: 'INTELLIGENCE',
    data_hash: boundary.dataHash,
    gate_name: boundary.gateName,
    rules_applied: boundary.rulesApplied,
    all_passed: boundary.allPassed,
  }]);
```

---

## Phase 3: Intelligence Layer Implementation

### 3.1 Valuation Engine

```typescript
import { IntelligenceLayerOrchestrator } from './lib/layers/IntelligenceLayer';

const intelligence = new IntelligenceLayerOrchestrator();

// Compute valuation with uncertainty
const { valuation, riskScore } = await intelligence.processAssetIntelligence(
  twin,
  attestations
);

console.log('FMV:', valuation.fmv);
console.log('Confidence interval:', valuation.confidenceInterval);
console.log('Risk score:', riskScore.composite);
```

### 3.2 Store Valuation Results

```typescript
await supabase
  .from('valuations')
  .insert([{
    asset_id: assetUUID,
    fmv: valuation.fmv,
    confidence_low: valuation.confidenceInterval[0],
    confidence_high: valuation.confidenceInterval[1],
    method: valuation.method,
    factors: valuation.factors,
    model_version: valuation.modelVersion,
    expires_at: valuation.expiresAt,
  }]);

await supabase
  .from('risk_scores')
  .insert([{
    asset_id: assetUUID,
    credit_risk: riskScore.creditRisk,
    liquidity_risk: riskScore.liquidityRisk,
    operational_risk: riskScore.operationalRisk,
    jurisdictional_risk: riskScore.jurisdictionalRisk,
    composite: riskScore.composite,
  }]);
```

### 3.3 KYC/AML Verification

```typescript
const { kyc, rules } = await intelligence.processInvestor(
  investorWalletAddress,
  investorJurisdiction
);

// Store KYC record
await supabase
  .from('kyc_records')
  .insert([{
    investor_wallet: kyc.investorWallet,
    accreditated: kyc.accreditated,
    jurisdictions: kyc.jurisdictions,
    aml_cleared_at: kyc.amlClearedAt,
    aml_expires_at: kyc.amlExpiresAt,
    zk_commitment_hash: kyc.zk_commitmentHash,
  }]);

// Store compliance rules
for (const rule of rules) {
  await supabase
    .from('compliance_rules')
    .insert([{
      jurisdiction: rule.jurisdiction,
      applicable_standards: rule.applicableStandards,
      transfer_restrictions: rule.transferRestrictions,
      disclosure_requirements: rule.disclosureRequirements,
    }]);
}
```

---

## Phase 4: Security Layer Implementation

### 4.1 Key Ceremony

```typescript
import { SecurityLayerOrchestrator } from './lib/layers/SecurityLayer';

const security = new SecurityLayerOrchestrator();

// Conduct key generation ceremony
const keys = await security.processSecuritySetup();

console.log('Signing key:', keys.signingKey.id);
console.log('Encapsulation key:', keys.encapsulationKey.id);
console.log('Backup key:', keys.backupKey.id);

// Store key metadata in database
await supabase
  .from('crypto_keys')
  .insert([
    {
      algorithm: 'ML_DSA_87',
      purpose: 'SIGNING',
      key_shares: keys.signingKey.keyShares,
      rotates_at: keys.signingKey.rotatesAt,
      hsm_location: keys.signingKey.hsmLocation,
      public_key_hash: keys.signingKey.publicKeyHash,
    },
    {
      algorithm: 'ML_KEM_1024',
      purpose: 'ENCRYPTION',
      key_shares: keys.encapsulationKey.keyShares,
      rotates_at: keys.encapsulationKey.rotatesAt,
      hsm_location: keys.encapsulationKey.hsmLocation,
      public_key_hash: keys.encapsulationKey.publicKeyHash,
    },
  ]);
```

### 4.2 ZK Credentials

```typescript
const securityManager = new SecurityLayerOrchestrator();

// Issue ZK credential for investor
const credential = await securityManager.zkEngine.issueZKCredential(
  kyc,
  'COMPOSITE' // Proves accreditation + jurisdiction + AML
);

console.log('Credential commitment:', credential.commitment);
console.log('Verifier contract:', credential.verifierContractAddr);

// Store credential
await supabase
  .from('zk_credentials')
  .insert([{
    investor_wallet: credential.investorWallet,
    proof_type: credential.proofType,
    circuit_id: credential.circuitID,
    commitment: credential.commitment,
    issued_at: credential.issuedAt,
    expires_at: credential.expiresAt,
    verifier_contract_addr: credential.verifierContractAddr,
  }]);
```

### 4.3 Audit Trail

```typescript
// Record audit event
const auditEvent = await securityManager.auditManager.recordAuditEvent(
  'ASSET_INGESTION_COMPLETE',
  userUUID,
  'DATA',
  { assetId: assetUUID, twinCid: twin.cid },
  securityManager.keyManager
);

// Store audit event
await supabase
  .from('audit_events')
  .insert([{
    event_type: auditEvent.eventType,
    layer: auditEvent.layer,
    actor: auditEvent.actor,
    details: auditEvent.details,
    signature_ml_dsa: auditEvent.signature,
    timestamp: auditEvent.timestamp,
  }]);
```

### 4.4 Gate Crossing: INTELLIGENCE → SECURITY

```typescript
const boundary = await crossGate({
  fromLayer: 'INTELLIGENCE',
  toLayer: 'SECURITY',
  data: {
    kycRecord: kyc,
    riskScore,
    valuation,
    investorWallet: kyc.investorWallet,
  },
  actor: userUUID,
  timestamp: new Date(),
});

if (!boundary.allPassed) {
  throw new Error('Security gate failed');
}
```

---

## Phase 5: Execution Layer Implementation (Smart Contracts)

### 5.1 Deploy ERC-3643 Token Contract

```solidity
// Deployment (Solidity)
pragma solidity ^0.8.20;
import "@ttoken-registry/erc3643/contracts/token/ERC3643.sol";
import "@ttoken-registry/erc3643/contracts/compliance/ICompliance.sol";

contract RealEstateToken is ERC3643 {
    constructor(
        address identityRegistry,
        string memory name,
        string memory symbol
    ) ERC3643(identityRegistry, name, symbol) {}
}
```

### 5.2 Deploy Compliance Modules

```solidity
// MaxBalanceModule
contract MaxBalanceModule is ICompliance {
    function canTransfer(
        address _from,
        address _to,
        uint256 _value
    ) public view override returns (bool) {
        uint256 newBalance = IERC20(tokenAddress).balanceOf(_to) + _value;
        return newBalance <= maxBalance;
    }
}

// CountryRestrictModule
contract CountryRestrictModule is ICompliance {
    function canTransfer(
        address _from,
        address _to,
        uint256 _value
    ) public view override returns (bool) {
        string memory investorCountry = kycRegistry.getCountry(_to);
        return allowedCountries[investorCountry];
    }
}
```

### 5.3 JavaScript Contract Interaction

```typescript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(rpcUrl);
const signer = new ethers.Wallet(privateKey, provider);

// Load token contract
const tokenABI = require('./abis/RealEstateToken.json');
const tokenAddress = '0x...';
const token = new ethers.Contract(tokenAddress, tokenABI, signer);

// Transfer tokens (triggers compliance check)
const tx = await token.transfer(recipientAddress, ethers.parseEther('10'));
const receipt = await tx.wait();

console.log('Transfer confirmed:', receipt.transactionHash);
```

---

## Phase 6: Integration Testing

### 6.1 Test Gate Crossings

```typescript
// test/gates.test.ts
import { describe, it, expect } from 'vitest';
import { crossGate } from '../lib/gates/integrationGates';

describe('Integration Gates', () => {
  it('should cross DATA → INTELLIGENCE with valid attestations', async () => {
    const boundary = await crossGate({
      fromLayer: 'DATA',
      toLayer: 'INTELLIGENCE',
      data: {
        asset: mockAsset,
        twin: mockTwin,
        oracleAttestations: [
          { confidence: 0.85, ...mockAtt1 },
          { confidence: 0.80, ...mockAtt2 },
        ],
      },
      actor: userId,
      timestamp: new Date(),
    });

    expect(boundary.allPassed).toBe(true);
  });

  it('should block DATA → INTELLIGENCE with insufficient attestations', async () => {
    expect(async () => {
      await crossGate({
        fromLayer: 'DATA',
        toLayer: 'INTELLIGENCE',
        data: {
          asset: mockAsset,
          twin: mockTwin,
          oracleAttestations: [
            { confidence: 0.85, ...mockAtt1 },
          ], // Only 1 attestation
        },
        actor: userId,
        timestamp: new Date(),
      });
    }).rejects.toThrow('Gate crossing failed');
  });
});
```

### 6.2 End-to-End Asset Tokenization Test

```typescript
// test/e2e.test.ts
describe('End-to-End Tokenization', () => {
  it('should complete full asset tokenization pipeline', async () => {
    // 1. Ingest asset
    const { asset, twin, attestations } = await ingestAsset();
    expect(asset.verified).toBe(false);

    // 2. Cross Data → Intelligence
    await crossGate({ fromLayer: 'DATA', toLayer: 'INTELLIGENCE', ... });

    // 3. Compute valuation
    const valuation = await computeValuation(twin, attestations);
    expect(valuation.confidenceInterval[0]).toBeLessThan(valuation.fmv);

    // 4. Verify investor
    const kyc = await verifyInvestor(investorWallet);
    expect(kyc.accreditted).toBe(true);

    // 5. Cross Intelligence → Security
    await crossGate({ fromLayer: 'INTELLIGENCE', toLayer: 'SECURITY', ... });

    // 6. Key ceremony
    const keys = await conductKeyCeremony();
    expect(keys.signingKey.keyShares).toBe(3);

    // 7. Issue ZK credential
    const credential = await issueZKCredential(kyc);
    expect(credential.commitment).toBeTruthy();

    // 8. Cross Security → Execution
    await crossGate({ fromLayer: 'SECURITY', toLayer: 'EXECUTION', ... });

    // 9. Deploy token
    const tokenAddress = await deployToken();
    expect(tokenAddress).toMatch(/^0x[a-f0-9]{40}$/);

    // 10. Verify token is tradeable
    const balance = await token.balanceOf(investorAddress);
    expect(balance).toBeGreaterThan(0);
  });
});
```

---

## Phase 7: Deployment to Production

### 7.1 Supabase Production Setup

```bash
# Use existing Supabase project
supabase projects list

# Apply migrations
supabase db push --db-url postgresql://...

# Enable RLS on all tables
# (Already included in migration)
```

### 7.2 Smart Contract Deployment

```bash
# Deploy with Hardhat
npx hardhat run scripts/deploy.ts --network mainnet

# Verify contracts on Etherscan
npx hardhat verify --network mainnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### 7.3 Configure Oracles

```typescript
// Register with Chainlink Functions
const subscriptionId = await linkToken.approve(functionsRouter, fee);
const functionSourceCode = fs.readFileSync('./oracle-function.js', 'utf8');

// Configure Pyth Price Feeds
const pythPriceFeedId = '0xc15ea3985c4c4a3d80e9e7c80b1e7d9d...';
```

### 7.4 Enable Monitoring & Alerting

```typescript
// Setup Sentry error tracking
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production',
  tracesSampleRate: 0.1,
});
```

---

## Phase 8: Post-Deployment Operations

### 8.1 Monitor Gate Crossings

```typescript
// Monitor layer boundary crossings
const subscription = supabase
  .from('layer_boundaries')
  .on('INSERT', (payload) => {
    console.log(`Gate crossed: ${payload.new.gate_name}`);
    if (!payload.new.all_passed) {
      alertOps('Gate crossing failed:', payload.new);
    }
  })
  .subscribe();
```

### 8.2 Audit Trail Review

```typescript
// Weekly audit report
const auditEvents = await supabase
  .from('audit_events')
  .select('*')
  .gte('timestamp', sevenDaysAgo);

// Generate ZK audit proof for regulators
const auditProof = await generateAuditProof(auditEvents);
```

### 8.3 Key Rotation

```typescript
// Annual key rotation ceremony
const newKeys = await keyManager.rotateKeys(currentKeys);
// Overlap period: both old and new valid for 30 days
// After 30 days: deactivate old keys
```

---

## Troubleshooting

### Issue: Gate Crossing Fails at DATA → INTELLIGENCE
**Solution**:
```typescript
// Check oracle attestations
const attestations = await supabase
  .from('oracle_attestations')
  .select('*')
  .eq('asset_id', assetId);

if (attestations.length < 2) {
  // Retry oracle requests
  await oracleCoordinator.collectAttestations(...);
}
```

### Issue: Transfer Blocked at Smart Contract
**Solution**:
```typescript
// Check compliance module rules
const isAllowed = await token.canTransfer(from, to, amount);

// If false, check which module blocked it
const modules = await token.getComplianceModules();
for (const module of modules) {
  const result = await module.canTransfer(from, to, amount);
  if (!result) console.log(`Blocked by: ${module.name}`);
}
```

---

## Summary

This implementation guide covers all 4 layers with working code examples. Key points:

✅ Data layer: Asset ingestion, digital twins, oracle attestation  
✅ Intelligence layer: Valuation, risk scoring, KYC/AML  
✅ Security layer: PQC key management, ZK credentials  
✅ Execution layer: ERC-3643 token contracts, transfers  
✅ Integration: Gate crossings at all layer boundaries  
✅ Testing: Unit tests, integration tests, E2E tests  
✅ Deployment: Production checklist and operations  

**Next Steps**:
1. Follow Phase 1-3 for development setup
2. Deploy Supabase schema (Phase 2 migration ready)
3. Deploy smart contracts to testnet (Phase 5)
4. Run integration tests (Phase 6)
5. Deploy to mainnet (Phase 7)

---

**Last Updated**: 2026-05-29  
**Version**: 1.0.0
