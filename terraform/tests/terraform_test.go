package test

import (
	"testing"
	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/assert"
)

// TestDevEnvironmentPlan validates that the Dev environment plan generates without errors.
func TestDevEnvironmentPlan(t *testing.T) {
	t.Parallel()

	terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
		TerraformDir: "../environments/dev",
		Vars: map[string]interface{}{
			"aws_region":   "us-east-1",
			"project_name": "rwa-test",
		},
		NoColor: true,
	})

	// Run terraform init and terraform plan
	planOutput := terraform.InitAndPlan(t, terraformOptions)

	// Assertions on the plan output
	assert.Contains(t, planOutput, "Plan:")
}
