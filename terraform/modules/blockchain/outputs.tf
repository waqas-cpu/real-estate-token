/**
 * Blockchain Module Outputs
 */

output "ssm_network_name_arn" {
  description = "SSM Parameter ARN for blockchain network name"
  value       = aws_ssm_parameter.network_name.arn
}

output "ssm_chain_id_arn" {
  description = "SSM Parameter ARN for EVM Chain ID"
  value       = aws_ssm_parameter.chain_id.arn
}

output "ssm_compliance_registry_arn" {
  description = "SSM Parameter ARN for compliance registry address"
  value       = aws_ssm_parameter.contract_compliance_registry.arn
}

output "ssm_token_factory_arn" {
  description = "SSM Parameter ARN for token factory address"
  value       = aws_ssm_parameter.contract_token_factory.arn
}

output "ssm_multisig_admin_arn" {
  description = "SSM Parameter ARN for multisig admin address"
  value       = aws_ssm_parameter.contract_multisig_admin.arn
}
