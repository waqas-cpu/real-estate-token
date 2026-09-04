variable "project_name" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Environment (dev, staging, prod)"
}

variable "kms_key_arn" {
  type        = string
  description = "KMS CMK Key ARN for secrets encryption"
}

variable "db_host" {
  type        = string
  description = "RDS database host"
}

variable "db_port" {
  type        = number
  description = "RDS database port"
}

variable "db_username" {
  type        = string
  description = "RDS database username"
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "RDS database password"
}

variable "db_name" {
  type        = string
  description = "RDS database name"
}

variable "blockchain_network" {
  type        = string
  description = "Blockchain network identifier (e.g. sepolia, mainnet)"
}

variable "blockchain_rpc_url" {
  type        = string
  sensitive   = true
  description = "RPC Provider endpoint URL"
  default     = ""
}

variable "jwt_secret" {
  type        = string
  sensitive   = true
  description = "JWT encryption secret"
  default     = ""
}

variable "session_salt" {
  type        = string
  sensitive   = true
  description = "Session encryption salt"
  default     = ""
}

variable "pqc_key_seed" {
  type        = string
  sensitive   = true
  description = "Post-Quantum Cryptography Master Key Seed"
  default     = ""
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
