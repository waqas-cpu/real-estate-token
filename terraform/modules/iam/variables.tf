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
  description = "KMS CMK Key ARN"
}

variable "secrets_arns" {
  type        = list(string)
  description = "List of Secrets Manager ARNs that the execution role can read"
}

variable "documents_bucket_arn" {
  type        = string
  description = "S3 bucket ARN for property documents"
}

variable "queue_arn" {
  type        = string
  description = "SQS Queue ARN for background workers"
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
