# Argo CD Private Ingress

Argo CD UI/API는 public LoadBalancer로 열지 않는다. GitOps manager VM의 management k3s에 내부용 `ingress-nginx`를 두고, home LAN은 internal DNS와 private operator path로만 접근한다. operator path는 Raspberry Pi strongSwan CPE를 통한 OCI Site-to-Site IPSec이다. 재현 가능한 Kubernetes 리소스는 `manager-root` 아래에서 GitOps로 관리한다.

## Endpoint

```text
URL: https://argocd.mintcocoa.dev
DNS: argocd.mintcocoa.dev -> 10.30.6.10
Path: Home LAN -> Raspberry Pi IPSec CPE -> OCI Site-to-Site IPSec -> mintcocoa-gitops-manager
```

`argocd-server` 자체는 여전히 `ClusterIP`이다. 외부 public OCI NSG에는 `80/tcp` 또는 `443/tcp`를 열지 않는다.

## Runtime Objects

```bash
sudo k3s kubectl -n argocd get app manager-root manager-ingress-nginx manager-argocd-private-ingress
sudo k3s kubectl -n ingress-nginx get deploy,svc,pods
sudo k3s kubectl -n argocd get ingress argocd-private
sudo firewall-cmd --list-all
```

Expected shape:

```text
ingress-nginx-controller: hostNetwork on 10.30.6.10
argocd-server: ClusterIP only
argocd-private: host argocd.mintcocoa.dev
firewalld: 80/443 allowed only from the current private operator CIDR
```

The TLS Secret `argocd-private-tls` is not stored in Git. Recreate or rotate it out of band before syncing the ingress if needed.

## Internal DNS

The home LAN DNS or client hosts file keeps the internal DNS override:

```bash
argocd.mintcocoa.dev -> 10.30.6.10
```

The Grafana private ingress uses a separate private load balancer:

```text
grafana.mintcocoa.dev -> 10.30.4.91
```

## Validate

From a home LAN client:

```bash
nslookup argocd.mintcocoa.dev
curl -kIs https://argocd.mintcocoa.dev
```

From the GitOps manager:

```bash
curl -kIs --resolve argocd.mintcocoa.dev:443:10.30.6.10 https://argocd.mintcocoa.dev
```

The certificate is an internal self-signed certificate. This is intentional for the private operator plane unless a private CA or DNS-01 certificate flow is added later.
