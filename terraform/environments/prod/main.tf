/**
 * Production Environment - Infrastructure Composition
 * High-Availability, Fault-Tolerant, Encrypted Multi-AZ Production Infrastructure
 * for the Real Estate RWA Tokenization Platform.
 */

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  # 3 Availability Zones for true multi-AZ resilience in Production
  selected_azs = slice(data.aws_availability_zones.available.names, 0, 3)
  tags = {
    Project            = var.project_name
    Environment        = "prod"
    ManagedBy          = "terraform"
    DataClassification = "confidential-financial"
  }
}

# ── 1. Networking (3-AZ VPC, Dedicated NAT Gateway per AZ, Route Tables) ────
module "network" {
  source = "../../modules/network"

  project_name       = var.project_name
  environment        = "prod"
  vpc_cidr           = var.vpc_cidr
  availability_zones = local.selected_azs
  single_nat_gateway = false # High Availability: NAT Gateway in every AZ
  tags               = local.tags
}

# ── 2. Security (KMS Customer-Managed Key & Strict Security Groups) ──────────
module "security" {
  source = "../../modules/security"

  project_name = var.project_name
  environment  = "prod"
  vpc_id       = module.network.vpc_id
  tags         = local.tags
}

# ── 3. Database (Multi-AZ RDS PostgreSQL 16 with 35-Day PITR Backups) ────────
module "database" {
  source = "../../modules/database"

  project_name            = var.project_name
  environment             = "prod"
  private_db_subnet_ids   = module.network.private_db_subnet_ids
  rds_security_group_id   = module.security.rds_security_group_id
  kms_key_arn             = module.security.kms_key_arn
  instance_class          = var.db_instance_class
  allocated_storage       = var.db_allocated_storage
  max_allocated_storage   = var.db_max_allocated_storage
  multi_az                = true
  backup_retention_period = 35 # Maximum retention for regulatory audit compliance
  deletion_protection     = true
  tags                    = local.tags
}

# ── 4. Storage (Encrypted S3 Bucket with Lifecycle Archival to Glacier) ──────
module "storage" {
  source = "../../modules/storage"

  project_name = var.project_name
  environment  = "prod"
  kms_key_arn  = module.security.kms_key_arn
  tags         = local.tags
}

# ── 5. Secrets (AWS Secrets Manager) ─────────────────────────────────────────
module "secrets" {
  source = "../../modules/secrets"

  project_name        = var.project_name
  environment         = "prod"
  kms_key_arn         = module.security.kms_key_arn
  db_host             = split(":", module.database.db_endpoint)[0]
  db_port             = module.database.db_port
  db_name             = module.database.db_name
  db_username         = module.database.db_username
  db_password         = module.database.db_password
  blockchain_network  = var.blockchain_network
  tags                = local.tags
}

# ── 6. Asynchronous Queue (SQS + DLQ) ────────────────────────────────────────
module "queue" {
  source = "../../modules/queue"

  project_name = var.project_name
  environment  = "prod"
  kms_key_arn  = module.security.kms_key_arn
  tags         = local.tags
}

# ── 7. IAM Roles & Least-Privilege Policies ──────────────────────────────────
module "iam" {
  source = "../../modules/iam"

  project_name            = var.project_name
  environment             = "prod"
  kms_key_arn             = module.security.kms_key_arn
  documents_bucket_arn    = module.storage.documents_bucket_arn
  queue_arn               = module.queue.queue_arn
  db_secret_arn           = module.secrets.db_secret_arn
  app_security_secret_arn = module.secrets.app_security_secret_arn
  blockchain_secret_arn   = module.secrets.blockchain_secret_arn
  tags                    = local.tags
}

# ── 8. Ingress Load Balancer (ALB with TLS & Deletion Protection) ─────────────
module "load_balancer" {
  source = "../../modules/load_balancer"

  project_name          = var.project_name
  environment           = "prod"
  vpc_id                = module.network.vpc_id
  public_subnet_ids     = module.network.public_subnet_ids
  alb_security_group_id = module.security.alb_security_group_id
  certificate_arn       = module.dns.certificate_arn
  tags                  = local.tags
}

# ── 9. DNS & TLS (Route53 & ACM) ─────────────────────────────────────────────
module "dns" {
  source = "../../modules/dns"

  domain_name  = var.domain_name
  subdomain    = var.subdomain
  alb_dns_name = module.load_balancer.alb_dns_name
  alb_zone_id  = module.load_balancer.alb_zone_id
  tags         = local.tags
}

# ── 10. Container Platform (ECS Fargate HA with Auto-scaling) ────────────────
module "container" {
  source = "../../modules/container"

  project_name              = var.project_name
  environment               = "prod"
  aws_region                = var.aws_region
  kms_key_arn               = module.security.kms_key_arn
  log_retention_days        = 90
  private_app_subnet_ids    = module.network.private_app_subnet_ids
  ecs_app_security_group_id = module.security.ecs_app_security_group_id
  ecs_execution_role_arn    = module.iam.ecs_execution_role_arn
  backend_task_role_arn     = module.iam.backend_task_role_arn
  worker_task_role_arn      = module.iam.worker_task_role_arn
  backend_target_group_arn  = module.load_balancer.backend_target_group_arn
  documents_bucket_name     = module.storage.documents_bucket_name
  queue_url                 = module.queue.queue_url
  db_secret_arn             = module.secrets.db_secret_arn
  app_security_secret_arn   = module.secrets.app_security_secret_arn
  blockchain_secret_arn     = module.secrets.blockchain_secret_arn
  blockchain_network        = var.blockchain_network
  backend_cpu               = 1024
  backend_memory            = 2048
  backend_image_tag         = var.backend_image_tag
  backend_desired_count     = 4
  backend_min_count         = 4
  backend_max_count         = 16
  worker_cpu                = 512
  worker_memory             = 1024
  worker_image_tag          = var.worker_image_tag
  worker_desired_count      = 2
  tags                      = local.tags
}

# ── 11. Monitoring & Observability (CloudWatch Dashboard & Alarms) ───────────
module "monitoring" {
  source = "../../modules/monitoring"

  project_name                    = var.project_name
  environment                     = "prod"
  aws_region                      = var.aws_region
  kms_key_arn                     = module.security.kms_key_arn
  alb_arn_suffix                  = module.load_balancer.alb_arn_suffix
  backend_target_group_arn_suffix = module.load_balancer.backend_target_group_arn_suffix
  db_instance_id                  = module.database.db_instance_id
  ecs_cluster_name                = module.container.cluster_name
  backend_service_name            = module.container.backend_service_name
  tags                            = local.tags
}

# ── 12. Blockchain Parameter Registry (SSM Parameter Store) ──────────────────
module "blockchain" {
  source = "../../modules/blockchain"

  project_name            = var.project_name
  environment             = "prod"
  blockchain_network_name = var.blockchain_network
  chain_id                = var.chain_id
  tags                    = local.tags
}
