# Real Estate RWA Tokenization Platform — Master Technical Documentation

> **Enterprise-Grade Real-World Asset (RWA) Tokenization, Compliance, Blockchain Smart Contracts, Distributed Systems, and Cloud Infrastructure**

---

## Table of Contents
1. [Executive Summary & System Vision](#1-executive-summary--system-vision)
2. [Master Architecture & Component Topology](#2-master-architecture--component-topology)
3. [7-Layer Sovereign Separation of Concerns](#3-7-layer-sovereign-separation-of-concerns)
4. [Smart Contract & On-Chain Security Token Ecosystem](#4-smart-contract--on-chain-security-token-ecosystem)
5. [Backend Microservices & REST API Specification](#5-backend-microservices--rest-api-specification)
6. [Database Schema, PostgreSQL 16 & Audit Immutability](#6-database-schema-postgresql-16--audit-immutability)
7. [Frontend React SPA & Role-Based Workspaces](#7-frontend-react-spa--role-based-workspaces)
8. [Asynchronous Workers, Indexing & On-Chain/Off-Chain Reconciliation](#8-asynchronous-workers-indexing--on-chainoff-chain-reconciliation)
9. [Infrastructure as Code (IaC) & Cloud Architecture (AWS)](#9-infrastructure-as-code-iac--cloud-architecture-aws)
10. [DevSecOps, CI/CD Pipelines & Static Analysis](#10-devsecops-cicd-pipelines--static-analysis)
11. [Regulatory Compliance & Post-Quantum Cryptographic Security](#11-regulatory-compliance--post-quantum-cryptographic-security)
12. [Disaster Recovery, Business Continuity & SRE Runbooks](#12-disaster-recovery-business-continuity--sre-runbooks)
13. [Developer Setup & Local Development Runbook](#13-developer-setup--local-development-runbook)

---

## 1. Executive Summary & System Vision

The **Real Estate Real-World Asset (RWA) Tokenization Platform** is an enterprise-grade platform designed to bridge physical real estate investments with compliant digital securities. By combining compliant smart contract architectures (ERC-3643 / T-REX principles), post-quantum cryptographic security (ML-DSA-87 / FIPS 204), off-chain relational audit trails (PostgreSQL 16 with Row-Level Security), and immutable infrastructure provisioning (Terraform on AWS), the platform facilitates:

* **Fractionalization of Real Estate Assets**: Legally anchored through Special Purpose Vehicles (SPVs), deed verifications, and digital twins.
* **Institutional-Grade Compliance**: Continuous cross-jurisdictional enforcement across SEC Regulation D (506c) / Regulation S, EU MiCA (Markets in Crypto-Assets), UK FCA, and UAE VARA.
* **Autonomous Off-Chain / On-Chain Reconciliation**: Self-healing worker daemons verifying on-chain event integrity against off-chain ledgers.
* **Deterministic Multi-Environment Deployments**: Hermetic environments (`dev`, `staging`, `prod`) configured via Infrastructure-as-Code with automated drift detection.

---

## 2. Master Architecture & Component Topology

```
                                  [ INVESTORS / ISSUERS / COMPLIANCE OFFICERS ]
                                                       │
                                                       ▼ HTTPS (TLS 1.3)
                                          [ AWS Route 53 & ACM DNS ]
                                                       │
                                                       ▼
                                      [ Application Load Balancer ]
                                     (HTTP Port 80 -> 301 to Port 443)
                                                       │
                                ┌──────────────────────┴──────────────────────┐
                                │                                             │
                                ▼                                             ▼
                     [ React 18 TypeScript SPA ]                 [ Express REST API Gateway ]
                     - Lucide / Tailwind / Web3                  - JWT / PQC Auth Middleware
                     - Role-based Dashboard Views                - Route Controllers & Validation
                                                                              │
               ┌──────────────────────────────────────────────────────────────┼──────────────────────────────┐
               │                                                              │                              │
               ▼                                                              ▼                              ▼
    [ Off-Chain Postgres DB ]                                      [ AWS Secrets Manager ]        [ AWS S3 Documents ]
    - 7 Domain Schema Tables                                       - Dynamic RDS Credentials      - Deed PDFs (KMS Encrypted)
    - Row-Level Security (RLS)                                     - Post-Quantum Crypto Keys     - Valuation Reports
    - Soft-Delete & Auditing                                       - Blockchain Node Secrets      - Public Access Blocked
               ▲
               │
     ┌─────────┴────────────────────────────────┐
     │                                          │
     ▼                                          ▼
[ SQS Workload Queue ]               [ Blockchain Indexer Daemon ]
 - Asynchronous Job Dispatch          - Event Ingestion Checkpoints
 - Dead-Letter Queue (DLQ)            - Re-org Detection & Backfill
 - Visibility Timeout = 300s                    │
     │                                          │
     ▼                                          ▼
[ Background Reconciliation Worker ]  [ External Blockchain RPCs / Oracles ]
 - Balance Audit vs State             - Ethereum Mainnet / Sepolia
 - Transaction Finality Watchdog      - Chainlink Proof of Reserve (PoR)
 - DLQ Alert Notification                       │
                                                ▼
                                    [ EVM Smart Contracts ]
                                    - RwaComplianceRegistry.sol
                                    - PrimaryOfferingTREX.sol
                                    - RwaMultiSigAdmin.sol
                                    - RwaTimeLockupModule.sol
                                    - RwaPriceOracle.sol
```

---

## 3. 7-Layer Sovereign Separation of Concerns

To prevent data corruption, regulatory leakage, and blockchain state mutation vulnerabilities, the system adheres strictly to 7 decoupled architecture domains:

1. **Off-Chain Application/Database Layer**:
   - Manages relational state, operational metadata, user sessions, and property descriptions.
   - Built on Node.js/TypeScript and PostgreSQL 16 with ACID transaction rollbacks.
2. **Compliance / KYC / KYB Layer**:
   - Manages investor identities, accreditation tiers, PEP / sanctions screening, and geographic eligibility.
   - Off-chain verifiable credentials synced to on-chain compliance registries without exposing PII.
3. **Legal Ownership / SPV Layer**:
   - Stores corporate documentation, title deed verifications, appraisal summaries, and operating agreements.
   - Files are encrypted in S3 with KMS Customer-Managed Keys and hashed on-chain (`RwaTwinAnchor.sol`).
4. **Tokenization Layer**:
   - Translates physical asset economics (valuation, total shares, dividend yield) into digital share mechanics.
   - Governs primary issuance caps, minimum ticket sizes, and whitelisting.
5. **Blockchain / Smart-Contract Layer**:
   - The authoritative source of digital token balances, freeze mechanics, and compliant transfers.
   - Transactions execute only when compliance checks pass via modular transfer hooks.
6. **Marketplace / Investor Layer**:
   - Facilitates primary offerings, secondary order matching, wallet nonces, and order settlement.
7. **Audit / Event Reconciliation Layer**:
   - Immutable append-only transaction logs. Every database modification and smart-contract event records actor IDs, IP hashes, previous states, and transaction hashes.

---

## 4. Smart Contract & On-Chain Security Token Ecosystem

The smart contracts reside under [`contracts/src/rwa/`](file:///e:/Real%20estate%20tokenization%20final/real-estate-token/contracts/src/rwa) and are compiled with Hardhat/Foundry:

| Contract | Purpose | Core Invariants |
| :--- | :--- | :--- |
| **`RwaComplianceRegistry.sol`** | Manages investor whitelisting, KYC expiry, and country codes | Transfers fail if sender or recipient is unverified or expired. |
| **`PrimaryOfferingTREX.sol`** | Governs security token issuance in exchange for stablecoins (USDC) | Enforces cap, maximum investor allocations, and compliance gates. |
| **`RwaMultiSigAdmin.sol`** | M-of-N multisig governance for administrative contract operations | Prevents single-key compromise; requires multi-signature sign-off. |
| **`RwaTimeLockupModule.sol`** | Enforces statutory holding periods (e.g. 12-month Reg D lockup) | Restricts transfers until the timestamp exceeds lockup expiration. |
| **`RwaCountryRestrictModule.sol`**| OFAC / FATF jurisdictional transfer blocking | Rejects transactions involving restricted ISO country codes. |
| **`RwaMaxBalanceModule.sol`** | Prevents single-holder concentration limits | Rejects mints or transfers causing a wallet to exceed ownership thresholds. |
| **`RwaPriceOracle.sol`** | Aggregates off-chain appraisal and Chainlink PoR data | Rejects stale valuations older than heartbeat window (e.g., 24h). |
| **`RwaTwinAnchor.sol`** | Anchors IPFS cryptographic hashes of title deeds | Immutable hash anchoring for legal title verification. |

---

## 5. Backend Microservices & REST API Specification

The API is built in TypeScript with Express under [`backend/src/`](file:///e:/Real%20estate%20tokenization%20final/real-estate-token/backend/src):

### Core Endpoints

#### Authentication & User Management
* `POST /api/v1/auth/register` — Investor / Issuer registration with bcrypt hashing.
* `POST /api/v1/auth/login` — JWT token generation with post-quantum signature support.
* `GET /api/v1/auth/profile` — Verified profile status and permissions.

#### Properties & SPV Governance
* `GET /api/v1/properties` — Paginated property listings with financial yields and token metrics.
* `POST /api/v1/properties` — Create new RWA asset listing (Issuer / Admin only).
* `GET /api/v1/properties/:id` — Property digital twin, document manifests, and SPV details.
* `PUT /api/v1/properties/:id` — Update property valuation and operational metrics.

#### KYC / Compliance Services
* `POST /api/v1/compliance/verify` — Initiate identity verification (KYC/KYB, AML screening).
* `GET /api/v1/compliance/status` — Investor accreditation and jurisdiction whitelist status.
* `POST /api/v1/compliance/sync-chain` — Synchronize off-chain KYC approval to `RwaComplianceRegistry`.

#### Tokenization & Investment Operations
* `POST /api/v1/tokenization/tokenize` — Initialize security token deployment for an SPV.
* `POST /api/v1/investments/order` — Place primary offering investment order with USDC escrow.
* `GET /api/v1/investments/portfolio` — Current investor token holdings, dividend accruals, and lockups.

#### Observability & Health Probes
* `GET /health/live` — Liveness probe (verifies HTTP listener availability).
* `GET /health/ready` — Readiness probe (verifies PostgreSQL, Redis, and SQS connectivity).

---

## 6. Database Schema, PostgreSQL 16 & Audit Immutability

The persistence layer is structured into relational domains enforced via foreign key constraints, indexes, and soft-delete states:

```sql
-- High-level database entity model:
users               (id, email, password_hash, role, kyc_status, created_at)
properties          (id, title, spv_name, valuation_usd, token_address, is_active)
investments         (id, user_id, property_id, token_count, amount_usd, status)
compliance_records  (id, user_id, provider_ref, accreditation_tier, expires_at)
blockchain_txs      (id, tx_hash, block_number, event_type, status, reconciled)
audit_logs          (id, actor_id, action, resource, diff_payload, timestamp)
```

### Security Invariants
* **Non-Public Database**: RDS instances reside strictly inside private subnets (`publicly_accessible = false`).
* **Ingress Restriction**: Port 5432 is accessible exclusively from the ECS Fargate Application Security Group.
* **Storage Encryption**: All data volumes and automated backups are encrypted using AWS KMS Customer-Managed Keys (CMKs).
* **Automated Retention**: 35-day Point-in-Time Recovery (PITR) in production environments.

---

## 7. Frontend React SPA & Role-Based Workspaces

The client frontend is built with **React 18**, **TypeScript**, **Vite**, and **TailwindCSS** under [`src/`](file:///e:/Real%20estate%20tokenization%20final/real-estate-token/src):

* **Marketplace (`AssetMarketplace.tsx`)**: Property discovery catalog with fractional yields, token prices, and property galleries.
* **Investor Portfolio (`PortfolioPage.tsx`)**: Real-time asset balances, dividend claim interfaces, and lockup countdown timers.
* **KYC / Compliance Portal (`KYCPage.tsx`)**: Document upload workflow, accreditation verification, and proof of address.
* **SPV Governance (`GovernancePage.tsx`)**: Multi-sig proposal voting, capital expenditure authorizations, and dividend payouts.
* **Administrator Portal (`AdminPage.tsx`)**: Platform-wide metrics, contract pause switches, and reconciliation status indicators.

---

## 8. Asynchronous Workers, Indexing & On-Chain/Off-Chain Reconciliation

The asynchronous worker system manages tasks that cannot block the synchronous HTTP request-response cycle:

```
[ Blockchain Node ] ──► [ Indexer Daemon ] ──► [ SQS Tasks ] ──► [ Reconciliation Worker ] ──► [ PostgreSQL ]
                                                                             │
                                                                             ▼ (on failure > 5 tries)
                                                                    [ Dead Letter Queue ] ──► [ CloudWatch Alert ]
```

### Invariants Handled by Reconciliation Worker
1. **Event Completeness**: Verifies that every `Transfer`, `Mint`, and `Burn` event on-chain corresponds to an investment or distribution record in PostgreSQL.
2. **Balance Parity**: Compares `balanceOf(investor)` on-chain with off-chain ledger totals; triggers alerts upon discrepancies.
3. **Dead-Letter Forensic Auditing**: Failed jobs route to the DLQ with 14-day message retention for automated alerting via CloudWatch Alarms and SNS.

---

## 9. Infrastructure as Code (IaC) & Cloud Architecture (AWS)

Provisioned completely via Terraform (`>= 1.8.0`) under [`terraform/`](file:///e:/Real%20estate%20tokenization%20final/real-estate-token/terraform):

```
terraform/
├── modules/
│   ├── network/          # 3-tier VPC (Public, Private App, Private DB), IGW, NAT GWs
│   ├── security/         # Security groups & KMS Customer-Managed Key (CMK)
│   ├── iam/              # Least-privilege IAM roles (Task Execution, Backend, Worker)
│   ├── database/         # RDS PostgreSQL 16 (gp3 autoscaling, SSL, PITR backups)
│   ├── storage/          # S3 documents bucket (100% public block, KMS, Glacier lifecycle)
│   ├── secrets/          # AWS Secrets Manager with dynamic DB URL assembly
│   ├── container/        # ECS Cluster, Fargate services, ECR repos, autoscaling
│   ├── load_balancer/    # Application Load Balancer, HTTPS listener, health checks
│   ├── dns/              # Route53 DNS records & ACM certificate validation
│   ├── queue/            # SQS workload queue, Dead Letter Queue (DLQ), and alarms
│   ├── monitoring/       # CloudWatch Dashboards, latency/5xx/host alarms, SNS topic
│   └── blockchain/       # SSM Parameter Store hierarchy for contracts, chains & RPCs
├── environments/
│   ├── dev/              # Cost-conscious (1 NAT, t4g.medium, FARGATE_SPOT)
│   ├── staging/          # Staging replica (Multi-AZ RDS, 2 Fargate tasks)
│   └── prod/             # Enterprise HA (3 AZs, 3 NATs, r6g.xlarge RDS, 35-day PITR)
├── global/state-bootstrap/# Remote S3 state bucket + DynamoDB locks
└── tests/validate_infrastructure.cjs # Automated 11-scenario invariant audit suite
```

---

## 10. DevSecOps, CI/CD Pipelines & Static Analysis

Automated GitHub Actions workflows under [`.github/workflows/`](file:///e:/Real%20estate%20tokenization%20final/real-estate-token/.github/workflows):

1. **`ci.yml`**: Full-stack linting, TypeScript compilation, backend Vitest suites, and contract compilation.
2. **`terraform.yml`**: Terraform format check (`terraform fmt -check`), `tflint`, Checkov security analysis, and plan validation.
3. **`terraform-drift.yml`**: Scheduled daily drift detection scanning actual cloud state against declared Terraform templates.
4. **`contracts-deploy.yml`**: Automated smart contract deployment pipeline (separate from IaC infrastructure provisioning).
5. **`security.yml`**: Static vulnerability scanning (Trivy, npm audit, and CodeQL).

---

## 11. Regulatory Compliance & Post-Quantum Cryptographic Security

* **Multi-Jurisdictional Compatibility**:
  - **SEC Reg D (506c)**: Accreditation verification and 12-month transfer lockup enforcement.
  - **SEC Reg S**: Non-US resident verification and offshore transfer fencing.
  - **EU MiCA**: Digital asset whitepaper disclosure linkage and custody transparency.
* **Post-Quantum Cryptography (PQC)**:
  - Integration readiness for NIST FIPS 204 (ML-DSA-87) and FIPS 203 (ML-KEM-1024) digital signatures to mitigate future cryptanalytic risks to ledger finality.
* **GDPR & Privacy Isolation**:
  - Zero PII stored on-chain. Off-chain hashes anchor investor identity attestations.

---

## 12. Disaster Recovery, Business Continuity & SRE Runbooks

* **Recovery Point Objective (RPO)**: **< 5 minutes** (Continuous WAL archive streaming to S3).
* **Recovery Time Objective (RTO)**: **< 30 minutes** (Automated Multi-AZ failover and containerized task spinning).

### Emergency Incident Runbook: Database Snapshot Restoration
```bash
# 1. Restore RDS instance from point-in-time snapshot
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier rwa-platform-prod-pg-instance \
  --target-db-instance-identifier rwa-platform-prod-pg-restored \
  --restore-time "2026-09-04T12:00:00Z" \
  --db-subnet-group-name rwa-platform-prod-db-subnet-group \
  --vpc-security-group-ids sg-xxxxxx

# 2. Update Secrets Manager secret with new endpoint
aws secretsmanager update-secret \
  --secret-id rwa-platform/prod/database \
  --secret-string '{"url":"postgresql://postgres:...@rwa-platform-prod-pg-restored...:5432/rwa_db"}'

# 3. Trigger rolling restart of ECS services
aws ecs update-service \
  --cluster rwa-platform-prod-cluster \
  --service rwa-platform-prod-backend-api \
  --force-new-deployment
```

---

## 13. Developer Setup & Local Development Runbook

### Prerequisites
* **Node.js**: `>= 20.0.0`
* **Docker & Docker Compose**: `>= 24.0.0`
* **Terraform**: `>= 1.8.0`

### 1. Local Containerized Stack Launch
```bash
# Clone and enter workspace
git clone https://github.com/waqas-cpu/real-estate-token.git
cd real-estate-token

# Copy local development configuration
cp .env.example .env

# Launch entire platform (PostgreSQL, Backend API, Frontend SPA, Nginx)
docker compose -f docker-compose.yml up --build -d
```
Access endpoints:
* **Frontend UI**: `http://localhost:8080` (via Nginx reverse proxy) or `http://localhost:5173` (Vite dev)
* **Backend API**: `http://localhost:3001`
* **Health Check**: `http://localhost:3001/health/live`

### 2. Running Automated Tests & IaC Invariant Audit
```bash
# Run Backend unit & layer integration tests
cd backend && npm test

# Run Smart Contract test suite
cd ../contracts && npm test

# Run 11-Scenario Infrastructure-as-Code Invariant Audit
cd .. && node terraform/tests/validate_infrastructure.cjs
```
