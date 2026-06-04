# Mainnet — ERC-3643 (after testnet + audit)

Mainnet is **blocked in code** until you explicitly enable it (`ALLOW_MAINNET_DEPLOY=true`) and complete the steps below.

---

## Checklist before mainnet

| Step | Status |
|------|--------|
| Sepolia ERC-3643 UAT complete | `contracts/deployments/sepolia.json` |
| Off-chain smoke E2E on production Supabase | `npm run smoke:e2e` |
| Third-party audit of T-REX suite + RWA modules | Required |
| Legal / securities review | Required |
| Real USDC contract address (not MockUSDC) | Per chain |
| Production claim issuers (Sumsub / ONCHAINID) | Trusted issuers + claim topics |
| Production Pinata / oracles | Env vars in `backend/.env` |

---

## What changes from testnet

| Component | Testnet | Mainnet |
|-----------|---------|---------|
| Token standard | `@erc3643org/erc-3643` 4.1.3 | Same family, **audited** release tag |
| USDC | `MockUSDC` | Circle USDC on target chain |
| Identity | Agent-registered test wallets | Sumsub + ONCHAINID claims |
| Compliance | `RwaMaxBalanceModule` only | Add CountryRestrict, TimeTransfer, etc. |
| Infrastructure | `sepolia-infrastructure.json` | New `mainnet-infrastructure.json` |
| Backend flags | `ALLOW_MAINNET_DEPLOY=false` | Set `true` only after sign-off |

---

## Deploy flow (mainnet)

1. Pin audited contract versions in `contracts/package.json`.
2. Deploy infrastructure once:

   ```bash
   npx hardhat run scripts/deploy-sepolia.ts --network mainnet
   ```

   (Rename script or add `deploy-mainnet.ts` with `DEPLOY_NETWORK=mainnet` — same logic, different `deployments/mainnet.json`.)

3. Replace `MockUSDC` with real USDC address in offering constructor.
4. Configure claim topics + trusted issuers in `deployTREXSuite` `claimDetails`.
5. Register token via `POST /api/admin/tokenize` with mainnet addresses.
6. Set production `CORS_ORIGIN`, HTTPS, `VITE_API_BASE_URL`.

---

## Backend env (mainnet)

```env
NODE_ENV=production
ALLOW_SMART_CONTRACT_DEPLOY=true
ALLOW_MAINNET_DEPLOY=true   # only after audit + legal approval
CHAIN_DEPLOYMENT_FILE=./contracts/deployments/mainnet.json
```

Execution API will still warn that mainnet requires audited contracts — treat warnings as blocking until audit is complete.
