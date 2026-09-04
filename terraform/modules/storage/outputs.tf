output "documents_bucket_name" {
  value       = aws_s3_bucket.documents.id
  description = "Name of the documents S3 bucket"
}

output "documents_bucket_arn" {
  value       = aws_s3_bucket.documents.arn
  description = "ARN of the documents S3 bucket"
}

output "access_logs_bucket_name" {
  value       = aws_s3_bucket.access_logs.id
  description = "Name of the S3 access logging bucket"
}
