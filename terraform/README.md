# Real Estate RWA Tokenization Platform — Infrastructure as Code (IaC)

This directory contains the production-grade, modular, auditable, and multi-environment **Terraform** architecture for provisioning and operating the Real Estate RWA Tokenization Platform on AWS.

---

## 1. High-Level Architecture Diagram

```
                              [ Public Internet ]
                                      │
                                      ▼
                        [ Route 53 DNS / ACM TLS 1.3 ]
                                      │
                                      ▼
             [ Application Load Balancer (Public Subnets, Multi-AZ) ]
                 - HTTP Port 80 -> Permanent HTTP_301 Redirect to HTTPS
                 - HTTPS Port 443 -> Forward to Backend Target Group
                                      │
         ┌────────────────────────────┴────────────────────────────┐
         │                                                         │
         ▼                                                         ▼
 [ Private App Subnet AZ-1 ]                               [ Private App Subnet AZ-2 ]
  - Backend API (ECS Fargate)                               - Backend API (ECS Fargate)
  - Worker Daemon (ECS Fargate)                             - Worker Daemon (ECS Fargate)
  - Non-root UID:GID 1000:1000                              - Non-root UID:GID 1000:1000
         │                                                         │
         ├────────────────────────────┬────────────────────────────┤
         ▼                            ▼                            ▼
  [ AWS Secrets Manager ]     [ AWS SQS Tasks + DLQ ]      [ Encrypted S3 Bucket ]
   - DB Credentials (auto)     - Event & Tx indexing        - Property deed PDFs
   - JWT / PQC Crypto keys     - Reconciliation tasks       - Valuation reports
   - Blockchain RPC endpoints  - DLQ Depth Alarm            - Lifecycle Glacier transition
         │
         ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │                  Private Database Subnets (Multi-AZ)            │
 │                                                                 │
 │   [ Primary RDS PostgreSQL 16 ] ◄──── Sync ────► [ Standby RDS] │
 │    - KMS CMK Storage Encryption                    (Failover)   │
 │    - Ingress ONLY from ECS App Security Group                   │
 │    - Automated Backups & PITR (35 days in prod)                 │
 │    - Parameter Group: rds.force_ssl=1, statement_timeout=30s    │
 └─────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ (Egress via NAT Gateways)
                      [ External Blockchain RPCs / Oracles ]
                       - Ethereum Mainnet / Sepolia Testnet
                       - Chainlink Proof of Reserve (PoR)
```

---

## 2. Terraform Repository Structure

```
terraform/
├── .tflint.hcl                 # Linter ruleset enforcing tagging and security practices
├── README.md                   # Complete architectural, operations & DR manual
│
├── modules/                    # Reusable, version-controlled Terraform modules
│   ├── network/                # 3-tier VPC, subnets, IGW, NAT GWs, route tables, S3 endpoint
│   ├── security/               # Security groups (ALB, ECS, RDS) & KMS Customer-Managed Key
│   ├── iam/                    # Least-privilege IAM roles (Task Execution, API, Worker)
│   ├── database/               # RDS PostgreSQL 16 (gp3 autoscaling, SSL, PITR backups)
│   ├── storage/                # S3 documents bucket (100% public block, KMS, Glacier lifecycle)
│   ├── secrets/                # AWS Secrets Manager with dynamic DB URL assembly
│   ├── container/              # ECS Cluster, Fargate services, ECR repos, autoscaling
│   ├── load_balancer/          # Application Load Balancer, HTTPS listener, health checks
│   ├── dns/                    # Route53 DNS records & ACM automated certificate validation
│   ├── queue/                  # SQS workload queue, Dead Letter Queue (DLQ), and alarms
│   ├── monitoring/             # CloudWatch Dashboards, latency/5xx/host alarms, SNS topic
│   └── blockchain/             # SSM Parameter Store hierarchy for contracts, chains & RPCs
│
├── environments/               # Isolated per-environment deployments
│   ├── dev/                    # Cost-optimized: 1 NAT, t4g.medium RDS, Fargate Spot
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── versions.tf
│   │   └── terraform.tfvars.example
│   ├── staging/                # Pre-production replica: Multi-AZ RDS, 2 Fargate tasks
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── versions.tf
│   │   └── terraform.tfvars.example
│   └── prod/                   # Enterprise HA: 3 AZs, multi-NAT, r6g.xlarge RDS, 35-day PITR
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       ├── versions.tf
│       └── terraform.tfvars.example
│
├── global/
│   └── state-bootstrap/        # Initializer for remote S3 state bucket + DynamoDB locks
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
│
└── tests/
    ├── validate_infrastructure.cjs  # Automated 11-scenario security invariant audit
    └── terraform_test.go           # Go Terratest integration plan test suite
```

