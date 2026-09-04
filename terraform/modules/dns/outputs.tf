/**
 * DNS Module Outputs
 */

output "certificate_arn" {
  description = "ARN of the validated ACM TLS Certificate"
  value       = local.enabled ? aws_acm_certificate_validation.cert[0].certificate_arn : ""
}

output "fqdn" {
  description = "Fully Qualified Domain Name for the application"
  value       = local.enabled ? local.fqdn_target : ""
}

output "route53_zone_id" {
  description = "Route53 Hosted Zone ID"
  value       = local.enabled ? data.aws_route53_zone.primary[0].zone_id : ""
}
