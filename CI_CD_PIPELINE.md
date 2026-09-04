# Real Estate Tokenization — Enterprise CI/CD Pipeline Documentation

This document describes the automated Continuous Integration and Continuous Delivery (CI/CD) pipelines configured for the **Real Estate Tokenization (RWA) Platform** via GitHub Actions.

---

## 🏛️ Pipeline Architecture

The platform uses 4 dedicated, decoupled GitHub Actions workflows located in `.github/workflows/`:

```
.github/workflows/
├── ci.yml                 # Continuous Integration, Database Migrations Gate & E2E Orchestration
├── security.yml           # Automated Security SAST & Multi-Container Vulnerability Scans
├── cd-publish.yml         # Multi-service container release & GHCR deployment publisher
└── contracts-deploy.yml   # ERC-3643 smart contract deployment & verification
```

```mermaid
flowchart TD
    subgraph Triggers
        PR[Pull Request]
        Push[Push to main/master/develop]
        Tag[Tag v*.*.*]
        Cron[Weekly Schedule]
        Manual[Manual Dispatch]
    end

    subgraph "CI Pipeline (.github/workflows/ci.yml)"
        J1[Lint & Code Style]
        J2[Frontend Typecheck & Build]
        J3[Backend Vitest & Typecheck]
        J4[Hardhat ERC-3643 Compile & Test]
        J5[Database Migrations Validation (Postgres 16)]
        J6[Multi-Container Orchestration & Smoke Test]
        Gate[CI Gate Status Check]

        J1 --> Gate
        J2 --> Gate
        J3 --> Gate
        J4 --> Gate
        J5 --> Gate
        J6 --> Gate
    end

    subgraph "Security Pipeline (.github/workflows/security.yml)"
        S1[npm audit]
        S2[GitHub CodeQL SAST]
        S3[Aqua Security Trivy Backend & Frontend Scans]
    end

    subgraph "CD Release (.github/workflows/cd-publish.yml)"
        CD0[Preflight Database Migrations Validation]
        CD1[Build & Publish Frontend Container]
        CD2[Build & Publish Backend Container]
        CD3[Build & Publish Indexer Daemon]
        CD4[Build & Publish Oracle Daemon]
        CD5[Build & Publish Worker Daemon]
        CD6[Build & Publish Contracts Container]
        CD7[Generate Production Release Manifest Bundle]

        CD0 --> CD1 & CD2 & CD3 & CD4 & CD5 & CD6
        CD1 & CD2 & CD3 & CD4 & CD5 & CD6 --> CD7
    end

    subgraph "Contract Deployment (.github/workflows/contracts-deploy.yml)"
        D1[Compile & Run Preflight Tests]
        D2[Deploy to Sepolia / Localnet]
        D3[Archive Deployment Artifacts]
    end

    PR --> J1 & J2 & J3 & J4 & J5 & J6
    Push --> J1 & J2 & J3 & J4 & J5 & J6
    Push --> CD0
    Tag --> CD0
    Cron --> S1 & S2 & S3
    Manual --> D1
```

---

## 1. Continuous Integration (`ci.yml`)

### Triggers & Concurrency
- **Triggers**: Pushes and Pull Requests targeting `main`, `master`, and `develop`.
- **Concurrency**: `cancel-in-progress: true` guarantees outdated commits in a branch are immediately terminated, saving compute minutes.

