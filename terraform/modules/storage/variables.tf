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
  description = "KMS CMK Key ARN for S3 storage encryption"
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
