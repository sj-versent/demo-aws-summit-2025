# Vault Terraform Configuration

This directory contains Terraform code to configure HashiCorp Vault for use with the Bedrock Image Generator application. It sets up:

- AppRole authentication
- AWS secrets engine
- Vault policies and roles for Bedrock access
- Secure retrieval of AWS credentials from Vault KV secrets

## Prerequisites

- Terraform >= 1.0
- Access to a running Vault instance
- Vault CLI access with permission to write secrets
- The following secret must exist in Vault (KV v2 at `secret/bedrock/aws`):
  - `access_key`
  - `secret_key`

## Adding AWS Credentials to Vault

Before running Terraform, add your AWS credentials to Vault:

```sh
vault kv put kv/bedrock/aws access_key=YOUR_AWS_ACCESS_KEY secret_key=YOUR_AWS_SECRET_KEY
```

## Usage

1. Initialize Terraform:
   ```sh
   terraform init
   ```
2. Review the plan:
   ```sh
   terraform plan
   ```
3. Apply the configuration:
   ```sh
   terraform apply
   ```

## Notes
- The AWS credentials are never stored in the codebase; they are securely retrieved from Vault at apply time.
- Update the Vault secret path in `vault.tf` if your environment uses a different location. 