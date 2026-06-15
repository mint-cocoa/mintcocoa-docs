# Current State

Last updated: 2026-06-12.

## Production Kubernetes

- Provider: Oracle Kubernetes Engine
- Cluster: `home-oci-oke-cluster`
- Region: `ap-chuncheon-1`
- Kubernetes: `v1.33.1`
- Public API endpoint: `https://168.110.124.39:6443`
- Private API endpoint: `https://10.30.1.45:6443`
- VCN hostname endpoint:
  `https://cvv2sfbic3q.okesubnet.homeokevcn.oraclevcn.com:6443`
- Worker nodes: 3 arm64 nodes
- StorageClass: `oci-bv`

The current local kubeconfig uses the private OKE API endpoint. The public API
endpoint is not open to `0.0.0.0/0`; operator access uses OCI Site-to-Site
IPSec from the home LAN.

## GitOps Manager and Operator Network

- Manager instance: `mintcocoa-gitops-manager`
- Shape: `VM.Standard.A1.Flex`
- OCPU / memory: `1 OCPU / 6 GB`
- Public IP: none
- Private IP: `10.30.6.10`
- Management k3s: `v1.33.5+k3s1`, single node `gitops-manager`
- Management Argo CD: installed in `argocd` namespace
- Management root: `manager-root`, path `clusters/manager`
- Argo CD private URL: `https://argocd.mintcocoa.dev`
- Argo CD DNS: internal DNS resolves `argocd.mintcocoa.dev` to `10.30.6.10`
- Deleted legacy LAN: `192.168.0.0/24`
- Current operator-side CIDR for OCI IPSec: `172.30.1.0/24`
- Current IPSec CPE host: Raspberry Pi strongSwan `172.30.1.135`
- OCI IPSec: Raspberry Pi strongSwan currently uses `oci-tunnel-2` as the active
  tunnel. `oci-tunnel-1` is disabled on the CPE because it was selected for
  outbound traffic but did not return data-plane responses.
- Raspberry Pi can reach OKE private API `https://10.30.1.45:6443` and the
  GitOps manager over the active tunnel.

## Staging Kubernetes

- Distribution: k3s
- API endpoint: `https://172.30.1.27:6443`
- Node: `cocoamini`
- Kubernetes: `v1.35.5+k3s1`
- Architecture: `amd64`
- Capacity: `4 CPU`, about `15 GiB` RAM
- Argo CD cluster name target: `mintcocoa-staging`
- Local kubeconfig context: `mintcocoa-staging-local`
- Manager Argo CD cluster Secret: `cluster-mintcocoa-staging`
- Manager Argo CD root: `staging-root`
- Current workloads: `staging-whoami` and `staging-gitops-demo` are reachable
  through NodePort; `staging-dropapp` currently needs an image compatible with
  the node architecture.
- Role: staging validation, internal tools, testing, and disaster-recovery
  practice

Staging is not a runtime dependency of production.

## Access

The target access mode is:

- Operator-side LAN routes `10.30.0.0/16` through the Raspberry Pi IPSec CPE.
- The GitOps manager remains on the OCI VCN and talks to the private OKE API.
- LAN-wide workstation access still requires the upstream gateway to route
  `10.30.0.0/16` via `172.30.1.135`.

Secondary/manual access:

- A static ServiceAccount token may be used for manual clients that cannot run
  the OCI CLI.

The static token is intentionally not stored in Git.

## Observability

The production cluster currently runs:

- metrics-server
- Prometheus
- Grafana
- Alertmanager
- kube-state-metrics
- node-exporter
- Loki
- Promtail
- Tempo

Grafana is exposed through the private ingress controller only:

```text
URL: http://grafana.mintcocoa.dev
IngressClass: private-nginx
Private LB IP: 10.30.4.91
```

Internal DNS resolves `grafana.mintcocoa.dev` to the private LB IP for home LAN
clients. Prometheus, Loki, Tempo, and Alertmanager remain ClusterIP services
behind Grafana.

Argo CD is exposed only through the private operator path:

```text
URL: https://argocd.mintcocoa.dev
DNS: argocd.mintcocoa.dev -> 10.30.6.10
Ingress: management k3s ingress-nginx on the GitOps manager
```

The OCI NSG does not expose `80/tcp` or `443/tcp` publicly for this UI.

## Promotion Pipeline

Staging is the first shared GitOps target. Prod is the promotion target.
Shared workloads live under `apps/<app>/base` with `staging` and `prod`
overlays.

`dropapp` is the current portfolio workload. Staging exposes it on NodePort
`30081`; prod exposes it through `ingress-nginx`, `cert-manager`, and
`drop.mintcocoa.dev`. Upload and delete requests require the `dropapp-auth`
Secret in the target namespace. Files are stored in an `emptyDir` volume with a
`1Gi` limit and expire by application TTL instead of being retained permanently.
