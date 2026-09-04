output "ecs_execution_role_arn" {
  value       = aws_iam_role.ecs_execution_role.arn
  description = "ARN of the ECS task execution role"
}

output "backend_task_role_arn" {
  value       = aws_iam_role.backend_task_role.arn
  description = "ARN of the backend API ECS task role"
}

output "worker_task_role_arn" {
  value       = aws_iam_role.worker_task_role.arn
  description = "ARN of the background worker ECS task role"
}
