provider "vault" {
  address = "http://localhost:8200"
}

resource "vault_auth_backend" "approle" {
  type = "approle"
  path = "approle"
}

resource "vault_approle_auth_backend_role" "bedrock_app" {
  backend        = vault_auth_backend.approle.path
  role_name      = "bedrock-app"
  secret_id_ttl  = 86400
  token_ttl      = 1200
  token_max_ttl  = 1800
  token_policies = [vault_policy.bedrock_app_policy.name]
}

data "vault_kv_secret_v2" "aws_creds" {
     mount = "kv-v2"
     name  = "bedrock/aws"
}

resource "vault_aws_secret_backend" "aws" {
  path       = "aws"
  access_key = data.vault_kv_secret_v2.aws_creds.data["access_key"]
  secret_key = data.vault_kv_secret_v2.aws_creds.data["secret_key"]
  region     = "us-east-1"
}

resource "vault_policy" "bedrock_app_policy" {
  name   = "bedrock-app-policy"
  policy = <<EOF
path "aws/creds/bedrock-app" {
  capabilities = ["read"]
}
EOF
}

resource "vault_aws_secret_backend_role" "bedrock_app" {
  backend         = "aws"
  name            = "bedrock-app"
  credential_type = "assumed_role"
  role_arns       = ["arn:aws:iam::822202704205:role/VaultBedrockAccess"]
  policy_document = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:ListFoundationModels"
      ],
      "Resource": "*"
    }
  ]
}
EOF
}

output "bedrock_app_role_id" {
  description = "The AppRole role_id for bedrock-app."
  value       = vault_approle_auth_backend_role.bedrock_app.role_id
}

output "bedrock_app_secret_id" {
  description = "The AppRole secret_id for bedrock-app. This is a single-use secret_id generated at apply time."
  value       = vault_approle_auth_backend_role.bedrock_app.secret_id
} 