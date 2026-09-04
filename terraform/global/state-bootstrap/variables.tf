/**
 * Global Remote State Bootstrap Variables
 */

variable "aws_region" {
  type        = string
  description = "AWS region for Terraform state infrastructure"
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Project identifier"
  default     = "rwa-platform"
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default = {
    Project            = "rwa-platform"
    ManagedBy          = "terraform"
    Scope              = "global-bootstrap"
    DataClassification = "confidential"
  }
}
