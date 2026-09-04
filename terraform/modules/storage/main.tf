/**
 * Storage Module - Secure S3 Buckets for RWA Property Documents & Compliance Artifacts
 * Enforces zero public access, KMS envelope encryption, versioning, and lifecycle transitions.
 */

terraform {
  required_version = ">= 1.8.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40.0"
    }
  }
}

# ── 1. S3 Access Logging Bucket ──────────────────────────────────────────────
resource "aws_s3_bucket" "access_logs" {
  bucket_prefix = "${var.project_name}-${var.environment}-s3-logs-"
  force_destroy = var.environment != "prod"

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-s3-access-logs"
  })
}

resource "aws_s3_bucket_public_access_block" "access_logs" {
  bucket                  = aws_s3_bucket.access_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ── 2. Primary RWA Documents Bucket ──────────────────────────────────────────
resource "aws_s3_bucket" "documents" {
  bucket_prefix = "${var.project_name}-${var.environment}-docs-"
  force_destroy = var.environment != "prod"

  tags = merge(var.tags, {
    Name               = "${var.project_name}-${var.environment}-documents"
    DataClassification = "Restricted"
  })
}

# Strictly block all public access (compliance requirement)
resource "aws_s3_bucket_public_access_block" "documents" {
  bucket                  = aws_s3_bucket.documents.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Versioning for legal documents and cadastral records
resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Envelope Encryption with Customer-Managed KMS Key
resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# Server Access Logging to dedicated logging bucket
resource "aws_s3_bucket_logging" "documents" {
  bucket = aws_s3_bucket.documents.id

  target_bucket = aws_s3_bucket.access_logs.id
  target_prefix = "documents-access-logs/"
}

# Lifecycle Management: Archival to Glacier after 180 days for legal compliance
resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    id     = "archive-historical-legal-docs"
    status = "Enabled"

    noncurrent_version_transition {
      noncurrent_days = 90
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 180
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 2555 # 7 years statutory retention
    }
  }
}
