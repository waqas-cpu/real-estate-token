output "db_secret_arn" {
  value       = aws_secretsmanager_secret.database.arn
  description = "ARN of the database credentials secret"
}

output "db_secret_name" {
  value       = aws_secretsmanager_secret.database.name
  description = "Name of the database credentials secret"
}

output "blockchain_secret_arn" {
  value       = aws_secretsmanager_secret.blockchain.arn
  description = "ARN of the blockchain RPC secret"
}

output "app_security_secret_arn" {
  value       = aws_secretsmanager_secret.app_security.arn
  description = "ARN of the application JWT and cryptographic security secret"
}

output "all_secret_arns" {
  value = [
    aws_secretsmanager_secret.database.arn,
    aws_secretsmanager_secret.blockchain.arn,
    aws_secretsmanager_secret.app_security.arn
  ]
  description = "List of all secret ARNs for IAM policy attachments"
}
