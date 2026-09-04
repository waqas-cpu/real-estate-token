/**
 * Monitoring Module Outputs
 */

output "alerts_sns_topic_arn" {
  description = "ARN of the SNS topic for operational and security alerts"
  value       = aws_sns_topic.alerts.arn
}

output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.platform.dashboard_name
}
