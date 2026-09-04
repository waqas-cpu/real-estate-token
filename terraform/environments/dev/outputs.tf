/**
 * Dev Environment - Outputs
 */

output "alb_dns_name" {
  description = "Public DNS name of the Application Load Balancer"
  value       = module.load_balancer.alb_dns_name
}

output "api_endpoint" {
  description = "Public endpoint URL for the Dev API"
  value       = module.dns.fqdn != "" ? "https://${module.dns.fqdn}" : "http://${module.load_balancer.alb_dns_name}"
}

output "database_endpoint" {
  description = "Internal connection endpoint for RDS PostgreSQL"
  value       = module.database.db_endpoint
}

output "database_name" {
  description = "PostgreSQL Database Name"
  value       = module.database.db_name
}

output "ecr_repositories" {
  description = "ECR Repository URLs"
  value       = module.container.ecr_repository_urls
}

output "ecs_cluster_name" {
  description = "ECS Cluster Name"
  value       = module.container.cluster_name
}

output "documents_bucket" {
  description = "S3 Bucket for RWA Legal and Property Documents"
  value       = module.storage.documents_bucket_name
}

output "sqs_queue_url" {
  description = "SQS Task Queue URL"
  value       = module.queue.queue_url
}

output "sqs_dlq_url" {
  description = "SQS Dead Letter Queue URL"
  value       = module.queue.dlq_url
}

output "cloudwatch_dashboard" {
  description = "CloudWatch Monitoring Dashboard Name"
  value       = module.monitoring.dashboard_name
}
