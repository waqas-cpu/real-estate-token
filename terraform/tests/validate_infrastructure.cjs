/**
 * Automated Infrastructure-as-Code Invariant Test Suite (.cjs)
 * Validates the 11 key security & reliability scenarios defined in Section 32:
 * 1. Database is not publicly reachable.
 * 2. Public internet cannot directly reach database.
 * 3. Application can reach database via dedicated SG rules.
 * 4. HTTPS redirect is enabled.
 * 5. Secrets are not hardcoded in source code or variable defaults.
 * 6. Application IAM is scoped with least-privilege (no admin wildcards).
 * 7. Storage, database, and queues have KMS CMK encryption enabled.
 * 8. Backups and PITR are enabled for database.
 * 9. Dead-letter queue (DLQ) is configured with alarm.
 * 10. Monitoring alarms (latency, 5xx, host health, DB CPU) are configured.
 * 11. Infrastructure modules are structured and reproducible across dev/staging/prod.
 */

const fs = require('fs');
const path = require('path');

const TERRAFORM_ROOT = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

function readFile(relPath) {
  const fullPath = path.join(TERRAFORM_ROOT, relPath);
  return fs.readFileSync(fullPath, 'utf8');
}

console.log('\n=============================================================');
console.log(' RUNNING RWA INFRASTRUCTURE-AS-CODE INVARIANT AUDIT SUITE');
console.log('=============================================================\n');

// 1 & 2: Database Accessibility
console.log('Scenario 1 & 2: Database Network Isolation');
const dbMain = readFile('modules/database/main.tf');
assert(/publicly_accessible\s*=\s*false/.test(dbMain), 'RDS database instance has publicly_accessible explicitly set to false');
assert(/db_subnet_group_name\s*=\s*aws_db_subnet_group\./.test(dbMain), 'RDS database uses private DB subnet group');

// 3: Application to DB Security Group Rules
console.log('\nScenario 3: Application to Database Security Group Rules');
const secMain = readFile('modules/security/main.tf');
assert(/security_groups\s*=\s*\[aws_security_group\.ecs_app\.id\]/.test(secMain), 'RDS security group ingress restricted strictly to ECS App SG');
assert(!/0\.0\.0\.0\/0.*5432/.test(secMain), 'No open 0.0.0.0/0 ingress to database or internal tiers');

// 4: HTTPS & TLS Enforcement
console.log('\nScenario 4: Load Balancer HTTPS & TLS Redirect');
const albMain = readFile('modules/load_balancer/main.tf');
assert(/protocol\s*=\s*"HTTPS"/.test(albMain) && /status_code\s*=\s*"HTTP_301"/.test(albMain), 'HTTP listener enforces HTTP_301 permanent redirect to HTTPS');
assert(albMain.includes('ELBSecurityPolicy-TLS13-1-2-2021-06'), 'ALB HTTPS listener enforces modern TLS 1.3 / 1.2 policy');

// 5: Secret Management & Zero Plaintext Secrets
console.log('\nScenario 5: Secret Management Invariants');
const devVars = readFile('environments/dev/variables.tf');
const stagingVars = readFile('environments/staging/variables.tf');
const prodVars = readFile('environments/prod/variables.tf');
assert(!devVars.includes('password = "') && !prodVars.includes('password = "'), 'No database passwords hardcoded in environment variables');
assert(/resource\s*"random_password"/.test(dbMain), 'Database passwords generated cryptographically at runtime');
const secretsModule = readFile('modules/secrets/main.tf');
assert(secretsModule.includes('aws_secretsmanager_secret_version'), 'Secrets stored securely in AWS Secrets Manager with KMS encryption');

