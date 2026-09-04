/**
 * Secrets Module - AWS Secrets Manager
 * Stores encrypted database credentials, JWT secrets, blockchain RPC keys, and KYC tokens.
 */

terraform {
  required_version = ">= 1.8.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40.0"
    }
  }
}

# ── 1. Database Credentials Secret ───────────────────────────────────────────
resource "aws_secretsmanager_secret" "database" {
  name_prefix             = "${var.project_name}/${var.environment}/database-"
  description             = "PostgreSQL connection string and credentials for ${var.environment}"
  kms_key_id              = var.kms_key_arn
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id
  secret_string = jsonencode({
    engine   = "postgres"
    host     = var.db_host
    port     = var.db_port
    username = var.db_username
    password = var.db_password
    database = var.db_name
    url      = "postgresql://${var.db_username}:${var.db_password}@${var.db_host}:${var.db_port}/${var.db_name}?sslmode=require"
  })
}

# ── 2. Blockchain & RPC Secrets ──────────────────────────────────────────────
resource "aws_secretsmanager_secret" "blockchain" {
  name_prefix             = "${var.project_name}/${var.environment}/blockchain-"
  description             = "Blockchain RPC URLs, chain IDs, and deployer public addresses for ${var.environment}"
  kms_key_id              = var.kms_key_arn
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "blockchain" {
  secret_id = aws_secretsmanager_secret.blockchain.id
  secret_string = jsonencode({
    network_profile     = var.blockchain_network
    rpc_url             = var.blockchain_rpc_url
    contract_addresses  = {}
  })
}

# ── 3. Application Security & JWT Secrets ─────────────────────────────────────
resource "aws_secretsmanager_secret" "app_security" {
  name_prefix             = "${var.project_name}/${var.environment}/app-security-"
  description             = "JWT secret keys, API salt, and cryptographic signing keys for ${var.environment}"
  kms_key_id              = var.kms_key_arn
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "app_security" {
  secret_id = aws_secretsmanager_secret.app_security.id
  secret_string = jsonencode({
    jwt_secret    = var.jwt_secret
    session_salt  = var.session_salt
    pqc_key_seed  = var.pqc_key_seed
  })
}
