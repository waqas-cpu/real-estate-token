/**
 * Queue Module Outputs
 */

output "queue_url" {
  description = "URL of the primary SQS workload queue"
  value       = aws_sqs_queue.main.url
}

output "queue_arn" {
  description = "ARN of the primary SQS workload queue"
  value       = aws_sqs_queue.main.arn
}

output "dlq_url" {
  description = "URL of the Dead Letter Queue"
  value       = aws_sqs_queue.dlq.url
}

output "dlq_arn" {
  description = "ARN of the Dead Letter Queue"
  value       = aws_sqs_queue.dlq.arn
}

output "dlq_alarm_arn" {
  description = "CloudWatch Alarm ARN for DLQ messages"
  value       = aws_cloudwatch_metric_alarm.dlq_messages.arn
}
