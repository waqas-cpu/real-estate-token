/**
 * Queue Module - AWS SQS with Dead Letter Queue (DLQ)
 * Powers asynchronous tasks: blockchain event indexer, transaction confirmation,
 * reconciliation worker, KYC/KYB background verification, and audit pipelines.
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

# ── Dead-Letter Queue (DLQ) ──────────────────────────────────────────────────
resource "aws_sqs_queue" "dlq" {
  name                      = "${var.project_name}-${var.environment}-dlq"
  message_retention_seconds = 1209600 # 14 days retention for forensic analysis
  kms_master_key_id         = var.kms_key_arn

  tags = var.tags
}

# ── Primary Workload Queue ───────────────────────────────────────────────────
resource "aws_sqs_queue" "main" {
  name                       = "${var.project_name}-${var.environment}-tasks"
  visibility_timeout_seconds = var.visibility_timeout_seconds # e.g. 300s for blockchain batch reconciliation
  message_retention_seconds  = 345600                         # 4 days
  receive_wait_time_seconds  = 20                             # Long polling enabled

  kms_master_key_id = var.kms_key_arn

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  tags = var.tags
}

# ── CloudWatch Metric Alarm for Dead Letter Queue ────────────────────────────
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "${var.project_name}-${var.environment}-dlq-non-empty"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "Critical: Messages have failed processing and landed in the RWA task DLQ"

  dimensions = {
    QueueName = aws_sqs_queue.dlq.name
  }

  tags = var.tags
}
