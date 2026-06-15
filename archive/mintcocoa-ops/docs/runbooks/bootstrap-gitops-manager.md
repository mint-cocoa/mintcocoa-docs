# Bootstrap GitOps Manager

이 runbook은 OCI `mintcocoa-gitops-manager` VM 위에 single-node management k3s와 Argo CD를 설치하고, home k3s staging과 OKE prod를 remote cluster로 등록하는 절차를 정리한다.

## Target Role

`mintcocoa-gitops-manager`는 public service workload를 실행하지 않는다. 이 VM의 역할은 OCI Site-to-Site IPSec 뒤의 GitOps management control plane이다.

| Component | Role |
| --- | --- |
| management k3s | Argo CD를 실행하는 단일 노드 management cluster |
| Argo CD | `mintcocoa-staging`, `mintcocoa-prod` remote cluster reconcile |
| OCI Site-to-Site IPSec | home LAN에서 OCI private network로 들어오는 operator path |
| SSH tunnel | management Kubernetes API access without public exposure |

## Install Management k3s

```bash
ssh opc@10.30.6.10
sudo hostnamectl set-hostname gitops-manager
curl -sfL https://get.k3s.io -o /tmp/install-k3s.sh
sudo INSTALL_K3S_VERSION="v1.33.5+k3s1" \
  INSTALL_K3S_EXEC="server --disable traefik --disable servicelb --node-name gitops-manager --write-kubeconfig-mode 0640" \
  sh /tmp/install-k3s.sh
sudo /usr/local/bin/k3s kubectl get nodes
```

The management cluster is not a staging or production workload target. Do not put application namespaces or public ingress in this cluster.

Oracle Linux 8 currently boots with cgroup v1 on the OCI A1 image used here, so k3s is pinned to `v1.33.5+k3s1`. Newer k3s stable releases may require cgroup v2 and fail kubelet startup on this host.

Allow k3s pod egress through `firewalld`:

```bash
sudo firewall-cmd --permanent --zone=trusted --add-source=10.42.0.0/16
sudo firewall-cmd --permanent --zone=trusted --add-source=10.43.0.0/16
sudo firewall-cmd --permanent --zone=trusted --add-interface=cni0
sudo firewall-cmd --permanent --zone=trusted --add-interface=flannel.1
sudo firewall-cmd --permanent --zone=public --add-masquerade
sudo firewall-cmd --reload
```

If CoreDNS forwards to OCI link-local DNS from pods and Git fetch fails, patch the manager CoreDNS upstream to public resolvers:

```bash
sudo /usr/local/bin/k3s kubectl -n kube-system get cm coredns -o yaml \
  | sed 's#forward \\. /etc/resolv.conf#forward . 1.1.1.1 8.8.8.8#' \
  | sudo /usr/local/bin/k3s kubectl apply -f -
sudo /usr/local/bin/k3s kubectl -n kube-system rollout restart deploy/coredns
```

## Install Argo CD

Pin the Argo CD install manifest to an explicit release.

```bash
export ARGOCD_VERSION=v3.4.3
sudo /usr/local/bin/k3s kubectl create namespace argocd --dry-run=client -o yaml | sudo /usr/local/bin/k3s kubectl apply -f -
sudo /usr/local/bin/k3s kubectl apply -n argocd --server-side --force-conflicts \
  -f "https://raw.githubusercontent.com/argoproj/argo-cd/${ARGOCD_VERSION}/manifests/install.yaml"
sudo /usr/local/bin/k3s kubectl -n argocd get pods
```

Argo CD UI/API should stay private. Use SSH port-forwarding for the management Kubernetes API and private ingress over IPSec for the Argo CD web UI/API.

## Register Remote Clusters

From a workstation that has all kubeconfig contexts and can reach the target
Kubernetes APIs:

```bash
argocd --core --kube-context mintcocoa-manager-local cluster add <staging-context> --name mintcocoa-staging --yes --upsert
argocd --core --kube-context mintcocoa-manager-local cluster add context-cvv2sfbic3q --name mintcocoa-prod --yes --upsert
argocd --core --kube-context mintcocoa-manager-local cluster list
```

On this workstation, Windows can reach the OCI private network through the home
IPSec route, while WSL may need a Kubernetes API port-forward or mirrored
networking before it can use `mintcocoa-manager-local` directly.

Argo CD stores remote cluster credentials as Secrets in the management k3s `argocd` namespace. Do not commit kubeconfigs, ServiceAccount tokens, or Secret values.

When using `argocd --core`, verify that the cluster Secret actually exists:

```bash
kubectl --context mintcocoa-manager-local -n argocd get secret -l argocd.argoproj.io/secret-type=cluster
```

If the prod ServiceAccount exists but no manager-side cluster Secret is created, create the `mintcocoa-prod` cluster Secret out of band from the ServiceAccount token and CA data. Keep the generated Secret out of Git.

## Bootstrap Roots

```bash
kubectl --context mintcocoa-manager-local apply -f bootstrap/manager-root.yaml
kubectl --context mintcocoa-manager-local apply -f bootstrap/prod-root.yaml
kubectl --context mintcocoa-manager-local -n argocd get app
```

`manager-root` creates the `manager` AppProject and management-cluster child Applications such as private ingress. `staging-root` creates the `staging` AppProject and staging child Applications after the staging cluster has been rebuilt on the current LAN. `prod-root` creates the `prod` AppProject and the four production group root Applications.

The Argo CD install manifest itself, repo credentials, remote cluster credentials, and TLS private keys remain bootstrap/out-of-band inputs. The manager root owns reproducible management-cluster resources.

## Migration Guardrails

During migration, avoid two Argo CD instances actively managing the same Applications.

1. Register staging/prod clusters in management Argo CD.
2. Sync `staging-root` and `prod-root` from management Argo CD.
3. Confirm target workloads are Healthy/Synced.
4. Remove stale Applications from the old OKE Argo CD without pruning live resources.
5. Remove old cluster registration Secrets such as `mintcocoa-dev`.

If rollback is needed, delete or suspend the management Argo CD root Applications first, then re-enable the previous OKE Argo CD Applications.
