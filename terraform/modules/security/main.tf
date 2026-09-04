/**
 * Security Module - Security Groups and KMS Customer-Managed Keys (CMK)
 * Implements strict zero-trust network boundaries and envelope encryption with automatic rotation.
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

# ── 1. Application Load Balancer (ALB) Security Group ────────────────────────
resource "aws_security_group" "alb" {
  name_prefix = "${var.project_name}-${var.environment}-alb-sg-"
  description = "Public ingress security group for Application Load Balancer"
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow HTTP for redirect to HTTPS"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow TLS/HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Forward traffic to backend container port"
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-alb-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ── 2. ECS Fargate Application Security Group ────────────────────────────────
resource "aws_security_group" "ecs_app" {
  name_prefix = "${var.project_name}-${var.environment}-ecs-app-sg-"
  description = "Security group for ECS Fargate container tasks"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow HTTP ingress exclusively from ALB security group"
    from_port       = 3001
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Allow outbound HTTPS for RPC, S3, Secrets Manager, and package registries"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description     = "Allow egress to RDS PostgreSQL database port"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    cidr_blocks     = [var.vpc_cidr]
  }

  egress {
    description     = "Allow egress to ElastiCache Redis port"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    cidr_blocks     = [var.vpc_cidr]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-ecs-app-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ── 3. RDS PostgreSQL Database Security Group (Zero Public Ingress) ──────────
resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-${var.environment}-rds-sg-"
  description = "Security group for RDS PostgreSQL; accessible strictly from ECS application tier"
  vpc_id      = var.vpc_id

  ingress {
    description     = "PostgreSQL access strictly from ECS Fargate application containers"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_app.id]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-rds-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ── 4. ElastiCache Redis Security Group ──────────────────────────────────────
resource "aws_security_group" "redis" {
  name_prefix = "${var.project_name}-${var.environment}-redis-sg-"
  description = "Security group for Redis queue and cache"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis access strictly from ECS Fargate containers"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_app.id]
  }

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-redis-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ── 5. KMS Customer-Managed Keys (CMK) with Automatic Annual Rotation ────────
data "aws_caller_identity" "current" {}

resource "aws_kms_key" "rwa_encryption" {
  description             = "KMS Key for ${var.project_name}-${var.environment} encryption (RDS, S3, Secrets Manager)"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootPermissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowCloudWatchLogs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${var.aws_region}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt*",
          "kms:Decrypt*",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:Describe*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.project_name}-${var.environment}-cmk"
  })
}

resource "aws_kms_alias" "rwa_encryption_alias" {
  name          = "alias/${var.project_name}-${var.environment}-cmk"
  target_key_id = aws_kms_key.rwa_encryption.key_id
}
