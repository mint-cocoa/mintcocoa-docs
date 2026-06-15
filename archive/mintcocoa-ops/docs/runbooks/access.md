# Access

## Preferred Operator Access

Use the home LAN route through the Raspberry Pi IPSec CPE before running
Kubernetes administration commands. The default operator kubeconfig uses the
private OKE API endpoint. The legacy `192.168.0.0/24` subnet has been removed;
do not use old `192.168.0.1` examples as the active route.

```bash
ip route get 10.30.1.45
kubectl get nodes
```

The target OCI Site-to-Site IPSec path uses:

```text
Operator-side CIDR: 172.30.1.0/24
IPSec CPE host: 172.30.1.135
OCI VCN CIDR: 10.30.0.0/16
Routed destination: 10.30.0.0/16
```

The upstream gateway must have a static route for LAN-wide access:

```text
Destination: 10.30.0.0/16
Gateway: 172.30.1.135
```

The normal operator path does not require enabling a per-workstation tunnel.
The Raspberry Pi strongSwan CPE terminates OCI Site-to-Site IPSec for the home
LAN.

Current CPE state uses `oci-tunnel-2` as the active data-plane tunnel.
`oci-tunnel-1` is disabled on the Raspberry Pi because it was observed to accept
outbound traffic without returning data-plane responses.

## Kubeconfig

Generate or refresh the kubeconfig with the private endpoint. It invokes the OCI
CLI to generate short-lived Kubernetes tokens.

```bash
oci ce cluster create-kubeconfig \
  --region ap-chuncheon-1 \
  --cluster-id <cluster-ocid> \
  --file ~/.kube/config \
  --token-version 2.0.0 \
  --kube-endpoint PRIVATE_ENDPOINT
```

The private API endpoint is:

```text
https://10.30.1.45:6443
```

The public API endpoint still exists in OKE, but its NSG no longer allows
`0.0.0.0/0 -> 6443`.

## Grafana

Grafana remains internal and is exposed through the private ingress controller:

```text
http://grafana.mintcocoa.dev
```

The private ingress controller uses an OCI internal Load Balancer:

```text
IngressClass: private-nginx
Private LB IP: 10.30.4.91
Internal DNS: grafana.mintcocoa.dev -> 10.30.4.91
```

Prometheus, Loki, Tempo, and Alertmanager remain internal Kubernetes services.
If the private ingress path is unavailable, use Kubernetes API port-forwarding
as a fallback:

```bash
kubectl -n observability port-forward svc/observability-grafana 3000:80
```

## Argo CD

Argo CD is exposed on the same private operator plane:

```text
https://argocd.mintcocoa.dev
Internal DNS: argocd.mintcocoa.dev -> 10.30.6.10
```

The UI is served by management k3s `ingress-nginx` on the GitOps manager. It is
not backed by a public OCI LoadBalancer and the manager NSG does not allow
public `80/tcp` or `443/tcp`.

## Manual Clients

Some mobile or GUI clients cannot execute `oci ce cluster generate-token`. For
those clients, create a ServiceAccount token with only the required permission.

Avoid `cluster-admin` for routine mobile access. Prefer a read-only account:

```bash
kubectl create serviceaccount external-viewer -n kube-system
kubectl create clusterrolebinding external-viewer-view \
  --clusterrole=view \
  --serviceaccount=kube-system:external-viewer
kubectl -n kube-system create token external-viewer --duration=8760h
```

If a temporary admin token is required, store it outside Git and revoke it when
finished.

## Emergency Recovery

If the IPSec or GitOps manager path is unavailable, temporarily allow the current
operator public IP to reach the OKE API, then remove the rule after recovery.

```bash
CONTROL_NSG=<control-plane-nsg-ocid>
MY_IP="$(curl -sS https://ifconfig.me)/32"

oci network nsg rules add \
  --nsg-id "$CONTROL_NSG" \
  --security-rules "[{
    \"direction\": \"INGRESS\",
    \"protocol\": \"6\",
    \"source\": \"$MY_IP\",
    \"sourceType\": \"CIDR_BLOCK\",
    \"description\": \"Temporary operator recovery access to Kubernetes API\",
    \"tcpOptions\": {
      \"destinationPortRange\": {\"min\": 6443, \"max\": 6443}
    }
  }]"
```

After access is restored, remove the temporary rule by its rule ID:

```bash
oci network nsg rules remove \
  --nsg-id "$CONTROL_NSG" \
  --security-rule-ids '["<rule-id>"]'
```
