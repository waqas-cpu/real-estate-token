/**
 * Database Module - AWS RDS PostgreSQL
 * Enterprise-grade relational persistence for RWA tokenization platform.
 * Fully private, KMS encrypted, automated backups, Performance Insights, Multi-AZ.
 */

terraform {
  required_version = ">= 1.8.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.6.0"
    }
  }
}

# ── 1. DB Subnet Group (Isolated strictly to private database subnets) ────────
resource "aws_db_subnet_group" "rds" {
  name_prefix = "${var.project_name}-${var.environment}-db-subnet-"
  description = "Database subnet group spanning multiple AZs in private DB tier"
  subnet_ids  = var.private_db_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  })
}

# ── 2. DB Parameter Group (Security & Performance Hardening) ─────────────────
resource "aws_db_parameter_group" "postgres" {
  name_prefix = "${var.project_name}-${var.environment}-pg16-params-"
  family      = "postgres16"
  description = "Hardened parameter group for RWA PostgreSQL 16"

  # Enforce TLS/SSL for all connections
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  # Log slow queries taking longer than 1 second for compliance & auditing
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  # Statement timeout (30 seconds to prevent query starvation)
  parameter {
    name  = "statement_timeout"
    value = "30000"
  }

  tags = var.tags

  lifecycle {
    create_before_destroy = true
  }
}

# ── 3. Random Password Generation (Stored securely in Secrets Manager) ───────
resource "random_password" "master_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# ── 4. AWS RDS PostgreSQL Instance ───────────────────────────────────────────
resource "aws_db_instance" "postgres" {
  identifier_prefix = "${var.project_name}-${var.environment}-pg-"

  engine         = "postgres"
  engine_version = "16.3"
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage # Auto-scaling storage up to limit
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = var.kms_key_arn

  db_name  = var.database_name
  username = var.master_username
  password = random_password.master_password.result

  # Network & Isolation
  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [var.rds_security_group_id]
  publicly_accessible    = false # STRICT SECURITY: Never publicly accessible
  port                   = 5432

  # High Availability & Resilience
  multi_az = var.multi_az

  # Automated Backups & Point-in-Time Recovery (PITR)
  backup_retention_period   = var.backup_retention_period
  backup_window             = "03:00-04:00" # UTC
  maintenance_window        = "Sun:04:30-Sun:05:30" # UTC
  copy_tags_to_snapshot     = true
  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = "${var.project_name}-${var.environment}-final-snapshot"

  # Performance & Monitoring
  parameter_group_name           = aws_db_parameter_group.postgres.name
  performance_insights_enabled   = var.performance_insights_enabled
  performance_insights_kms_key_id = var.performance_insights_enabled ? var.kms_key_arn : null
  auto_minor_version_upgrade     = true

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-postgres"
  })

  lifecycle {
    ignore_changes = [
      password,
      latest_restorable_time
    ]
  }
}
