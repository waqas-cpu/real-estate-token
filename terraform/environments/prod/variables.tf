/**
 * Production Environment - Input Variables
 */

variable "aws_region" {
  type        = string
  description = "AWS deployment region"
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Project identifier"
  default     = "rwa-platform"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for VPC"
  default     = "10.30.0.0/16"
}

variable "domain_name" {
  type        = string
  description = "Base Route53 domain name for production (e.g. 'rwa-platform.com')"
}

variable "subdomain" {
  type        = string
  description = "Subdomain prefix for Production API"
  default     = "api"
}

variable "db_instance_class" {
  type        = string
  description = "RDS PostgreSQL instance type for production"
  default     = "db.r6g.xlarge"
}

variable "db_allocated_storage" {
  type        = number
  description = "Initial allocated storage for RDS in GB"
  default     = 100
}

variable "db_max_allocated_storage" {
  type        = number
  description = "Maximum autoscaling storage for RDS in GB"
  default     = 500
}

variable "backend_image_tag" {
  type        = string
  description = "Immutable container image release tag for Backend API"
  default     = "latest"
}

variable "worker_image_tag" {
  type        = string
  description = "Immutable container image release tag for Worker"
  default     = "latest"
}

variable "blockchain_network" {
  type        = string
  description = "Production Blockchain network identifier (e.g. mainnet, polygon)"
  default     = "mainnet"
}

variable "chain_id" {
  type        = number
  description = "Production EVM Chain ID (1 for Ethereum Mainnet)"
  default     = 1
}
