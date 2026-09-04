output "vpc_id" {
  value       = aws_vpc.main.id
  description = "The ID of the VPC"
}

output "vpc_cidr" {
  value       = aws_vpc.main.cidr_block
  description = "The CIDR block of the VPC"
}

output "public_subnet_ids" {
  value       = aws_subnet.public[*].id
  description = "IDs of the public subnets"
}

output "private_app_subnet_ids" {
  value       = aws_subnet.private_app[*].id
  description = "IDs of the private application subnets"
}

output "private_db_subnet_ids" {
  value       = aws_subnet.private_db[*].id
  description = "IDs of the private database subnets"
}

output "nat_gateway_ips" {
  value       = aws_eip.nat[*].public_ip
  description = "Public Elastic IPs of the NAT Gateways (for whitelisting at RPC providers)"
}
