/**
 * Container Module Variables
 */

variable "project_name" {
  type        = string
  description = "Project identifier"
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
}

variable "kms_key_arn" {
  type        = string
  description = "ARN of the KMS Customer-Managed Key"
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention in days"
  default     = 30
}

variable "private_app_subnet_ids" {
  type        = list(string)
  description = "Subnet IDs for application container placement"
}

variable "ecs_app_security_group_id" {
  type        = string
  description = "Security Group ID for ECS application containers"
}

variable "ecs_execution_role_arn" {
  type        = string
  description = "ARN of the ECS Task Execution Role"
}

variable "backend_task_role_arn" {
  type        = string
  description = "ARN of the Backend API Task IAM Role"
}

variable "worker_task_role_arn" {
  type        = string
  description = "ARN of the Worker Task IAM Role"
}

variable "backend_target_group_arn" {
  type        = string
  description = "ALB Target Group ARN for Backend API"
}

variable "documents_bucket_name" {
  type        = string
  description = "Name of the S3 bucket for legal & property documents"
}

variable "queue_url" {
  type        = string
  description = "SQS Queue URL for background tasks"
}

variable "db_secret_arn" {
  type        = string
  description = "ARN of the database credential secret"
}

variable "app_security_secret_arn" {
  type        = string
  description = "ARN of the application JWT security secret"
}

variable "blockchain_secret_arn" {
  type        = string
  description = "ARN of the blockchain RPC secret"
}

variable "blockchain_network" {
  type        = string
  description = "Target blockchain network profile (e.g., sepolia, mainnet)"
  default     = "sepolia"
}

variable "backend_cpu" {
  type        = number
  description = "CPU units for Backend API (256 = 0.25 vCPU, 512 = 0.5 vCPU, 1024 = 1 vCPU)"
  default     = 512
}

variable "backend_memory" {
  type        = number
  description = "Memory in MiB for Backend API"
  default     = 1024
}

variable "backend_image_tag" {
  type        = string
  description = "Container image tag for Backend API"
  default     = "latest"
}

variable "backend_desired_count" {
  type        = number
  description = "Desired number of Backend API tasks"
  default     = 2
}

variable "backend_min_count" {
  type        = number
  description = "Minimum number of Backend API tasks for autoscaling"
  default     = 2
}

variable "backend_max_count" {
  type        = number
  description = "Maximum number of Backend API tasks for autoscaling"
  default     = 6
}

variable "worker_cpu" {
  type        = number
  description = "CPU units for Worker daemon"
  default     = 256
}

variable "worker_memory" {
  type        = number
  description = "Memory in MiB for Worker daemon"
  default     = 512
}

variable "worker_image_tag" {
  type        = string
  description = "Container image tag for Worker daemon"
  default     = "latest"
}

variable "worker_desired_count" {
  type        = number
  description = "Desired number of Worker tasks"
  default     = 1
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
