# RWA Real Estate Tokenization Platform — Docker Architecture & Deployment Guide

This guide documents the enterprise containerization architecture, network segmentation, secrets management, and operational procedures for the Real-World Asset (RWA) real estate tokenization platform.

---

## 1. Container Architecture & Responsibilities

The platform is decomposed into 9 specialized, loosely-coupled containers following the principle of least privilege and single responsibility:

| Container | Image / Dockerfile | Purpose | Network Tiers | Port Exposure |
| :--- | :--- | :--- | :--- | :--- |
| **`rwa-reverse-proxy`** | `nginx:1.27-alpine` | Edge ingress, TLS termination, path routing, rate limiting | `rwa-public`, `rwa-app` | `8080` (or `80`/`443`) |
| **`rwa-frontend`** | `Dockerfile.frontend` | Static React 18 SPA served via unprivileged Nginx | `rwa-app` | *Internal only* |
| **`rwa-backend`** | `Dockerfile.backend` | Core Express REST API, compliance gate enforcement | `rwa-app`, `rwa-data` | *Internal only* (3001 in dev) |
| **`rwa-worker`** | `Dockerfile.worker` | AML velocity monitoring, compliance sweeps, audit batching | `rwa-data` | *Internal only* |
| **`rwa-indexer`** | `Dockerfile.indexer` | Event listener syncing ERC-3643 transfers from RPC | `rwa-data` | *Internal only* |
| **`rwa-oracle`** | `Dockerfile.oracle` | Appraisal feeder, heartbeat checks, 10% deviation guard | `rwa-data` | *Internal only* |
| **`rwa-postgres`** | `postgres:16-alpine` | Relational store for assets, SPVs, profiles, audit ledger | `rwa-data` | *Internal only* (5432 in dev) |
| **`rwa-redis`** | `redis:7-alpine` | In-memory cache, session store, message broker | `rwa-data` | *Internal only* (6379 in dev) |
| **`rwa-contracts`** | `contracts/Dockerfile` | Hardhat suite, local testnet node, Slither security audits | `rwa-data` | `8545` (dev only) |

---

## 2. Network Segmentation & Trust Boundaries

The container networking enforces strict physical isolation across three trust tiers:

```
[ INTERNET / CLIENTS ]
        │
        ▼
┌──────────────────────────────────────────────┐
│  rwa-public (Bridge)                         │
│  rwa-reverse-proxy (Public Ingress :80/:443) │
└──────────────────────┬───────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│  rwa-app (Bridge)       │ │  rwa-app (Bridge)       │
│  rwa-frontend (:80)     │ │  rwa-backend (:3001)    │
└─────────────────────────┘ └────────────┬────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼                                               ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│  rwa-data (Internal Bridge)     │             │  rwa-data (Internal Bridge)     │
│  rwa-worker / rwa-indexer       │             │  rwa-oracle                     │
└────────────────┬────────────────┘             └────────────────┬────────────────┘
                 │                                               │
                 ├───────────────────────┬───────────────────────┤
                 │                       │                       │
                 ▼                       ▼                       ▼
┌─────────────────────────────────┐ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐
│  rwa-data (Internal Bridge)     │ │  rwa-data (Internal Bridge)     │ │  rwa-data (Internal Bridge)     │
│  rwa-postgres (:5432)           │ │  rwa-redis (:6379)              │ │  rwa-contracts (:8545)          │
└─────────────────────────────────┘ └─────────────────────────────────┘ └─────────────────────────────────┘
```

### Security Properties of the Network Design:
1. **Zero Public Database Exposure**: `rwa-postgres` and `rwa-redis` join the `rwa-data` network, which is marked `internal: true`. They cannot be accessed from outside Docker and have no outbound internet routing.
2. **Reverse Proxy Shield**: All client traffic must pass through Nginx, which applies OWASP security headers, gzip compression, and rate limiting (20 req/s general, 5 req/s for sensitive administrative endpoints).
3. **No Direct Frontend-to-Database Path**: The frontend is a purely static bundle; all data operations go through authenticated REST endpoints on `rwa-backend`.

---

## 3. Quick Start Commands

### Local Production / Staging Simulation
```bash
# 1. Copy environment template
cp .env.docker .env

# 2. Build and start all services
docker compose up --build -d

# 3. View status and logs
docker compose ps
docker compose logs -f

# 4. Open in browser
http://localhost:8080
```

### Local Development (with Hot-Reloading & Local Hardhat Node)
```bash
# Start with developer overrides (mounts live src, exposes 5432, 6379, 8545)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Automated CI / Test Run
```bash
# Run isolated test containers and exit with status code
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-test
```

---

## 4. Secrets Management in Production

Never bake secrets, private keys, or passwords into container images or version control.

### Recommended Production Pattern (AWS / GCP / Kubernetes)
1. **HashiCorp Vault or AWS Secrets Manager**:
   - Store `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `DEPLOYER_PRIVATE_KEY`, `SUMSUB_APP_TOKEN`.
2. **Kubernetes External Secrets Operator (ESO)**:
   - Syncs secrets from cloud secrets managers directly into Kubernetes `Secret` objects at runtime.
3. **Runtime Injection**:
   - Inject secrets into container environments via `envFrom: - secretRef:` or mount them into `/var/run/secrets/`.

---

## 5. Database Migration & Persistence

- **Automated Initialization**: When `rwa-postgres` boots for the first time with an empty volume, `scripts/docker/init-postgres.sh` executes all migrations in `supabase/migrations/*.sql` in alphabetical/timestamp order.
- **Persistence**: Data resides in the Docker named volume `rwa-postgres-data`.

### Database Backup Command
```bash
docker exec -t rwa-postgres pg_dump -U rwa_user rwa_platform > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Database Restore Command
```bash
cat backup.sql | docker exec -i rwa-postgres psql -U rwa_user -d rwa_platform
```

---

## 6. Observability & Healthchecks

Every container features a deterministic Docker healthcheck:
- **`reverse-proxy`**: Checks Nginx process readiness.
- **`rwa-frontend`**: Probes `http://localhost:80/healthz`.
- **`rwa-backend`**: Probes `http://localhost:3001/health/live`.
- **`rwa-postgres`**: Probes `pg_isready -U rwa_user -d rwa_platform`.
- **`rwa-redis`**: Probes `redis-cli ping`.
