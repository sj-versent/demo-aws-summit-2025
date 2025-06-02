# Bootstrapping a 3-Node Vault Cluster

This guide describes how to bootstrap a highly available 3-node HashiCorp Vault cluster.

## Prerequisites

- 3 Linux servers (VMs or physical), networked and able to communicate with each other
- Vault binary installed on all nodes (see below)
- Consul, Raft, or another supported storage backend (this guide uses integrated Raft)
- Open required ports (default: 8200/tcp for Vault API, 8201/tcp for Raft)

## Installing Vault on Ubuntu

Run the following commands on each node to install the Vault binary:

```sh
wget -O - https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(grep -oP '(?<=UBUNTU_CODENAME=).*' /etc/os-release || lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install vault
```

## Cluster Topology

- Node 1: `vault-1` (e.g., 10.0.0.1)
- Node 2: `vault-2` (e.g., 10.0.0.2)
- Node 3: `vault-3` (e.g., 10.0.0.3)

## Generating Node Config Files

Use the provided script to generate a Vault config file for each node:

```sh
cd vault
chmod +x generate_vault_config.sh
./generate_vault_config.sh vault-1 10.0.0.1
./generate_vault_config.sh vault-2 10.0.0.2
./generate_vault_config.sh vault-3 10.0.0.3
```

This will create `vault_vault-1.hcl`, `vault_vault-2.hcl`, and `vault_vault-3.hcl`.

## Example Vault Configuration (for reference)

```
storage "raft" {
  path    = "/opt/vault/data"
  node_id = "vault-1" # Change to vault-2, vault-3 on other nodes
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

api_addr = "http://<node_ip>:8200"
cluster_addr = "http://<node_ip>:8201"
ui = true
```

- Replace `<node_ip>` and `node_id` for each node if not using the script.

## Bootstrapping Steps

1. **Start Vault on all nodes:**
   ```sh
   vault server -config=/path/to/vault_<node_name>.hcl
   ```
2. **Initialize the cluster (on one node only):**
   ```sh
   export VAULT_ADDR='http://10.0.0.1:8200'
   vault operator init
   ```
   - Save the unseal keys and root token securely.
3. **Unseal all nodes:**
   - On each node, run:
     ```sh
     export VAULT_ADDR='http://<node_ip>:8200'
     vault operator unseal
     ```
     - Repeat with enough unseal keys to reach quorum.
4. **Check cluster status:**
   ```sh
   vault status
   ```

## Notes
- For production, enable TLS and secure storage of unseal keys.
- See the [Vault Raft HA documentation](https://developer.hashicorp.com/vault/docs/enterprise/raft) for advanced options. 