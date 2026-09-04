variable "project_name" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Environment (dev, staging, prod)"
}

variable "private_db_subnet_ids" {
  type        = list(string)
  description = "Private database subnet IDs"
}

variable "rds_security_group_id" {
  type        = string
  description = "Security Group ID for RDS"
}

variable "kms_key_arn" {
  type        = string
  description = "KMS CMK Key ARN for storage encryption"
}

variable "database_name" {
  type        = string
  description = "Name of the default PostgreSQL database"
  default     = "rwa_platform"
}

variable "master_username" {
  type        = string
  description = "Master username for PostgreSQL"
  default     = "rwa_admin"
}

variable "instance_class" {
  type        = string
  description = "RDS instance compute class"
  default     = "db.t4g.medium"
}

variable "allocated_storage" {
  type        = number
  description = "Initial allocated storage in GB"
  default     = 50
}

variable "max_allocated_storage" {
  type        = number
  description = "Upper storage threshold for auto-scaling in GB"
  default     = 500
}

variable "multi_az" {
  type        = bool
  description = "Deploy database across multiple AZs for failover"
  default     = false
}

variable "backup_retention_period" {
  type        = number
  description = "Backup retention period in days (1-35)"
  default     = 7
}

variable "deletion_protection" {
  type        = bool
  description = "Prevent database from being accidentally deleted"
  default     = false
}

variable "skip_final_snapshot" {
  type        = bool
  description = "Skip final snapshot on deletion (set false for prod)"
  default     = true
}

variable "performance_insights_enabled" {
  type        = bool
  description = "Enable AWS Performance Insights"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
