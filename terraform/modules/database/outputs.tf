output "db_instance_id" {
  value       = aws_db_instance.postgres.id
  description = "RDS instance ID"
}

output "db_instance_endpoint" {
  value       = aws_db_instance.postgres.endpoint
  description = "Connection endpoint for PostgreSQL (host:port)"
}

output "db_instance_address" {
  value       = aws_db_instance.postgres.address
  description = "Connection hostname for PostgreSQL"
}

output "db_instance_port" {
  value       = aws_db_instance.postgres.port
  description = "PostgreSQL port"
}

output "db_name" {
  value       = aws_db_instance.postgres.db_name
  description = "Database name"
}

output "db_master_username" {
  value       = aws_db_instance.postgres.username
  description = "Master username"
}

output "db_master_password" {
  value       = random_password.master_password.result
  sensitive   = true
  description = "Generated master password"
}

output "db_connection_url" {
  value       = "postgresql://${aws_db_instance.postgres.username}:${random_password.master_password.result}@${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}?sslmode=require"
  sensitive   = true
  description = "Full connection URL for application configuration"
}
