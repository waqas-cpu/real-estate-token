/**
 * Dev Environment - Input Variables
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
  default     = "10.10.0.0/16"
}

variable "domain_name" {
  type        = string
  description = "Base Route53 domain name (leave empty if domain not configured in dev)"
  default     = ""
}

variable "subdomain" {
  type        = string
  description = "Subdomain prefix for Dev API"
  default     = "api-dev"
}

variable "db_instance_class" {
  type        = string
  description = "RDS PostgreSQL instance type for development"
  default     = "db.t4g.medium"
}

variable "db_allocated_storage" {
  type        = number
  description = "Initial allocated storage for RDS in GB"
  default     = 20
}

variable "db_max_allocated_storage" {
  type        = number
  description = "Maximum autoscaling storage for RDS in GB"
  default     = 50
}

variable "backend_image_tag" {
  type        = string
  description = "Container image tag for Backend API"
  default     = "latest"
}

variable "worker_image_tag" {
  type        = string
  description = "Container image tag for Worker"
  default     = "latest"
}

variable "blockchain_network" {
  type        = string
  description = "Blockchain network identifier"
  default     = "sepolia"
}

variable "chain_id" {
  type        = number
  description = "EVM Chain ID"
  default     = 11155111
}
