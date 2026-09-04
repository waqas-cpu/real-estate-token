/**
 * Staging Environment - Terraform & Provider Configuration
 */

terraform {
  required_version = ">= 1.8.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.6.0"
    }
  }

  # Remote State Configuration (uncomment and supply bucket name after running global/state-bootstrap)
  # backend "s3" {
  #   bucket         = "rwa-platform-tfstate-<ACCOUNT_ID>"
  #   key            = "environments/staging/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "rwa-platform-tflocks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project            = var.project_name
      Environment        = "staging"
      ManagedBy          = "terraform"
      DataClassification = "confidential"
    }
  }
}
