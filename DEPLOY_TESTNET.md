# Sepolia Testnet — ERC-3643 (T-REX)

**Testnet uses the official [ERC-3643 / T-REX](https://github.com/ERC-3643/ERC-3643) stack (`@erc3643org/erc-3643` v4.1.3).** Mainnet requires a separate audited deployment — see [DEPLOY_MAINNET.md](./DEPLOY_MAINNET.md).

---

## Prerequisites

| Item | Action |
|------|--------|
| Sepolia ETH | Faucet for deployer wallet |
| `backend/.env` | Supabase keys + `ALLOW_TOKEN_ECONOMICS_APPLY=true` |
| `contracts/.env` | `DEPLOYER_PRIVATE_KEY`, `SEPOLIA_RPC_URL` |
| Migrations | `supabase db push` |

---

## 1. Deploy ERC-3643 on Sepolia

```bash
cd contracts
cp .env.example .env
# Edit .env — NEVER commit private key

npm install
npm run compile
npm run test
npm run deploy:sepolia
```

**First run** deploys shared T-REX infrastructure → `contracts/deployments/sepolia-infrastructure.json`.

**Each property** deploy writes `contracts/deployments/sepolia.json`:

| Field | Role |
|-------|------|
| `contracts.rwaToken` | ERC-3643 `Token` (30k supply, 0 decimals) |
| `contracts.identityRegistry` | ONCHAINID / investor registry |
| `contracts.modularCompliance` | Modular compliance bound to token |
| `contracts.maxBalanceModule` | 3,000 tokens max per investor (10%) |
| `contracts.primaryOffering` | USDC primary sale + 10% full-stake discount |
| `contracts.mockUsdc` | Test USDC (6 decimals) |

### On-chain rules (match off-chain policy)

- Fixed supply: **30,000**
- Max per investor: **3,000** via `RwaMaxBalanceModule`
- Price: `DEPLOY_FMV_USD / 30000` in USDC micro-units
- Full stake discount: **10%** on 3,000 tokens
- Testnet KYC: investors registered in `IdentityRegistry` (no claim topics required)

Optional env:

```env
DEPLOY_FMV_USD=3000000
DEPLOY_TOKEN_SYMBOL=RWAT
DEPLOY_SALT=rwa-property-001
```

---

## 2. Register in backend

```bash
# backend/.env
ALLOW_SMART_CONTRACT_DEPLOY=true
# ALLOW_MAINNET_DEPLOY=false
```

```bash
curl http://localhost:3001/api/blockchain/testnet
curl http://localhost:3001/api/blockchain/testnet/register-hint?symbol=RWAT
```

`POST /api/admin/tokenize` (authenticated):

```json
{
  "assetId": "<uuid>",
  "symbol": "RWAT",
  "totalSupply": "30000",
  "contractAddress": "<rwaToken>",
  "trexIdentityRegistry": "<identityRegistry>",
  "complianceModules": ["ERC-3643", "MaxBalanceModule:3000", "USDC"],
  "userConfirmedEconomics": true
}
```

---

## 3. On-chain subscribe (testnet)

1. Deploy script registers deployer + offering in `IdentityRegistry`.
2. Register each investor wallet (agent call) before `subscribe`.
3. `mockUsdc.approve(primaryOffering, amount)`
4. `primaryOffering.subscribe(tokenCount)` — max 3,000

Mirror off-chain: `POST /api/investments/subscribe` with the same `tokenCount`.

---

## 4. Twin CID on-chain anchor

After `deploy:sepolia`, infrastructure includes `twinAnchor` and `zkVerifierStub`.

```bash
# After POST /api/assets/ingest or full pipeline — use asset UUID + twin CID
npm run anchor:twin --prefix contracts -- --assetId <uuid> --cid <ipfs-cid>

curl -X POST http://localhost:3001/api/anchors/twin/<uuid>/confirm \
  -H "Authorization: Bearer <jwt>" \
  -d '{"txHash":"0x..."}'
```

Pipeline stores pending anchor automatically; confirming moves gate to **anchored** (required on mainnet profile).

---

## 5. Optional integrations (testnet fixtures if unset)

| Service | Env var |
|---------|---------|
| Profile | `RWA_NETWORK_PROFILE=testnet` |
| Pinata IPFS | `PINATA_JWT` |
| Chainlink / Pyth | `CHAINLINK_API_KEY`, `PYTH_API_KEY` |
| MLS comps | `MLS_API_URL` |
| Registries | `HM_LAND_REGISTRY_URL`, etc. |
| KYC / regulatory | `POST /api/kyc/*`, `POST /api/regulatory/*` |
| Sumsub | `SUMSUB_*` |

See **[TESTNET_ALIGNMENT.md](./TESTNET_ALIGNMENT.md)**.

---

## 6. Mainnet path

See **[DEPLOY_MAINNET.md](./DEPLOY_MAINNET.md)** — do not reuse Sepolia bytecode.

```bash
npm run deploy:testnet     # from repo root
npm run smoke:e2e
npm run test:backend
```