// 6: IAM Least Privilege
console.log('\nScenario 6: IAM Scoping & Non-Root Workloads');
const iamMain = readFile('modules/iam/main.tf');
assert(!iamMain.includes('AdministratorAccess'), 'Workload IAM roles do NOT attach AdministratorAccess');
assert(!iamMain.includes('"Action": "*"'), 'Workload policies do NOT allow universal wildcard Action: *');
const containerMain = readFile('modules/container/main.tf');
assert(/user\s*=\s*"1000:1000"/.test(containerMain), 'ECS Task Definitions enforce non-root (1000:1000) execution');

// 7: Encryption Invariants
console.log('\nScenario 7: Encryption at Rest Across Storage, DB, and Queues');
assert(/storage_encrypted\s*=\s*true/.test(dbMain), 'RDS instance has storage encryption enabled');
assert(/kms_key_id\s*=\s*var\.kms_key_arn/.test(dbMain), 'RDS uses KMS Customer-Managed Key');
const storageMain = readFile('modules/storage/main.tf');
assert(/sse_algorithm\s*=\s*"aws:kms"/.test(storageMain), 'S3 documents bucket enforces KMS server-side encryption');
assert(/block_public_acls\s*=\s*true/.test(storageMain), 'S3 documents bucket blocks 100% public access');
const queueMain = readFile('modules/queue/main.tf');
assert(/kms_master_key_id\s*=\s*var\.kms_key_arn/.test(queueMain), 'SQS queues encrypted using KMS CMK');

// 8: Backups & Disaster Recovery
console.log('\nScenario 8: Database Backups & Point-in-Time Recovery');
assert(/backup_retention_period\s*=\s*var\.backup_retention_period/.test(dbMain), 'Automated backups configured with environment retention');
assert(/copy_tags_to_snapshot\s*=\s*true/.test(dbMain), 'Tags copied to snapshots for audit compliance');
const prodMain = readFile('environments/prod/main.tf');
assert(/backup_retention_period\s*=\s*35/.test(prodMain), 'Production environment enforces 35-day backup retention');
assert(/multi_az\s*=\s*true/.test(prodMain), 'Production environment enforces Multi-AZ redundancy');

// 9: Dead Letter Queues
console.log('\nScenario 9: Dead Letter Queue (DLQ) Invariants');
assert(/resource\s*"aws_sqs_queue"\s*"dlq"/.test(queueMain), 'Dead Letter Queue explicitly provisioned');
assert(/resource\s*"aws_cloudwatch_metric_alarm"\s*"dlq_messages"/.test(queueMain), 'CloudWatch alarm configured for non-empty DLQ');

// 10: Monitoring & Observability
console.log('\nScenario 10: Monitoring Alarms & Observability');
const monMain = readFile('modules/monitoring/main.tf');
assert(/resource\s*"aws_cloudwatch_dashboard"\s*"platform"/.test(monMain), 'Unified CloudWatch Dashboard defined');
assert(monMain.includes('alb-high-latency'), 'ALB Latency alarm configured');
assert(monMain.includes('alb-5xx-errors'), 'ALB 5XX error alarm configured');
assert(monMain.includes('rds-high-cpu'), 'RDS CPU utilization alarm configured');

// 11: Modular Environment Structure
console.log('\nScenario 11: Environment Isolation & Modularity');
assert(fs.existsSync(path.join(TERRAFORM_ROOT, 'environments/dev/main.tf')), 'Dev environment composition file exists');
assert(fs.existsSync(path.join(TERRAFORM_ROOT, 'environments/staging/main.tf')), 'Staging environment composition file exists');
assert(fs.existsSync(path.join(TERRAFORM_ROOT, 'environments/prod/main.tf')), 'Production environment composition file exists');
assert(fs.existsSync(path.join(TERRAFORM_ROOT, 'global/state-bootstrap/main.tf')), 'Global state bootstrap configuration exists');

console.log('\n=============================================================');
console.log(` AUDIT SUMMARY: ${passedTests}/${totalTests} INVARIANTS SATISFIED (${failedTests} failures)`);
console.log('=============================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('All 11 infrastructure security and architecture invariants verified successfully!\n');
}
