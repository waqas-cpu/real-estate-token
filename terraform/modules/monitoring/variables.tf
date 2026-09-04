/**
 * Monitoring Module Variables
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
  description = "ARN of KMS key for SNS encryption"
}

variable "alb_arn_suffix" {
  type        = string
  description = "ALB ARN Suffix for CloudWatch metrics"
}

variable "backend_target_group_arn_suffix" {
  type        = string
  description = "Target Group ARN Suffix for CloudWatch metrics"
}

variable "db_instance_id" {
  type        = string
  description = "RDS DB Instance Identifier"
}

variable "ecs_cluster_name" {
  type        = string
  description = "ECS Cluster Name"
}

variable "backend_service_name" {
  type        = string
  description = "Backend API ECS Service Name"
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