---

## 3. Environment Strategy

| Dimension | Development (`dev`) | Staging (`staging`) | Production (`prod`) |
| :--- | :--- | :--- | :--- |
| **VPC CIDR** | `10.10.0.0/16` | `10.20.0.0/16` | `10.30.0.0/16` |
| **Availability Zones** | 2 | 2 | 3 (High Availability) |
| **NAT Gateways** | 1 (Cost-conscious) | 1 | 3 (1 per AZ dedicated) |
| **RDS Instance Class** | `db.t4g.medium` | `db.t4g.large` | `db.r6g.xlarge` |
| **RDS Storage** | 20 GB – 50 GB gp3 | 50 GB – 100 GB gp3 | 100 GB – 500 GB gp3 |
| **RDS Multi-AZ** | Disabled | Enabled | Enabled (Sync Standby) |
| **RDS Backup Retention** | 7 Days | 14 Days | 35 Days (Max PITR) |
| **ECS API Sizing** | 256 CPU / 512 MB (1 Task) | 512 CPU / 1024 MB (2 Tasks) | 1024 CPU / 2048 MB (4–16 Tasks) |
| **Compute Capacity** | FARGATE_SPOT | FARGATE | FARGATE Dedicated |
| **Blockchain Target** | Sepolia Testnet (11155111) | Sepolia / Goerli | Ethereum Mainnet (1) |
| **Deletion Protection**| Disabled | Enabled | Enabled (ALB, RDS, S3) |

---

## 4. Deployment Procedure

### Prerequisites
1. Install `terraform >= 1.8.0`.
2. Configure AWS credentials via AWS CLI or AWS Vault (`aws sts get-caller-identity`).

### Step 1: Bootstrap Remote State Infrastructure (One-Time Execution)
```bash
cd terraform/global/state-bootstrap
terraform init
terraform apply
```
*Note the output `state_bucket_name` and `dynamodb_table_name`.*

### Step 2: Initialize Target Environment
Uncomment the `backend "s3"` block in `terraform/environments/<env>/versions.tf` and update the bucket name.
```bash
cd terraform/environments/dev
terraform init
```

### Step 3: Plan and Apply
```bash
# Copy and adapt configuration variables
cp terraform.tfvars.example terraform.tfvars

# Generate and inspect execution plan
terraform plan -out=tfplan

# Apply execution plan deterministically
terraform apply tfplan
```

---

## 5. Rollback Procedure

1. **ECS Service Rollback**:
   To immediately rollback to a previous application container release:
   ```bash
   aws ecs update-service \
     --cluster rwa-platform-prod-cluster \
     --service rwa-platform-prod-backend-api \
     --task-definition rwa-platform-prod-backend-api:<PREVIOUS_REVISION>
   ```
2. **Terraform Infrastructure Rollback**:
   - Revert the offending commit on git `main`.
   - CI/CD will generate a new `terraform plan` showing resource modifications or destructions.
   - Upon peer approval and merge, `terraform apply` restores state to the prior tested declaration.

---

