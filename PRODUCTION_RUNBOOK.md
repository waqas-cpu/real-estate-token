# Production Runbook — RWA Real Estate Tokenization

Turn the prototype into a live system using this checklist. Off-chain MVP can go live without smart contracts; on-chain requires your separate approval.

---

## Production readiness matrix

| Layer | Prototype | Production action |
|-------|-----------|-------------------|
| API server | Express on 3001 | Deploy Docker image or `npm run dev:backend` behind HTTPS |
| Database | SQL migrations in repo | Supabase project + `supabase db push` |
| Pipelines | Layer code + gates tested | Run `npm run smoke:e2e` after DB live |
| Token economics | 30k / USDC / 10% cap | `ALLOW_TOKEN_ECONOMICS_APPLY=true` |
| Smart contracts | ERC-3643 testnet ready | `npm run deploy:testnet` — mainnet: [DEPLOY_MAINNET.md](./DEPLOY_MAINNET.md) |
| IPFS / Oracles / PQC | Stubs | Integrate Pinata, Chainlink, liboqs for full compliance |

---

## Step 1 — Supabase (required)

1. Create project at [supabase.com](https://supabase.com).
2. Copy **Project URL**, **anon key**, **service_role key**.
3. Create `backend/.env`:

```env
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
CORS_ORIGIN=https://your-frontend.com
ALLOW_TOKEN_ECONOMICS_APPLY=true
ALLOW_SMART_CONTRACT_DEPLOY=false
AUDIT_API_CALLS=true
LOG_REQUESTS=true
```

4. Install [Supabase CLI](https://supabase.com/docs/guides/cli) and run from repo root:

```bash
supabase link --project-ref YOUR_REF
supabase db push
```

Migrations applied (in order):

- `001_rwa_tokenization_schema.sql`
- `002_offering_subscriptions.sql`
- `003_subscription_token_units.sql`

5. Enable **Auth** (email) and create issuer/admin users in dashboard.

---

## Step 2 — Verify backend

```bash
cd backend
npm install
npm run test          # 13+ unit tests (gates, pipeline, economics)
npm run smoke:e2e     # full DB pipeline (needs .env)
```

Health checks:

| URL | Use |
|-----|-----|
| `GET /health/live` | Liveness (always 200) |
| `GET /health/ready` | Readiness (200 only if Supabase OK) |
| `GET /health/deployment-checklist` | Rollout tracker |

---

## Step 3 — Deploy API

**Docker (recommended):**

```bash
# Copy backend/.env first
docker compose up --build -d
```

**Manual:**

```bash
cd backend && npm install && NODE_ENV=production npx tsx src/index.ts
```

Host behind nginx/Caddy with TLS. Set `CORS_ORIGIN` to your frontend URL.

---

## Step 4 — Deploy frontend

```bash
cp .env.example .env
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL=https://api.yourdomain.com
npm ci && npm run build
```

Deploy `dist/` to Vercel, Netlify, or S3+CloudFront.

---

## Step 5 — End-to-end issuer flow

1. User signs up (Supabase Auth) → JWT for API.
2. `POST /api/assets/pipeline` — ingest + intelligence + security.
3. `POST /api/admin/tokenize` — 30,000 tokens, `userConfirmedEconomics: true`.
4. `POST /api/offerings` — FMV-based USDC price.
5. `POST /api/offerings/:id/activate`
6. Investors: `POST /api/investments/subscribe` with `tokenCount` (max 3000).
7. `POST /api/offerings/:id/settle` — allocate tokens.
8. Monthly: `POST /api/distributions` with `grossRentUsdcMicro`.

Economics: see `backend/TOKEN_ECONOMICS.md`.

---

## Step 6 — Sepolia testnet (smart contracts)

See **[DEPLOY_TESTNET.md](./DEPLOY_TESTNET.md)** for full steps.

```bash
cd contracts && cp .env.example .env   # DEPLOYER_PRIVATE_KEY + SEPOLIA_RPC
npm run deploy:testnet
curl http://localhost:3001/api/blockchain/testnet
```

Keep `ALLOW_MAINNET_DEPLOY=false` until audit completes.

---

## Step 7 — Before real money / mainnet

- [ ] Third-party smart contract audit
- [ ] Deploy ERC-3643 + USDC escrow on testnet → mainnet
- [ ] Set `contract_address` via `/api/admin/tokenize`
- [ ] Real KYC provider (Sumsub/Onfido)
- [ ] IPFS pinning (Pinata)
- [ ] Sentry (`SENTRY_DSN`)
- [ ] Supabase backups + RLS review
- [ ] Legal: Reg D / MiCA disclosures

---

## What is production-ready today

- Full off-chain API and 4-layer pipelines with integration gates
- Platform token economics (30k, USDC, 10% cap, discount, monthly 90/10)
- Rate limiting, security headers, graceful shutdown
- CI (frontend build + backend tests)
- Docker + smoke E2E script

## What remains prototype

- On-chain settlement (by design until you approve)
- Simulated IPFS CIDs, oracle attestations, PQC/ZK proofs
- KYC document upload endpoint (501)

---

**Support endpoints:** `/health/deployment-checklist` · `/api/token-economics/platform-policy`
