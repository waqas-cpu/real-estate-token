/**
 * Maps ARCHITECTURE.md Part 5 (8-phase deployment checklist) to trackable status.
 * Used by GET /health/deployment-checklist for production rollouts.
 */

export interface ChecklistItem {
  id: string;
  label: string;
  phase: number;
  status: 'done' | 'partial' | 'blocked' | 'manual';
  notes: string;
}

export function getDeploymentChecklist(): ChecklistItem[] {
  return [
    // Phase 1: Database & Infrastructure
    {
      id: 'P1_SUPABASE',
      label: 'Supabase project provisioned',
      phase: 1,
      status: 'partial',
      notes: 'Migration 001_rwa_tokenization_schema ready; apply via supabase db push',
    },
    {
      id: 'P1_MIGRATIONS',
      label: 'All migrations applied (001–005)',
      phase: 1,
      status: 'partial',
      notes: 'Includes 005_testnet_alignment (twin anchors, travel rule, accreditation)',
    },
    {
      id: 'P1_RLS',
      label: 'RLS policies enabled',
      phase: 1,
      status: 'done',
      notes: 'Defined in migration; backend uses service role for orchestration',
    },
    {
      id: 'P1_BACKUP',
      label: 'Backup strategy configured',
      phase: 1,
      status: 'manual',
      notes: 'Enable in Supabase dashboard for production project',
    },
    // Phase 2: Off-Chain Services
    {
      id: 'P2_IPFS',
      label: 'IPFS pinning configured',
      phase: 2,
      status: 'partial',
      notes: 'Pinata when PINATA_JWT set; else simulated CID',
    },
    {
      id: 'P2_REGISTRY',
      label: 'Land registry APIs integrated',
      phase: 2,
      status: 'done',
      notes: 'registry.ts fixtures on testnet; HM_LAND_REGISTRY_URL etc. for mainnet',
    },
    {
      id: 'P2_ORACLES',
      label: 'Chainlink / Pyth oracles configured',
      phase: 2,
      status: 'done',
      notes: 'oracles.ts ML-DSA signed feeds; live when CHAINLINK_/PYTH_ keys set',
    },
    // Phase 3: PQC
    {
      id: 'P3_PQC',
      label: 'NIST PQC (@noble/post-quantum ML-DSA-87, ML-KEM-1024, SLH-DSA)',
      phase: 3,
      status: 'done',
      notes:
        'SecurityLayer + oracle attestations + L2 settlement intents; set PQC_PLATFORM_SEED / PQC_ORACLE_SEED from HSM for production',
    },
    {
      id: 'P3_HSM',
      label: 'HSM key ceremony verified',
      phase: 3,
      status: 'manual',
      notes: 'Conduct air-gapped 5-party ceremony before mainnet',
    },
    // Phase 4: ZK
    {
      id: 'P4_NOIR',
      label: 'Noir circuits compiled',
      phase: 4,
      status: 'partial',
      notes: 'ZKCredentialEngine prototype; mainnet requires Noir + Barretenberg',
    },
    {
      id: 'P4_ULTRAPLONK',
      label: 'UltraPlonk verifiers deployed',
      phase: 4,
      status: 'partial',
      notes: 'Testnet: RwaZkVerifierStub via deploy:sepolia; mainnet: audited verifier',
    },
    // Phase 5: Smart Contracts
    {
      id: 'P5_TOKEN_ECONOMICS',
      label: 'Token economics approved by issuer',
      phase: 5,
      status: 'done',
      notes: '30k tokens, USDC, 10% cap, discount, yield — platformTokenEconomics.ts',
    },
    {
      id: 'P5_TESTNET_CONTRACTS',
      label: 'Sepolia testnet contracts',
      phase: 5,
      status: 'partial',
      notes: 'npm run deploy:testnet — RWAToken + MockUSDC + PrimaryOffering (see DEPLOY_TESTNET.md)',
    },
    {
      id: 'P5_ERC3643',
      label: 'ERC-3643 T-REX testnet deployed',
      phase: 5,
      status: 'partial',
      notes: 'Code + npm run deploy:sepolia ready; mainnet blocked until audit (ALLOW_MAINNET_DEPLOY)',
    },
    {
      id: 'P5_TWIN_ANCHOR',
      label: 'Twin CID on-chain anchor (RwaTwinAnchor)',
      phase: 5,
      status: 'partial',
      notes: 'npm run anchor:twin after pipeline; POST /api/anchors/twin/:id/confirm',
    },
    {
      id: 'P5_COMPLIANCE',
      label: 'Compliance modules on-chain',
      phase: 5,
      status: 'partial',
      notes: '10% max wallet in RWASecurityToken.sol on Sepolia',
    },
    {
      id: 'P5_AUDIT',
      label: 'Contracts audited',
      phase: 5,
      status: 'manual',
      notes: 'Third-party audit required before mainnet',
    },
    // Phase 6: Integration Testing
    {
      id: 'P6_GATE_TESTS',
      label: 'Gate crossing unit tests',
      phase: 6,
      status: 'done',
      notes: 'Run: npm run test --prefix backend',
    },
    {
      id: 'P6_E2E',
      label: 'End-to-end tokenization test',
      phase: 6,
      status: 'partial',
      notes: 'Off-chain pipeline tests pass; DB E2E requires Supabase + migrations 001-003',
    },
    {
      id: 'P6_PIPELINE_TESTS',
      label: 'Layer pipeline unit tests (DATA→EXECUTION)',
      phase: 6,
      status: 'done',
      notes: 'npm run test:backend — gates, economics, pipeline.offchain',
    },
    // Phase 7: Regulatory
    {
      id: 'P7_MICA',
      label: 'MiCA / Reg D / FCA / VARA / MAS mapping',
      phase: 7,
      status: 'partial',
      notes: 'ComplianceRuleEngine loads jurisdiction rules',
    },
    {
      id: 'P7_FATF',
      label: 'FATF Travel Rule implementation',
      phase: 7,
      status: 'done',
      notes: 'travel_rule_packets + POST /api/regulatory/travel-rule/* (testnet IVMS-101 draft)',
    },
    // Phase 8: Production Hardening
    {
      id: 'P8_RATE_LIMIT',
      label: 'API rate limiting',
      phase: 8,
      status: 'done',
      notes: 'express-rate-limit on /api/*',
    },
    {
      id: 'P8_AUDIT',
      label: 'Comprehensive audit logging',
      phase: 8,
      status: 'done',
      notes: 'Request audit middleware + audit_events table',
    },
    {
      id: 'P8_MONITORING',
      label: 'Monitoring & alerting',
      phase: 8,
      status: 'partial',
      notes: 'Set SENTRY_DSN; use /health/ready for probes',
    },
    {
      id: 'P8_API',
      label: 'Production API server',
      phase: 8,
      status: 'done',
      notes: 'backend/ Express service on PORT 3001',
    },
  ];
}