## 6. Disaster Recovery & Business Continuity (BC/DR)

- **Recovery Point Objective (RPO)**: **< 5 minutes** via Continuous WAL Streaming and RDS Point-in-Time Recovery.
- **Recovery Time Objective (RTO)**: **< 30 minutes** for database failover and automated ECS task provisioning.

### Database Recovery Runbook
To restore a point-in-time snapshot to a new instance:
```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier rwa-platform-prod-pg-xxxxx \
  --target-db-instance-identifier rwa-platform-prod-pg-restored \
  --restore-time "2026-09-04T12:00:00Z" \
  --db-subnet-group-name rwa-platform-prod-db-subnet-group \
  --vpc-security-group-ids sg-xxxxxx
```
Once restored, update Secrets Manager secret `rwa-platform/prod/database` with the new host endpoint; ECS tasks will automatically reconnect without code redeployment.

---

## 7. Secret Management Model

- **Zero Plaintext Secrets**: No passwords, private keys, or API tokens reside in Git or Terraform state files.
- **Cryptographic Generation**: Master database passwords are generated via `random_password` and piped directly into `aws_secretsmanager_secret_version`.
- **Runtime ECS Mounting**: Fargate injects secrets into containers at launch via native ECS Task Definition `secrets` directives referencing AWS Secrets Manager ARNs.
- **Separation of Keys**: Testnet RPC secrets and Mainnet custody keys reside in isolated secret paths (`rwa-platform/dev/*` vs `rwa-platform/prod/*`).

---

## 8. IAM Least-Privilege Model

1. **ECS Task Execution Role (`rwa-platform-<env>-ecs-exec-role`)**:
   - Strictly scoped to pull images from ECR (`ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage`).
   - Write stream logs to CloudWatch (`logs:CreateLogStream`, `logs:PutLogEvents`).
   - Decrypt configuration secrets from Secrets Manager using the designated KMS CMK.
2. **Backend API Task Role (`rwa-platform-<env>-backend-task-role`)**:
   - Read and write permission strictly bounded to `arn:aws:s3:::rwa-platform-<env>-documents-*`.
   - Send messages to `arn:aws:sqs:*:*:rwa-platform-<env>-tasks`.
   - Cannot administer EC2, RDS, VPC, or IAM.
3. **Worker Task Role (`rwa-platform-<env>-worker-task-role`)**:
   - Receive, delete, and inspect messages on SQS task and dead-letter queues.
   - Read legal artifacts for automated OCR, KYC, or reconciliation.

---

## 9. Monitoring & Observability Architecture

- **Unified Operations Dashboard**: Single pane of glass tracking ALB request rate, p99 latency, 2xx/4xx/5xx codes, ECS task CPU & Memory, and RDS IOPS/Connections.
- **Automated Metric Alarms**:
  - `alb-high-latency`: Triggers if latency > 1.5s over 2 evaluation periods.
  - `alb-5xx-errors`: Triggers if 5xx error responses > 10 in 60 seconds.
  - `alb-zero-healthy-hosts`: Critical alarm if backend targets become unavailable.
  - `rds-high-cpu`: Triggers if PostgreSQL CPU sustained > 80%.
  - `dlq-non-empty`: Critical alarm if background indexing or reconciliation tasks fail and enter the Dead Letter Queue.
- **SNS Integration**: All alarms publish to `rwa-platform-<env>-alerts` for PagerDuty, Slack, or webhook ingestion.

---

## 10. Cost Optimization Model

- **Development**:
  - Employs a single NAT Gateway instead of 2 (saving ~$32/month).
  - ECS tasks leverage `FARGATE_SPOT` capacity provider (up to 70% cost savings).
  - Single-AZ RDS PostgreSQL `db.t4g.medium` with automatic storage growth up to 50 GB.
- **Staging**:
  - Scaled down task count with Multi-AZ RDS for integration and performance testing.
