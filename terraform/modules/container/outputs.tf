/**
 * Container Module Outputs
 */

output "cluster_id" {
  description = "ECS Cluster ID"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "ECS Cluster Name"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "ECS Cluster ARN"
  value       = aws_ecs_cluster.main.arn
}

output "ecr_repository_urls" {
  description = "Map of ECR repository URLs by workload name"
  value       = { for k, v in aws_ecr_repository.repos : k => v.repository_url }
}

output "backend_service_name" {
  description = "Name of the Backend API ECS Service"
  value       = aws_ecs_service.backend_api.name
}

output "worker_service_name" {
  description = "Name of the Worker ECS Service"
  value       = aws_ecs_service.worker.name
}

output "backend_log_group_name" {
  description = "CloudWatch log group name for Backend API"
  value       = aws_cloudwatch_log_group.backend.name
}

output "worker_log_group_name" {
  description = "CloudWatch log group name for Worker"
  value       = aws_cloudwatch_log_group.worker.name
}
