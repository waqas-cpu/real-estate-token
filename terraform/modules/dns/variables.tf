/**
 * DNS Module Variables
 */

variable "domain_name" {
  type        = string
  description = "Base domain name registered in Route53 (e.g. 'example.com'). Leave empty to disable Route53/ACM."
  default     = ""
}

variable "subdomain" {
  type        = string
  description = "Subdomain prefix for this environment (e.g., 'api-dev', 'api-staging', 'api')"
  default     = ""
}

variable "additional_sans" {
  type        = list(string)
  description = "Additional Subject Alternative Names for the TLS certificate"
  default     = []
}

variable "alb_dns_name" {
  type        = string
  description = "DNS name of the Application Load Balancer"
  default     = ""
}

variable "alb_zone_id" {
  type        = string
  description = "Route53 Zone ID of the Application Load Balancer"
  default     = ""
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}
