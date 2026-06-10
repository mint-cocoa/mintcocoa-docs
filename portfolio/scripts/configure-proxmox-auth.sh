#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

read -rp "Proxmox URL [https://172.30.1.12:8006]: " proxmox_url
proxmox_url="${proxmox_url:-https://172.30.1.12:8006}"

read -rp "Prometheus URL [http://172.30.1.240]: " prometheus_url
prometheus_url="${prometheus_url:-http://172.30.1.240}"

read -rp "Prometheus Host header [prometheus.homelab.local]: " prometheus_host
prometheus_host="${prometheus_host:-prometheus.homelab.local}"

read -rp "PVE API token id (example: root@pam!portfolio-dashboard): " token_id
read -rsp "PVE API token secret: " token_secret
printf '\n'

umask 077
cat > .env.ops <<EOF
PROMETHEUS_URL=${prometheus_url}
PROMETHEUS_HOST_HEADER=${prometheus_host}
PROXMOX_URL=${proxmox_url}
PROXMOX_VERIFY_TLS=false
PVE_API_TOKEN_ID=${token_id}
PVE_API_TOKEN_SECRET=${token_secret}
OPS_API_CORS_ORIGINS=*
EOF

echo "Wrote .env.ops with mode 600"