### Jobs & Gates
| Job Name | Path / Context | Purpose |
| :--- | :--- | :--- |
| **`lint`** | Root | Runs ESLint (`npm run lint`) to maintain code quality across frontend, backend, and scripts. |
| **`frontend`** | Root | Validates TypeScript typing (`npm run typecheck`), creates production bundle (`npm run build`), and saves `dist/` as an artifact. |
| **`backend`** | `backend/` | Validates backend TypeScript (`npm run typecheck`), executes the Vitest suite covering Off-chain pipeline, Integration Gates, PQC cryptography (ML-DSA-87, ML-KEM-1024), Token Economics, and the new RWA CRUD architecture. |
| **`contracts`** | `contracts/` | Compiles Solidity contracts (0.8.17 / 0.8.20) with Hardhat and runs the complete ERC-3643 (T-REX) compliance test suite with MockUSDC. |
| **`migrations-validate`** | `supabase/migrations/` | Spins up a clean **PostgreSQL 16** service container, applies all 9 migrations sequentially via `scripts/migrate.sh`, asserts table schema integrity, and validates idempotent re-execution. |
| **`platform-orchestration-e2e`** | Multi-Container | Builds all microservice images (`frontend`, `backend`, `indexer`, `oracle`, `worker`, `contracts`), runs `docker-compose.test.yml`, verifies container healthcheck `/health/live`, and executes Trivy security scans. |
| **`ci-gate`** | All jobs | Unified aggregation check that fails if any job fails or is cancelled. This is the **primary check** required by GitHub branch protection. |

---

## 2. Security & Vulnerability Scanning (`security.yml`)

### Triggers
- Weekly schedule on Monday at 04:00 UTC (`cron: "0 4 * * 1"`).
- On pushes and pull requests to `main` and `master`.
- Manual trigger via `workflow_dispatch`.

### Capabilities
- **Dependency Audit**: Inspects `package.json` and lockfiles across root, backend, and contracts for high/critical security advisories via `npm audit`.
- **CodeQL Analysis**: Static Application Security Testing (SAST) targeting JavaScript/TypeScript code to detect injection vulnerabilities, weak cryptographic usages, and tainted data flow.
- **Trivy Container Scan**: Scans both backend (`Dockerfile.backend`) and frontend (`Dockerfile.frontend`) Docker images against Aqua Security's vulnerability database and uploads SARIF reports to GitHub Security.

---

## 3. Container Continuous Delivery & Release (`cd-publish.yml`)

### Triggers
- Push to `main` or `master`.
- Version tags formatted as `v*.*.*` (e.g. `v1.0.0`).
- Manual trigger via `workflow_dispatch` with environment selection (`staging` or `production`).

### Multi-Service Shipping Matrix
Builds and publishes each decoupled microservice container to **GitHub Container Registry (`ghcr.io`)**:

| Service | Dockerfile | Published GHCR Image |
| :--- | :--- | :--- |
| **Frontend** | `Dockerfile.frontend` | `ghcr.io/<owner>/<repo>/frontend:<tag>` |
| **Backend API** | `Dockerfile.backend` | `ghcr.io/<owner>/<repo>/backend:<tag>` |
| **Blockchain Indexer** | `Dockerfile.indexer` | `ghcr.io/<owner>/<repo>/indexer:<tag>` |
| **Oracle Ingestion** | `Dockerfile.oracle` | `ghcr.io/<owner>/<repo>/oracle:<tag>` |
| **Compliance Worker** | `Dockerfile.worker` | `ghcr.io/<owner>/<repo>/worker:<tag>` |
| **Smart Contracts** | `contracts/Dockerfile` | `ghcr.io/<owner>/<repo>/contracts:<tag>` |
| **Monolith (All-in-One)** | `Dockerfile` | `ghcr.io/<owner>/<repo>/platform:<tag>` |

### Release Manifest Generation
Generates a production release bundle containing `docker-compose.prod.yml`, `.env.example`, and `RELEASE_MANIFEST.md` pinned with immutable digests.

---

## 4. Smart Contract Deployment (`contracts-deploy.yml`)

### Triggers
- Triggered manually on demand via **Actions > Deploy Smart Contracts > Run workflow**.
- Inputs: `network` (`sepolia`, `localhost`), `dry_run`, `token_symbol`, `fmv_usd`.
- Automatically archives generated deployment metadata (`contracts/deployments/*-infrastructure.json`) as a downloadable workflow artifact.

---

## 💻 Running Equivalent Checks Locally

```bash
# 1. Validate Database Migrations
npm run test:migrations

# 2. Run Backend Vitest & CRUD Suite
npm run test:backend

# 3. Compile & Test Smart Contracts
npm run contracts:compile
npm run contracts:test

# 4. Full Platform Preflight Check
npm run validate:platform

# 5. Multi-Container Orchestration Testbed
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit
```
