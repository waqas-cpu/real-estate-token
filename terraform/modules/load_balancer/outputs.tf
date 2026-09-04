/**
 * Load Balancer Module Outputs
 */

output "alb_id" {
  description = "Application Load Balancer ID"
  value       = aws_lb.main.id
}

output "alb_arn" {
  description = "Application Load Balancer ARN"
  value       = aws_lb.main.arn
}

output "alb_arn_suffix" {
  description = "Application Load Balancer ARN suffix for CloudWatch metrics"
  value       = aws_lb.main.arn_suffix
}

output "alb_dns_name" {
  description = "Public DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Canonical hosted zone ID of the load balancer (for Route53 alias records)"
  value       = aws_lb.main.zone_id
}

output "backend_target_group_arn" {
  description = "ARN of the Backend API Target Group"
  value       = aws_lb_target_group.backend_api.arn
}

output "backend_target_group_arn_suffix" {
  description = "ARN suffix of the Backend API Target Group for CloudWatch metrics"
  value       = aws_lb_target_group.backend_api.arn_suffix
}

output "http_listener_arn" {
  description = "ARN of the HTTP listener"
  value       = aws_lb_listener.http.arn
}

output "https_listener_arn" {
  description = "ARN of the HTTPS listener (if certificate provided)"
  value       = length(aws_lb_listener.https) > 0 ? aws_lb_listener.https[0].arn : null
}