- **Production**:
  - Dedicated Multi-AZ Fargate compute, 3 independent NAT Gateways, multi-AZ `db.r6g.xlarge` RDS instance with memory-optimized Graviton processors for high-throughput RWA ledger transactions.

---

## 11. Security Model & DevSecOps Scanning

- **Checkov Static Analysis**: Integrates with `.github/workflows/terraform.yml` to prevent public storage, overly permissive IAM, and unencrypted databases.
- **TFLint**: Enforces Terraform standard practices, variable conventions, and mandatory governance tagging (`Project`, `Environment`, `ManagedBy`).
- **Network Segmentation**:
  - Tier 1 (Public): ALB only.
  - Tier 2 (Private App): ECS tasks only (accessible solely from ALB SG).
  - Tier 3 (Private DB): RDS PostgreSQL only (accessible solely from ECS SG on port 5432).

---

## 12. Developer Setup & Automated Testing

To run the automated 11-scenario infrastructure invariant audit suite locally:

```bash
# Run invariant test suite (node / npm)
node terraform/tests/validate_infrastructure.cjs
```

Sample audit output:
```
=============================================================
 RUNNING RWA INFRASTRUCTURE-AS-CODE INVARIANT AUDIT SUITE
=============================================================

Scenario 1 & 2: Database Network Isolation
  [PASS] RDS database instance has publicly_accessible explicitly set to false
  [PASS] RDS database uses private DB subnet group

Scenario 3: Application to Database Security Group Rules
  [PASS] RDS security group ingress restricted strictly to ECS App SG
  [PASS] No open 0.0.0.0/0 ingress to database or internal tiers

Scenario 4: Load Balancer HTTPS & TLS Redirect
  [PASS] HTTP listener enforces HTTP_301 permanent redirect to HTTPS
  [PASS] ALB HTTPS listener enforces modern TLS 1.3 / 1.2 policy

Scenario 5: Secret Management Invariants
  [PASS] No database passwords hardcoded in environment variables
  [PASS] Database passwords generated cryptographically at runtime
  [PASS] Secrets stored securely in AWS Secrets Manager with KMS encryption

Scenario 6: IAM Scoping & Non-Root Workloads
  [PASS] Workload IAM roles do NOT attach AdministratorAccess
  [PASS] Workload policies do NOT allow universal wildcard Action: *
  [PASS] ECS Task Definitions enforce non-root (1000:1000) execution

Scenario 7: Encryption at Rest Across Storage, DB, and Queues
  [PASS] RDS instance has storage encryption enabled
  [PASS] RDS uses KMS Customer-Managed Key
  [PASS] S3 documents bucket enforces KMS server-side encryption
  [PASS] S3 documents bucket blocks 100% public access
  [PASS] SQS queues encrypted using KMS CMK

Scenario 8: Database Backups & Point-in-Time Recovery
  [PASS] Automated backups configured with environment retention
  [PASS] Tags copied to snapshots for audit compliance
  [PASS] Production environment enforces 35-day backup retention
  [PASS] Production environment enforces Multi-AZ redundancy

Scenario 9: Dead Letter Queue (DLQ) Invariants
  [PASS] Dead Letter Queue explicitly provisioned
  [PASS] CloudWatch alarm configured for non-empty DLQ

Scenario 10: Monitoring Alarms & Observability
  [PASS] Unified CloudWatch Dashboard defined
  [PASS] ALB Latency alarm configured
  [PASS] ALB 5XX error alarm configured
  [PASS] RDS CPU utilization alarm configured

Scenario 11: Environment Isolation & Modularity
  [PASS] Dev environment composition file exists
  [PASS] Staging environment composition file exists
  [PASS] Production environment composition file exists
  [PASS] Global state bootstrap configuration exists

=============================================================
 AUDIT SUMMARY: 31/31 INVARIANTS SATISFIED (0 failures)
=============================================================
```
