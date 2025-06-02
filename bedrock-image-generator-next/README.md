# Bedrock Image Generator

## Installing Node.js and npm

Before running this project, ensure Node.js and npm are installed on your server. On Ubuntu, you can install them with:

```sh
sudo apt update
sudo apt install -y nodejs npm
```

To verify the installation:

```sh
node -v
npm -v
```

# Getting started

## Vault

Perform the following vault configuration

**Enable Approle**

```
vault auth enable approle
```

**Create an approle role for generating AWS credentials**

```
vault write auth/approle/role/bedrock-app \
    secret_id_ttl=24h \
    token_ttl=20m \
    token_max_ttl=30m \
    policies=bedrock-app-policy
```

**Retrieve the `role-=id` & `secret-id` for the config**

>These will be required to set environment variables for the app to access vault

```
vault read auth/approle/role/bedrock-app/role-id
```

```
vault write -f auth/approle/role/bedrock-app/secret-id
```

**Grant Vault access to generate credentials**

```
vault write aws/config/root \
    access_key=A************* \
    secret_key=x********************************** \
    region=us-east-1
```

**Assign the policy to the approle**

```
vault write aws/roles/bedrock-app \
    credential_type=assumed_role \
    policy_document=-<<EOF
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
```

**Grant access to the approle to generate credentials**

```
vault policy write bedrock-app-policy \
    policy_document=-<<EOF
path "aws/creds/bedrock-app" {
  capabilities = ["read"]
}
EOF
```

>If using a policy file `vault policy write bedrock-app-policy bedrock-app-policy.hcl`

**Create the role in the aws secrets engine**

```
vault write aws/roles/bedrock-app \
    credential_type=assumed_role \
    role_arns=arn:aws:iam::822202704205:role/VaultBedrockAccess
```

## App Environment Config

**Configure a file name `.env.local` in the root of the app dir**

Populate wiht the variables above

```
VAULT_ADDR=http://localhost:8200
VAULT_ROLE_ID=d****-*****-****-****************
VAULT_SECRET_ID=d****-*****-****-****************
```

## Start the app

Once the above configuration is in place, start the app.

```
npm run dev

> bedrock-image-generator-next@0.1.0 dev
> next dev --turbopack

   ▲ Next.js 15.3.2 (Turbopack)
   - Local:        http://localhost:3000
   - Network:      http://127.0.2.2:3000
   - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 744ms
```

## Misc

**List credential sessions

```
vault list sys/leases/lookup/aws/creds/bedrock-app
```

**Revoke active sessions

```
vault lease revoke -prefix aws/creds/bedrock-app
```
