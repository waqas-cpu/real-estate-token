/**
 * Blockchain Module Variables
 */

variable "project_name" {
  type        = string
  description = "Project identifier"
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"
}

variable "blockchain_network_name" {
  type        = string
  description = "Name of target blockchain network (e.g. sepolia, mainnet)"
  default     = "sepolia"
}

variable "chain_id" {
  type        = number
  description = "EVM Chain ID (11155111 for Sepolia, 1 for Ethereum Mainnet)"
  default     = 11155111
}

variable "indexer_start_block" {
  type        = number
  description = "Block height to initiate event indexing from"
  default     = 0
}

variable "compliance_registry_address" {
  type        = string
  description = "Ethereum address of RwaComplianceRegistry contract (0x0 if uninitialized)"
  default     = "0x0000000000000000000000000000000000000000"
}

variable "token_factory_address" {
  type        = string
  description = "Ethereum address of RwaTokenFactory contract (0x0 if uninitialized)"
  default     = "0x0000000000000000000000000000000000000000"
}

variable "multisig_admin_address" {
  type        = string
  description = "Ethereum address of RwaMultiSigAdmin contract (0x0 if uninitialized)"
  default     = "0x0000000000000000000000000000000000000000"
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
