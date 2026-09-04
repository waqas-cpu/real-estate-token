/**
 * Queue Module Variables
 */

variable "project_name" {
  type        = string
  description = "Project identifier"
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"
}

variable "kms_key_arn" {
  type        = string
  description = "ARN of the KMS key for SQS server-side encryption"
}

variable "visibility_timeout_seconds" {
  type        = number
  description = "SQS visibility timeout in seconds"
  default     = 300
}

variable "max_receive_count" {
  type        = number
  description = "Number of times a message is delivered before being sent to DLQ"
  default     = 5
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
