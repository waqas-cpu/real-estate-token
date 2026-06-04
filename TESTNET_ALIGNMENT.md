# Testnet → Mainnet Alignment Guide

Same codebase, two profiles via **`RWA_NETWORK_PROFILE`** (`testnet` | `mainnet`).

## Quick start (testnet)

```bash
# 1. Database (migrations 001–005)
supabase db push

# 2. Backend
cp backend/.env.example backend/.env
# RWA_NETWORK_PROFILE=testnet
# ALLOW_TOKEN_ECONOMICS_APPLY=true
# INTELLIGENCE_AUTO_APPROVE=true   # optional; testnet defaults auto-approve

# 3. Contracts (Sepolia)
cd contracts && cp .env.example .env
npm run deploy:sepolia

# 4. Anchor twin CID on-chain (after pipeline ingest)
npm run anchor:twin -- --assetId <uuid> --cid <ipfs-cid>
# Then: POST /api/anchors/twin/:assetId/confirm { "txHash": "0x..." }

# 5. Full pipeline
npm run smoke:e2e --prefix backend
```

## Profile differences

| Area | Testnet | Mainnet |
|------|---------|---------|
| `RWA_NETWORK_PROFILE` | `testnet` (default) | `mainnet` |
| Intelligence approval | Auto-approve default | Human approval required |
| Twin on-chain gate | Pending anchor + contract OK | Must be `anchored` + `txHash` |
| External APIs | Fixtures if keys missing | Live APIs required |
| ERC-3643 deploy | `npm run deploy:sepolia` | Audit + `ALLOW_MAINNET_DEPLOY` |
| API contract deploy | Instructions only | Blocked until policy + audit |
| ZK verifier | `RwaZkVerifierStub` from deploy | UltraPlonk / Noir (replace stub) |
| PQC seeds | Ephemeral OK | `PQC_PLATFORM_SEED` / `PQC_ORACLE_SEED` from HSM |

## External truth sources

| Integration | Env (live) | Testnet fallback |
|-------------|------------|------------------|
| Land registry | `HM_LAND_REGISTRY_URL`, `TORRENS_API_URL`, `CADASTER_API_URL` | `src/lib/integrations/registry.ts` fixtures |
| Oracles | `CHAINLINK_API_KEY`, `PYTH_API_KEY`, optional `*_VALUATION_URL` | Signed ML-DSA fixture feeds |
| MLS comps | `MLS_API_URL` | `src/lib/integrations/mlsComps.ts` |
| IPFS | `PINATA_JWT` or `PINATA_API_KEY` | Simulated `Qm…` CID |

## On-chain anchors

| Contract | Deployed in | Purpose |
|----------|---------------|---------|
| `RwaTwinAnchor` | `sepolia-infrastructure.json` → `twinAnchor` | IPFS CID per asset |
| `RwaZkVerifierStub` | `zkVerifierStub` | Testnet ZK credential verifier address |
| ERC-3643 T-REX | `sepolia.json` per property | Token + offering |

## Regulatory (testnet tables — migration 005)

- **FATF Travel Rule:** `POST /api/regulatory/travel-rule/draft`, `/submit`
- **Accreditation:** `POST /api/regulatory/accreditation/check`
- **Multi-jurisdiction:** `POST /api/regulatory/jurisdiction-check`
- **Profile:** `GET /api/regulatory/profile`

## Mainnet cutover checklist

1. Set `RWA_NETWORK_PROFILE=mainnet`
2. Configure all live API URLs and Pinata
3. HSM PQC ceremony seeds in `.env`
4. Replace `RwaZkVerifierStub` with audited verifier contract
5. Complete third-party contract audit
6. `ALLOW_MAINNET_DEPLOY=true` only after sign-off
7. Enforce intelligence human approval (`INTELLIGENCE_REQUIRE_HUMAN_APPROVAL=true`)

See also: [DEPLOY_TESTNET.md](./DEPLOY_TESTNET.md), [DEPLOY_MAINNET.md](./DEPLOY_MAINNET.md), [BACKEND_INTEGRATION_STATUS.md](./BACKEND_INTEGRATION_STATUS.md).
