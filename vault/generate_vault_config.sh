#!/bin/bash
# Usage: ./generate_vault_config.sh <node_name> <ip_address>

set -e

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <node_name> <ip_address>"
  exit 1
fi

NODE_NAME="$1"
IP_ADDR="$2"

cat > "vault_${NODE_NAME}.hcl" <<EOF
storage "raft" {
  path    = "/opt/vault/data"
  node_id = "${NODE_NAME}"
  retry_join {
    leader_api_addr = "http://10.0.0.1:8200"
  }
  retry_join {
    leader_api_addr = "http://10.0.0.2:8200"
  }
  retry_join {
    leader_api_addr = "http://10.0.0.3:8200"
  }
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1 # For demo only; use TLS in production
}

api_addr = "http://${IP_ADDR}:8200"
cluster_addr = "http://${IP_ADDR}:8201"
ui = true
EOF

echo "Generated vault_${NODE_NAME}.hcl for ${NODE_NAME} (${IP_ADDR})" 