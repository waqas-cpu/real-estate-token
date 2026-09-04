/**
 * Blockchain Integration Infrastructure Module
 * Manages SSM Parameter Store hierarchy for blockchain network parameters,
 * smart contract address registry, chain IDs, and indexer configuration.
 *
 * NOTE: Smart contract deployment lifecycle is managed via blockchain pipelines
 * (Foundry/Hardhat), while Terraform manages the persistent cloud configuration
 * registry linking off-chain services to on-chain state.
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

locals {
  prefix = "/${var.project_name}/${var.environment}/blockchain"
}

# ── Blockchain Network Profile & Chain ID ────────────────────────────────────
resource "aws_ssm_parameter" "network_name" {
  name        = "${local.prefix}/network_name"
  description = "Target EVM network name (e.g., sepolia, mainnet, polygon)"
  type        = "String"
  value       = var.blockchain_network_name

  tags = var.tags
}

resource "aws_ssm_parameter" "chain_id" {
  name        = "${local.prefix}/chain_id"
  description = "Target EVM Chain ID"
  type        = "String"
  value       = tostring(var.chain_id)

  tags = var.tags
}

# ── Blockchain Indexer Ingestion Checkpoint ──────────────────────────────────
resource "aws_ssm_parameter" "indexer_start_block" {
  name        = "${local.prefix}/indexer/start_block"
  description = "Initial block number for indexer ingestion backfill"
  type        = "String"
  value       = tostring(var.indexer_start_block)

  tags = var.tags
}

# ── Smart Contract Address Registry (Updated post-deployment) ────────────────
resource "aws_ssm_parameter" "contract_compliance_registry" {
  name        = "${local.prefix}/contracts/compliance_registry"
  description = "Deployed address of RwaComplianceRegistry"
  type        = "String"
  value       = var.compliance_registry_address

  tags = var.tags

  lifecycle {
    ignore_changes = [value] # Allow CI/CD contract deployment pipeline to update
  }
}

resource "aws_ssm_parameter" "contract_token_factory" {
  name        = "${local.prefix}/contracts/token_factory"
  description = "Deployed address of RwaTokenFactory / Asset Token"
  type        = "String"
  value       = var.token_factory_address

  tags = var.tags

  lifecycle {
    ignore_changes = [value] # Allow CI/CD contract deployment pipeline to update
  }
}

resource "aws_ssm_parameter" "contract_multisig_admin" {
  name        = "${local.prefix}/contracts/multisig_admin"
  description = "Deployed address of RwaMultiSigAdmin governance contract"
  type        = "String"
  value       = var.multisig_admin_address

  tags = var.tags

  lifecycle {
    ignore_changes = [value]
  }
}
