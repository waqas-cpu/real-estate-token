/**
 * Global Remote State Bootstrap Outputs
 */

output "state_bucket_name" {
  description = "Name of S3 bucket for Terraform remote backend state"
  value       = aws_s3_bucket.state.id
}

output "state_bucket_arn" {
  description = "ARN of S3 bucket for Terraform remote backend state"
  value       = aws_s3_bucket.state.arn
}

output "dynamodb_table_name" {
  description = "Name of DynamoDB table for Terraform state locking"
  value       = aws_dynamodb_table.locks.name
}

output "kms_key_arn" {
  description = "KMS Key ARN used to encrypt state and lock table"
  value       = aws_kms_key.state.arn
}
