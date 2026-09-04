output "alb_security_group_id" {
  value       = aws_security_group.alb.id
  description = "Security Group ID for the ALB"
}

output "ecs_app_security_group_id" {
  value       = aws_security_group.ecs_app.id
  description = "Security Group ID for the ECS Fargate applications"
}

output "rds_security_group_id" {
  value       = aws_security_group.rds.id
  description = "Security Group ID for the RDS PostgreSQL database"
}

output "redis_security_group_id" {
  value       = aws_security_group.redis.id
  description = "Security Group ID for ElastiCache Redis"
}

output "kms_key_id" {
  value       = aws_kms_key.rwa_encryption.id
  description = "KMS Customer-Managed Key ID"
}

output "kms_key_arn" {
  value       = aws_kms_key.rwa_encryption.arn
  description = "KMS Customer-Managed Key ARN"
}
