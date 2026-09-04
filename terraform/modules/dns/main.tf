/**
 * DNS & TLS Module - Route53 & AWS Certificate Manager (ACM)
 * Manages automated DNS resolution, SSL/TLS certificate issuance,
 * DNS validation, and alias routing to the Application Load Balancer.
 */

terraform {
  required_version = ">= 1.8.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40.0"
    }
  }
}

locals {
  enabled     = var.domain_name != "" && var.domain_name != null
  fqdn_target = var.subdomain != "" ? "${var.subdomain}.${var.domain_name}" : var.domain_name
}

# ── Data source for Route53 Public Hosted Zone ──────────────────────────────
data "aws_route53_zone" "primary" {
  count        = local.enabled ? 1 : 0
  name         = var.domain_name
  private_zone = false
}

# ── ACM Certificate with DNS Validation ──────────────────────────────────────
resource "aws_acm_certificate" "cert" {
  count             = local.enabled ? 1 : 0
  domain_name       = local.fqdn_target
  validation_method = "DNS"

  subject_alternative_names = var.additional_sans

  lifecycle {
    create_before_destroy = true
  }

  tags = var.tags
}

# ── Route53 Records for ACM DNS Validation ──────────────────────────────────
resource "aws_route53_record" "cert_validation" {
  for_each = local.enabled ? {
    for dvo in aws_acm_certificate.cert[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.primary[0].zone_id
}

# ── ACM Certificate Validation Waiter ────────────────────────────────────────
resource "aws_acm_certificate_validation" "cert" {
  count                   = local.enabled ? 1 : 0
  certificate_arn         = aws_acm_certificate.cert[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# ── Route53 Alias Record to ALB ──────────────────────────────────────────────
resource "aws_route53_record" "alb_alias" {
  count   = local.enabled && var.alb_dns_name != "" ? 1 : 0
  zone_id = data.aws_route53_zone.primary[0].zone_id
  name    = local.fqdn_target
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
